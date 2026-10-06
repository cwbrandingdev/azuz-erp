"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyBrandingToDocument,
  DEFAULT_BRANDING,
  resolveBrandingAssetUrl,
  type AgencyBranding,
} from "@/lib/branding-utils";
import { useCompany } from "@/contexts/company-context";
import { settingsService } from "@/services";

interface BrandingContextValue {
  branding: AgencyBranding;
  isLoading: boolean;
  logoUrl: string | null;
  faviconUrl: string | null;
  loadBranding: () => Promise<void>;
  saveBranding: (data: AgencyBranding) => Promise<AgencyBranding>;
  uploadBrandingAsset: (
    type: "logo" | "favicon",
    file: File,
  ) => Promise<AgencyBranding>;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const companyContext = useCompany();
  const [branding, setBranding] = useState<AgencyBranding>(
    companyContext.branding ?? DEFAULT_BRANDING,
  );

  const loadBranding = useCallback(async () => {
    await companyContext.refresh();
  }, [companyContext]);

  const saveBranding = useCallback(
    async (data: AgencyBranding) => {
      const saved = await settingsService.updateBranding(data);
      setBranding(saved);
      applyBrandingToDocument(saved);
      await companyContext.refresh();
      return saved;
    },
    [companyContext],
  );

  const uploadBrandingAsset = useCallback(
    async (type: "logo" | "favicon", file: File) => {
      const saved = await settingsService.uploadBrandingAsset(type, file);
      setBranding(saved);
      applyBrandingToDocument(saved);
      await companyContext.refresh();
      return saved;
    },
    [companyContext],
  );

  useEffect(() => {
    if (companyContext.isLoading) return;

    setBranding(companyContext.branding);
    applyBrandingToDocument(companyContext.branding);
  }, [companyContext.isLoading, companyContext.branding]);

  const value = useMemo(
    () => ({
      branding,
      isLoading: companyContext.isLoading,
      logoUrl: resolveBrandingAssetUrl(branding.logoUrl),
      faviconUrl: resolveBrandingAssetUrl(branding.faviconUrl),
      loadBranding,
      saveBranding,
      uploadBrandingAsset,
    }),
    [
      branding,
      companyContext.isLoading,
      loadBranding,
      saveBranding,
      uploadBrandingAsset,
    ],
  );

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return context;
}

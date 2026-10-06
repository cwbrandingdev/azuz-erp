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
  DEFAULT_BRANDING,
  type AgencyBranding,
} from "@/lib/branding-utils";
import { companiesService, settingsService } from "@/services";
import type { TenantCompany } from "@/services/types";

export interface CompanyState {
  company: TenantCompany | null;
  branding: AgencyBranding;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CompanyContext = createContext<CompanyState | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<TenantCompany | null>(null);
  const [branding, setBranding] = useState<AgencyBranding>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [resolvedCompany, resolvedBranding] = await Promise.all([
        companiesService.getPrimaryCompany(),
        settingsService.getBranding().catch(() => DEFAULT_BRANDING),
      ]);
      setCompany(resolvedCompany);
      setBranding(resolvedBranding);
    } catch (err) {
      setCompany(null);
      setBranding(DEFAULT_BRANDING);
      setError(
        err instanceof Error ? err.message : "Falha ao carregar a empresa",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<CompanyState>(
    () => ({
      company,
      branding,
      isLoading,
      error,
      refresh,
    }),
    [company, branding, isLoading, error, refresh],
  );

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within CompanyProvider");
  }
  return context;
}

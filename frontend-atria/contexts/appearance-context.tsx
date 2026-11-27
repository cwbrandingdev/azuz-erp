"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyAppearanceToDocument,
  applyUiTheme,
  DEFAULT_APPEARANCE,
  readStoredUiTheme,
  resetAppearanceToDefaults,
  type AppearanceSettings,
} from "@/lib/theme-utils";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSession } from "@/hooks/use-app-session";
import { settingsService } from "@/services";
import { useAuth } from "@/contexts/auth-context";
import { useCompany } from "@/contexts/company-context";

interface AppearanceContextValue {
  appearance: AppearanceSettings;
  isLoading: boolean;
  loadAppearance: () => Promise<void>;
  saveAppearance: (settings: AppearanceSettings) => Promise<void>;
  setDraftAppearance: (settings: AppearanceSettings) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function normalizeAppearance(data: AppearanceSettings): AppearanceSettings {
  return {
    ...data,
    sidebarColor: data.sidebarColor ?? data.primaryColor,
  };
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const session = useAppSession();
  const queryClient = useQueryClient();
  const { hydrate, release } = useCompany();
  const [appearance, setAppearance] =
    useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [isLoading, setIsLoading] = useState(false);

  const loadAppearance = useCallback(async () => {
    try {
      const data = normalizeAppearance(await settingsService.getAppearance());
      setAppearance(data);
      applyAppearanceToDocument(data);
      applyUiTheme(readStoredUiTheme());
    } catch {
      setAppearance(DEFAULT_APPEARANCE);
      resetAppearanceToDefaults();
      applyUiTheme(readStoredUiTheme());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveAppearance = useCallback(async (settings: AppearanceSettings) => {
    const saved = normalizeAppearance(await settingsService.updateAppearance(settings));
    setAppearance(saved);
    applyAppearanceToDocument(saved, { force: true });
    await queryClient.invalidateQueries({ queryKey: ["app-session"] });
  }, [queryClient]);

  const setDraftAppearance = useCallback((settings: AppearanceSettings) => {
    setAppearance(settings);
    applyAppearanceToDocument(settings, { force: true });
  }, []);

  useEffect(() => {
    applyUiTheme(readStoredUiTheme());
  }, []);

  useEffect(() => {
    if (session.isError) release();
  }, [release, session.isError]);

  useEffect(() => {
    if (!session.data) return;
    hydrate(session.data.company, session.data.branding);
  }, [hydrate, session.data]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setAppearance(DEFAULT_APPEARANCE);
      resetAppearanceToDefaults();
      applyUiTheme(readStoredUiTheme());
      setIsLoading(false);
      return;
    }

    if (!session.data?.appearance) return;
    const data = normalizeAppearance(session.data.appearance);
    setAppearance(data);
    applyAppearanceToDocument(data);
    applyUiTheme(readStoredUiTheme());
    setIsLoading(false);
  }, [authLoading, isAuthenticated, session.data?.appearance]);

  const value = useMemo(
    () => ({
      appearance,
      isLoading,
      loadAppearance,
      saveAppearance,
      setDraftAppearance,
    }),
    [appearance, isLoading, loadAppearance, saveAppearance, setDraftAppearance],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }
  return context;
}

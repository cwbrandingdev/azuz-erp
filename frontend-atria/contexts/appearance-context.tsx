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
import { settingsService } from "@/services";
import { useAuth } from "@/contexts/auth-context";

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
  }, []);

  const setDraftAppearance = useCallback((settings: AppearanceSettings) => {
    setAppearance(settings);
    applyAppearanceToDocument(settings, { force: true });
  }, []);

  useEffect(() => {
    applyUiTheme(readStoredUiTheme());
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      void loadAppearance();
    } else {
      setAppearance(DEFAULT_APPEARANCE);
      resetAppearanceToDefaults();
      applyUiTheme(readStoredUiTheme());
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, loadAppearance]);

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

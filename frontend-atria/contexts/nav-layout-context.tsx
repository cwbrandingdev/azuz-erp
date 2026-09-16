"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/contexts/auth-context";

export const NAV_LAYOUTS = ["classic", "studio"] as const;

export type NavLayout = (typeof NAV_LAYOUTS)[number];

const STORAGE_PREFIX = "atria_nav_layout";

interface NavLayoutContextValue {
  layout: NavLayout;
  setLayout: (layout: NavLayout) => void;
}

const NavLayoutContext = createContext<NavLayoutContextValue | null>(null);

function isNavLayout(value: string | null): value is NavLayout {
  return NAV_LAYOUTS.includes(value as NavLayout);
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readLayout(userId: string | undefined): NavLayout {
  if (!userId) return "classic";
  try {
    const stored = localStorage.getItem(storageKey(userId));
    if (isNavLayout(stored)) return stored;
  } catch {}
  return "classic";
}

function writeLayout(userId: string, layout: NavLayout) {
  try {
    localStorage.setItem(storageKey(userId), layout);
  } catch {}
}

export function NavLayoutProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [layout, setLayoutState] = useState<NavLayout>("classic");

  useEffect(() => {
    setLayoutState(readLayout(userId));
  }, [userId]);

  const setLayout = useCallback(
    (next: NavLayout) => {
      setLayoutState(next);
      if (userId) writeLayout(userId, next);
    },
    [userId],
  );

  const value = useMemo(() => ({ layout, setLayout }), [layout, setLayout]);

  return (
    <NavLayoutContext.Provider value={value}>{children}</NavLayoutContext.Provider>
  );
}

export function useNavLayout() {
  const ctx = useContext(NavLayoutContext);
  if (!ctx) {
    throw new Error("useNavLayout must be used within a NavLayoutProvider");
  }
  return ctx;
}

"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppearance } from "@/contexts/appearance-context";
import { useAuth } from "@/contexts/auth-context";
import { useBranding } from "@/contexts/branding-context";

const BOOT_MIN_MS = 1000;

export function AppBootGate({
  children,
  skip = false,
}: {
  children: React.ReactNode;
  skip?: boolean;
}) {
  const { isLoading: authLoading } = useAuth();
  const { isLoading: appearanceLoading } = useAppearance();
  const { isLoading: brandingLoading } = useBranding();
  const [minDelayDone, setMinDelayDone] = useState(skip);

  useEffect(() => {
    if (skip) {
      return;
    }
    const timer = window.setTimeout(() => setMinDelayDone(true), BOOT_MIN_MS);
    return () => window.clearTimeout(timer);
  }, [skip]);

  const themeReady =
    !authLoading && !brandingLoading && !appearanceLoading;
  const showSplash = !skip && (!themeReady || !minDelayDone);

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-[var(--atria-base,#ffffff)]">
        <div className="flex items-center justify-between border-b border-[var(--atria-primary,#004949)]/10 px-6 py-4">
          <Skeleton className="h-8 w-32 rounded-lg bg-[var(--atria-primary,#004949)]/10" />
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full bg-[var(--atria-primary,#004949)]/10" />
            <Skeleton className="h-9 w-24 rounded-lg bg-[var(--atria-primary,#004949)]/10" />
          </div>
        </div>

        <div className="flex flex-1">
          <aside className="hidden w-64 border-r border-[var(--atria-primary,#004949)]/10 p-4 md:block">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-10 w-full rounded-xl bg-[var(--atria-primary,#004949)]/8"
                />
              ))}
            </div>
          </aside>

          <main className="flex flex-1 flex-col gap-6 p-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-56 rounded-lg bg-[var(--atria-primary,#004949)]/10" />
              <Skeleton className="h-4 w-80 max-w-full rounded-lg bg-[var(--atria-primary,#004949)]/8" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-28 rounded-2xl bg-[var(--atria-primary,#004949)]/8"
                />
              ))}
            </div>

            <Skeleton className="h-64 flex-1 rounded-2xl bg-[var(--atria-primary,#004949)]/6" />
          </main>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

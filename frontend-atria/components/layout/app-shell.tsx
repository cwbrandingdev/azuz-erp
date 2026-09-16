"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { CommandPalette, useCommandPalette } from "./command-palette";
import { MobileDrawer } from "./mobile-drawer";
import { NavStudio } from "./nav-studio";
import { FinanceDueAlertsWatcher } from "@/components/financial/finance-due-alerts-watcher";
import { TaskDetailProvider } from "@/components/kanban/task-detail-provider";
import { NotificationsProvider } from "@/contexts/notifications-context";

function isContentDeliveryPath(pathname: string | null) {
  if (!pathname) return false;
  return /^\/content\/[^/]+\/?$/.test(pathname);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { open, setOpen } = useCommandPalette();
  const [mobileOpen, setMobileOpen] = useState(false);
  const immersiveDelivery = isContentDeliveryPath(pathname);

  if (immersiveDelivery) {
    return (
      <TaskDetailProvider>
        <NotificationsProvider>
          <div className="min-h-screen w-full bg-[var(--atria-base)]">
            <main className="min-h-screen w-full">{children}</main>
          </div>
        </NotificationsProvider>
      </TaskDetailProvider>
    );
  }

  return (
    <TaskDetailProvider>
      <NotificationsProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-[var(--atria-base)]">
          <div data-app-chrome>
            <NavStudio
              onMenuClick={() => setMobileOpen(true)}
              onSearchClick={() => setOpen(true)}
            />
            <MobileDrawer open={mobileOpen} onOpenChange={setMobileOpen} />
          </div>

          <FinanceDueAlertsWatcher />

          <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6 lg:pb-32 xl:p-8">
            {children}
          </main>

          <CommandPalette open={open} onOpenChange={setOpen} />
        </div>
      </NotificationsProvider>
    </TaskDetailProvider>
  );
}

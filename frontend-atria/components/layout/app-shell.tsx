"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { CommandPalette, useCommandPalette } from "./command-palette";
import { AppSidebar } from "./app-sidebar";
import { MobileDrawer } from "./mobile-drawer";
import { AppNavbar } from "./navbar";
import { NavStudio } from "./nav-studio";
import { FinanceDueAlertsWatcher } from "@/components/financial/finance-due-alerts-watcher";
import { TaskDetailProvider } from "@/components/kanban/task-detail-provider";
import { NotificationsProvider } from "@/contexts/notifications-context";
import { NavLayoutProvider, useNavLayout } from "@/contexts/nav-layout-context";
import { SidebarProvider } from "@/contexts/sidebar-context";

function isContentDeliveryPath(pathname: string | null) {
  if (!pathname) return false;
  return /^\/content\/[^/]+\/?$/.test(pathname);
}

function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { layout } = useNavLayout();
  const { open, setOpen } = useCommandPalette();
  const [mobileOpen, setMobileOpen] = useState(false);
  const immersiveDelivery = isContentDeliveryPath(pathname);
  const isStudio = layout === "studio";

  if (immersiveDelivery) {
    return (
      <div className="min-h-screen w-full bg-[var(--atria-base)]">
        <main className="min-h-screen w-full">{children}</main>
      </div>
    );
  }

  if (isStudio) {
    return (
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
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--atria-base)]">
      <div data-app-chrome className="contents">
        <AppSidebar />
        <MobileDrawer open={mobileOpen} onOpenChange={setMobileOpen} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div data-app-chrome>
          <AppNavbar
            onMenuClick={() => setMobileOpen(true)}
            onSearchClick={() => setOpen(true)}
          />
        </div>
        <FinanceDueAlertsWatcher />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8">
          {children}
        </main>
      </div>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TaskDetailProvider>
      <NotificationsProvider>
        <SidebarProvider>
          <NavLayoutProvider>
            <AppChrome>{children}</AppChrome>
          </NavLayoutProvider>
        </SidebarProvider>
      </NotificationsProvider>
    </TaskDetailProvider>
  );
}

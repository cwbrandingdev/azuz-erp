"use client";

import { useState, type ReactNode } from "react";
import { LogOut, Menu } from "lucide-react";
import { PortalTutorialButton } from "@/components/portal/portal-tutorial-button";
import { PortalTutorialProvider } from "@/components/portal/portal-tutorial-provider";
import { AgencyLogo } from "@/components/branding/agency-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useBranding } from "@/contexts/branding-context";
import { ClientName } from "@/components/ui/client-name";
import {
  PortalSidebarNav,
  type PortalTab,
} from "@/components/portal/portal-sidebar";
import type { PortalData } from "@/services/types";

interface PortalShellProps {
  data: PortalData;
  children: ReactNode;
  onLogout?: () => void;
  activeTab?: PortalTab;
  onTabChange?: (tab: PortalTab) => void;
  hasCrmEnabled?: boolean;
  tabCounts?: Partial<Record<PortalTab, number>>;
}

function PortalSidebarPanel({
  data,
  onLogout,
  activeTab,
  onTabChange,
  hasCrmEnabled,
  tabCounts,
  onNavigate,
}: {
  data: PortalData;
  onLogout?: () => void;
  activeTab?: PortalTab;
  onTabChange?: (tab: PortalTab) => void;
  hasCrmEnabled?: boolean;
  tabCounts?: Partial<Record<PortalTab, number>>;
  onNavigate?: () => void;
}) {
  const { branding } = useBranding();
  const { client, accountStatus } = data;

  return (
    <div className="flex h-full flex-col text-white">
      <div className="shrink-0 border-b border-white/8 px-4 py-5">
        <AgencyLogo
          size="md"
          variant="sidebar"
          subtitle="Portal do Cliente"
          showName
        />
      </div>

      {activeTab && onTabChange ? (
        <div className="sidebar-scroll flex-1 overflow-y-auto px-2 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.14em] text-white/35">
            Menu
          </p>
          <PortalSidebarNav
            activeTab={activeTab}
            onChange={onTabChange}
            hasCrmEnabled={hasCrmEnabled}
            counts={tabCounts}
            onNavigate={onNavigate}
          />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="shrink-0 border-t border-white/8 px-4 py-4">
        <div className="mb-4">
          <ClientName as="p" className="mt-1 text-sm font-semibold text-white">
            {client?.companyName}
          </ClientName>
          {client?.contactName ? (
            <p className="mt-0.5 text-xs text-white/60">{client.contactName}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <PortalTutorialButton variant="sidebar" />
          {onLogout ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={onLogout}
            >
              <LogOut className="mr-2 size-4" />
              Sair
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PortalShell({
  data,
  children,
  onLogout,
  activeTab,
  onTabChange,
  hasCrmEnabled,
  tabCounts,
}: PortalShellProps) {
  const { branding } = useBranding();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarStyle = {
    background:
      "linear-gradient(to bottom, var(--atria-sidebar, #004949), color-mix(in oklch, var(--atria-sidebar, #004949), black 12%), color-mix(in oklch, var(--atria-sidebar, #004949), black 22%))",
  };

  return (
    <PortalTutorialProvider activeTab={activeTab}>
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "var(--atria-base, #F8F8F6)",
        color: "var(--atria-text, #0F172A)",
      }}
    >
      <div className="flex min-h-screen">
        <aside
          className="sidebar-scroll sticky top-0 hidden h-screen w-[17.5rem] shrink-0 flex-col border-r border-white/5 lg:flex"
          style={sidebarStyle}
        >
          <PortalSidebarPanel
            data={data}
            onLogout={onLogout}
            activeTab={activeTab}
            onTabChange={onTabChange}
            hasCrmEnabled={hasCrmEnabled}
            tabCounts={tabCounts}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className="flex items-center justify-between border-b px-4 py-3 lg:hidden"
            style={{
              borderColor: `${branding.primaryColor}15`,
              backgroundColor: branding.primaryColor,
            }}
          >
            <AgencyLogo size="sm" variant="sidebar" showName />
            <div className="flex items-center gap-2">
              <PortalTutorialButton className="border-white/30 bg-white/10 text-white hover:bg-white/20" />
              <ThemeToggle
                className="border border-white/30 bg-white/10 text-white hover:bg-white/20"
                iconClassName="text-white"
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                onClick={() => setMobileOpen(true)}
                data-tour="portal-nav"
                aria-label="Abrir menu"
              >
                <Menu className="size-4" />
              </Button>
            </div>
          </div>

          <div
            className="hidden items-center justify-end border-b px-6 py-2 lg:flex"
            style={{ borderColor: `${branding.primaryColor}15` }}
          >
            <ThemeToggle />
          </div>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
            {children}
          </main>

          <footer
            className="border-t py-6 text-center text-xs"
            style={{
              borderColor: `${branding.primaryColor}15`,
              color: `${branding.primaryColor}80`,
            }}
          >
            {branding.agencyName} · Portal do Cliente
          </footer>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="sidebar-scroll w-[17.5rem] border-none p-0 text-white"
          style={sidebarStyle}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu do portal</SheetTitle>
          </SheetHeader>
          <PortalSidebarPanel
            data={data}
            onLogout={onLogout}
            activeTab={activeTab}
            onTabChange={onTabChange}
            hasCrmEnabled={hasCrmEnabled}
            tabCounts={tabCounts}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
    </PortalTutorialProvider>
  );
}

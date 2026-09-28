"use client";

import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Inbox,
  LayoutGrid,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PortalTab =
  | "approval"
  | "requests"
  | "calendar"
  | "contracts"
  | "reports"
  | "assets"
  | "finance"
  | "crm";

const PORTAL_NAV_ITEMS: Array<{
  id: PortalTab;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "approval", label: "Conteúdo", icon: LayoutGrid },
  { id: "requests", label: "Solicitações", icon: Inbox },
  { id: "calendar", label: "Calendário", icon: Calendar },
];

const CRM_NAV_ITEM = {
  id: "crm" as const,
  label: "CRM",
  icon: Users,
};

export function getPortalNavItems(hasCrmEnabled = false) {
  return hasCrmEnabled ? [...PORTAL_NAV_ITEMS, CRM_NAV_ITEM] : PORTAL_NAV_ITEMS;
}

interface PortalSidebarNavProps {
  activeTab: PortalTab;
  onChange: (tab: PortalTab) => void;
  counts?: Partial<Record<PortalTab, number>>;
  hasCrmEnabled?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export function PortalSidebarNav({
  activeTab,
  onChange,
  counts,
  hasCrmEnabled = false,
  onNavigate,
  className,
}: PortalSidebarNavProps) {
  const tabs = getPortalNavItems(hasCrmEnabled);

  return (
    <nav data-tour="portal-nav" className={cn("flex flex-col gap-1", className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const count = counts?.[tab.id];

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              onChange(tab.id);
              onNavigate?.();
            }}
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
              isActive
                ? "border-l-4 border-[var(--atria-accent,#E8C39E)] bg-white/10 pl-2.5 text-white"
                : "border-l-4 border-transparent text-white/70 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon
              size={18}
              className={cn(
                "shrink-0 transition-colors",
                isActive
                  ? "text-[var(--atria-accent,#E8C39E)]"
                  : "text-white/50 group-hover:text-white/80",
              )}
            />
            <span className="flex-1 text-left">{tab.label}</span>
            {count ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-white/10 text-white/80",
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

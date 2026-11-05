"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SidebarBrand } from "./sidebar-brand";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserProfile } from "./sidebar-user-profile";

export function AppSidebar() {
  const { isCollapsed, toggleCollapsed } = useSidebar();

  return (
    <TooltipProvider delay={300}>
      <aside
        className={cn(
          "sidebar-scroll hidden h-full shrink-0 flex-col border-r border-white/5 bg-gradient-to-b from-[var(--atria-sidebar)] via-[color-mix(in_oklch,var(--atria-sidebar),black_12%)] to-[color-mix(in_oklch,var(--atria-sidebar),black_22%)] text-white transition-all duration-300 ease-in-out lg:flex",
          isCollapsed ? "w-20" : "w-[17.5rem]",
        )}
      >
        <div
          className={cn(
            "shrink-0 border-b border-white/8 transition-all duration-300 ease-in-out",
            isCollapsed ? "px-2 py-4" : "px-4 py-5",
          )}
        >
          <SidebarBrand collapsed={isCollapsed} />
        </div>

        <div
          className={cn(
            "sidebar-scroll flex-1 overflow-y-auto py-4 transition-all duration-300 ease-in-out",
            isCollapsed ? "px-1.5" : "px-2",
          )}
        >
          <SidebarNav collapsed={isCollapsed} />
        </div>

        <div
          className={cn(
            "shrink-0 border-t border-white/8 transition-all duration-300 ease-in-out",
            isCollapsed ? "px-1.5 py-2" : "px-3 py-2",
          )}
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  aria-label={
                    isCollapsed ? "Expandir menu" : "Recolher menu"
                  }
                  className={cn(
                    "flex w-full items-center rounded-lg py-2 text-white/60 transition-colors hover:bg-white/5 hover:text-white",
                    isCollapsed ? "justify-center" : "justify-end px-2",
                  )}
                />
              }
            >
              {isCollapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? "Expandir menu" : "Recolher menu"}
            </TooltipContent>
          </Tooltip>
        </div>

        <SidebarUserProfile collapsed={isCollapsed} />
      </aside>
    </TooltipProvider>
  );
}

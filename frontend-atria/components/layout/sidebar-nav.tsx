"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { isRouteActive } from "@/lib/nav-active";
import { isNavItemActive } from "@/lib/nav-match";
import {
  getNavItemBadgeCount,
  useVisibleNavSections,
} from "@/hooks/use-visible-nav-sections";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { leadsRoutes, settingsRoutes } from "./navigation";

interface SidebarNavProps {
  onNavigate?: () => void;
  className?: string;
  collapsed?: boolean;
}

function NavItemBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="ml-auto flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#E8C39E] px-1.5 text-[10px] font-bold text-[#004949]">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function CollapsedNavItemBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#E8C39E] px-1 text-[9px] font-bold text-[#004949] ring-2 ring-[#004949]">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function SidebarNav({
  onNavigate,
  className,
  collapsed = false,
}: SidebarNavProps) {
  const pathname = usePathname();
  const { sections: visibleSections, appUpdatesBadgeCount } =
    useVisibleNavSections();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (collapsed) {
      setOpenDropdowns(new Set());
      return;
    }

    const next = new Set<string>();

    if (settingsRoutes.some((href) => isRouteActive(pathname, href))) {
      next.add("Configurações");
    }

    if (leadsRoutes.some((href) => isRouteActive(pathname, href))) {
      next.add("Leads");
    }

    setOpenDropdowns(next);
  }, [pathname, collapsed]);

  const toggleDropdown = (name: string) => {
    setOpenDropdowns((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <nav
      className={cn(
        "flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "gap-2" : "gap-6",
        className,
      )}
    >
      {visibleSections.map((section) => (
        <div key={section.label}>
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.14em] text-white/35 opacity-100 transition-opacity duration-300 ease-in-out">
              {section.label}
            </p>
          )}

          <div
            className={cn(
              "flex flex-col",
              collapsed ? "items-center gap-1" : "gap-0.5",
            )}
          >
            {section.items.map((item) => {
              const Icon = item.icon;
              const hasChildren = Boolean(item.children?.length);
              const isOpen = openDropdowns.has(item.name);
              const active = isNavItemActive(pathname, item);
              const badgeCount = getNavItemBadgeCount(
                item.href,
                appUpdatesBadgeCount,
              );

              const iconClass = cn(
                "shrink-0 transition-colors",
                active
                  ? "text-[#E8C39E]"
                  : "text-white/50 group-hover:text-white/80",
              );

              const itemClass = cn(
                "group flex items-center rounded-lg text-sm font-medium transition-all duration-150",
                collapsed
                  ? "size-10 justify-center"
                  : "w-full gap-3 px-3 py-2.5",
                active
                  ? collapsed
                    ? "border border-[#E8C39E]/40 bg-white/10 text-white"
                    : "border-l-4 border-[#E8C39E] bg-white/10 pl-2.5 text-white"
                  : collapsed
                    ? "border border-transparent text-white/70 hover:bg-white/5 hover:text-white"
                    : "border-l-4 border-transparent text-white/70 hover:bg-white/5 hover:text-white",
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger
                      render={
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          className={cn(itemClass, "relative")}
                          aria-label={item.name}
                        />
                      }
                    >
                      <Icon size={18} className={iconClass} />
                      <CollapsedNavItemBadge count={badgeCount} />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.name}
                      {badgeCount > 0 ? ` (${badgeCount})` : ""}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              if (hasChildren) {
                return (
                  <div key={item.name} className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => toggleDropdown(item.name)}
                      className={cn(itemClass, "justify-between")}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={iconClass} />
                        <span className="opacity-100 transition-opacity duration-300 ease-in-out">
                          {item.name}
                        </span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={cn(
                          "text-white/40 transition-transform duration-200",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>

                    {isOpen && (
                      <div className="relative ml-5 flex flex-col gap-0.5 border-l border-white/10 py-1 pl-3">
                        {item.children?.map((child) => {
                          const childActive = isRouteActive(
                            pathname,
                            child.href,
                          );

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={onNavigate}
                              className={cn(
                                "rounded-md px-2.5 py-2 text-xs font-medium transition-all duration-150",
                                childActive
                                  ? "bg-white/10 text-[#E8C39E]"
                                  : "text-white/55 hover:bg-white/5 hover:text-white/90",
                              )}
                            >
                              {child.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={itemClass}
                >
                  <Icon size={18} className={iconClass} />
                  <span className="flex min-w-0 flex-1 items-center gap-2 opacity-100 transition-opacity duration-300 ease-in-out">
                    <span className="truncate">{item.name}</span>
                    {item.href === "/app-updates" ? (
                      <NavItemBadge count={badgeCount} />
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

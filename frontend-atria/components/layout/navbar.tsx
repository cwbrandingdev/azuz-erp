"use client";

import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";
import { NotificationCenter } from "@/components/layout/notification-center";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface AppNavbarProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export function AppNavbar({ onMenuClick, onSearchClick }: AppNavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--atria-primary)]/8 bg-[var(--atria-base)]/80 px-4 backdrop-blur-md dark:border-white/10 dark:bg-black/80 lg:h-16 lg:gap-4 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 lg:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu className="size-5 text-[var(--atria-primary)]" />
        </Button>

        <div className="hidden min-w-0 lg:block">
          <BreadcrumbNav />
        </div>

        <div className="min-w-0 lg:hidden">
          <span className="text-sm font-bold text-[var(--atria-primary)]">
            ATRIA
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSearchClick}
        className="hidden max-w-md flex-1 items-center gap-2 rounded-lg border border-[var(--atria-primary)]/10 bg-card px-3 py-2 text-left text-sm text-muted-foreground shadow-sm transition-all hover:border-[var(--atria-primary)]/20 hover:bg-[var(--atria-primary)]/[0.02] dark:border-white/10 dark:hover:border-white/15 dark:hover:bg-white/5 md:flex"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate">Buscar em todo o sistema...</span>
        <kbd className="hidden rounded border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/5 px-1.5 py-0.5 text-[10px] font-medium text-[var(--atria-primary)]/50 lg:inline">
          ⌘K
        </kbd>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <NotificationCenter />
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onSearchClick}
          aria-label="Buscar"
        >
          <Search className="size-4 text-[var(--atria-primary)]" />
        </Button>
      </div>
    </header>
  );
}

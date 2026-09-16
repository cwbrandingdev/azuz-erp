"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/layout/notification-center";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

interface HeaderUtilitiesProps {
  tone?: "light" | "dark";
  onSearchClick: () => void;
  className?: string;
}

export function HeaderUtilities({
  tone = "light",
  onSearchClick,
  className,
}: HeaderUtilitiesProps) {
  const isDark = tone === "dark";

  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={onSearchClick}
        className={cn(
          "hidden items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm shadow-sm transition-all md:flex",
          isDark
            ? "max-w-xs border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:bg-white/10 hover:text-white/80"
            : "max-w-md border-[var(--atria-primary)]/10 bg-card text-muted-foreground hover:border-[var(--atria-primary)]/20 hover:bg-[var(--atria-primary)]/[0.02] dark:border-white/10 dark:hover:border-white/15 dark:hover:bg-white/5",
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate">Buscar...</span>
        <kbd
          className={cn(
            "hidden rounded border px-1.5 py-0.5 text-[10px] font-medium lg:inline",
            isDark
              ? "border-white/10 bg-white/5 text-white/40"
              : "border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/5 text-[var(--atria-primary)]/50",
          )}
        >
          ⌘K
        </kbd>
      </button>

      <NotificationCenter tone={tone} />
      <ThemeToggle
        className={isDark ? "text-white/80 hover:bg-white/10 hover:text-white" : undefined}
        iconClassName={isDark ? "text-white/80" : undefined}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(
          "md:hidden",
          isDark ? "text-white/80 hover:bg-white/10" : "text-[var(--atria-primary)]",
        )}
        onClick={onSearchClick}
        aria-label="Buscar"
      >
        <Search className="size-4" />
      </Button>
    </div>
  );
}

"use client";

import { Menu } from "lucide-react";
import { AgencyLogo } from "@/components/branding/agency-logo";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";
import { HeaderUtilities } from "@/components/layout/header-utilities";
import { StudioDock } from "@/components/layout/studio-dock";
import { UserAccountMenu } from "@/components/layout/user-account-menu";
import { Button } from "@/components/ui/button";

interface NavStudioProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export function NavStudio({ onMenuClick, onSearchClick }: NavStudioProps) {
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--atria-primary)]/8 bg-[var(--atria-base)]/85 px-4 backdrop-blur-md dark:border-white/10 dark:bg-black/80 lg:px-6">
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 lg:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu className="size-5 text-[var(--atria-primary)]" />
        </Button>

        <AgencyLogo size="sm" showName className="min-w-0" nameClassName="text-base" />

        <div className="hidden min-w-0 flex-1 lg:block">
          <BreadcrumbNav />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <HeaderUtilities tone="light" onSearchClick={onSearchClick} />
          <UserAccountMenu tone="light" />
        </div>
      </header>

      <StudioDock />
    </>
  );
}

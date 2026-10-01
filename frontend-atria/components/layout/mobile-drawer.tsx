"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarBrand } from "./sidebar-brand";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserProfile } from "./sidebar-user-profile";

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileDrawer({ open, onOpenChange }: MobileDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="sidebar-scroll inset-y-0 left-0 right-auto flex h-full w-[17.5rem] flex-col border-none bg-gradient-to-b from-[var(--atria-sidebar)] via-[color-mix(in_oklch,var(--atria-sidebar),black_12%)] to-[color-mix(in_oklch,var(--atria-sidebar),black_22%)] p-0 text-white"
        showCloseButton
      >
        <SheetHeader className="shrink-0 border-b border-white/8 px-4 py-5">
          <SheetTitle className="text-left text-white">
            <SidebarBrand />
          </SheetTitle>
        </SheetHeader>

        <div className="sidebar-scroll flex-1 overflow-y-auto px-2 py-4">
          <SidebarNav onNavigate={() => onOpenChange(false)} />
        </div>

        <SidebarUserProfile
          onAction={() => onOpenChange(false)}
          className="shrink-0"
        />
      </SheetContent>
    </Sheet>
  );
}

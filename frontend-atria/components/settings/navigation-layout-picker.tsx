"use client";

import { Columns3, LayoutPanelTop } from "lucide-react";
import { useNavLayout, type NavLayout } from "@/contexts/nav-layout-context";
import { cn } from "@/lib/utils";

const NAV_OPTIONS: {
  id: NavLayout;
  label: string;
  hint: string;
  icon: typeof Columns3;
}[] = [
  {
    id: "studio",
    label: "Dock",
    hint: "Ícones na base da tela, como o macOS",
    icon: LayoutPanelTop,
  },
  {
    id: "classic",
    label: "Sidebar clássica",
    hint: "Menu lateral com seções e nomes",
    icon: Columns3,
  },
];

export function NavigationLayoutPicker() {
  const { layout, setLayout } = useNavLayout();

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {NAV_OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = layout === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setLayout(option.id)}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
              selected
                ? "border-[var(--atria-primary)] bg-[var(--atria-primary)]/5 ring-2 ring-[var(--atria-primary)]/15"
                : "border-border hover:border-[var(--atria-primary)]/30",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                selected
                  ? "bg-[var(--atria-primary)] text-white"
                  : "bg-[var(--atria-primary)]/8 text-[var(--atria-primary)]/70",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-[var(--atria-primary)]">
                {option.label}
              </span>
              <span className="mt-0.5 block text-[11px] text-[var(--atria-primary)]/50">
                {option.hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

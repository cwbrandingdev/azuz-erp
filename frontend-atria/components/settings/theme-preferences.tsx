"use client";

import { Columns3, LayoutPanelTop, Monitor, Moon, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavLayout, type NavLayout } from "@/contexts/nav-layout-context";
import { useTheme } from "@/contexts/theme-context";
import { THEME_PALETTES, THEME_PALETTE_IDS } from "@/lib/theme-utils";
import { cn } from "@/lib/utils";

const NAV_OPTIONS: {
  id: NavLayout;
  label: string;
  hint: string;
  icon: typeof Columns3;
}[] = [
  {
    id: "classic",
    label: "Sidebar clássica",
    hint: "Menu lateral com seções e nomes",
    icon: Columns3,
  },
  {
    id: "studio",
    label: "Dock",
    hint: "Ícones na base da tela, como o macOS",
    icon: LayoutPanelTop,
  },
];

export function ThemePreferences() {
  const { mode, palette, setMode, setPalette } = useTheme();
  const { layout, setLayout } = useNavLayout();

  return (
    <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-card p-6 dark:border-white/10">
      <div className="mb-5">
        <h2 className="font-semibold text-[var(--atria-primary)]">
          Tema e modo escuro
        </h2>
        <p className="text-xs text-[var(--atria-primary)]/50">
          Preferências salvas neste dispositivo, aplicadas imediatamente
        </p>
      </div>

      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-[var(--atria-primary)]">
          Aparência
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("light")}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition",
              mode === "light"
                ? "border-[var(--atria-primary)] bg-[var(--atria-primary)]/5 ring-2 ring-[var(--atria-primary)]/15"
                : "border-border hover:border-[var(--atria-primary)]/30",
            )}
          >
            <Sun className="size-4" />
            Claro
          </button>
          <button
            type="button"
            onClick={() => setMode("dark")}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition",
              mode === "dark"
                ? "border-[var(--atria-primary)] bg-[var(--atria-primary)]/5 ring-2 ring-[var(--atria-primary)]/15"
                : "border-border hover:border-[var(--atria-primary)]/30",
            )}
          >
            <Moon className="size-4" />
            Escuro
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[var(--atria-primary)]">
          Paleta de cores
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEME_PALETTE_IDS.map((id) => {
            const preset = THEME_PALETTES[id];
            const selected = palette === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPalette(id)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border px-3 py-3 text-left transition",
                  selected
                    ? "border-[var(--atria-primary)] ring-2 ring-[var(--atria-primary)]/15"
                    : "border-border hover:border-[var(--atria-primary)]/30",
                )}
              >
                <span className="flex overflow-hidden rounded-md">
                  <span
                    className="h-5 w-6"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <span
                    className="h-5 w-6"
                    style={{ backgroundColor: preset.accent }}
                  />
                  <span
                    className="h-5 w-6"
                    style={{ backgroundColor: preset.sidebar }}
                  />
                </span>
                <span className="text-xs font-semibold text-[var(--atria-primary)]">
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-sm font-medium text-[var(--atria-primary)]">
          Navegação
        </p>
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
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-[var(--atria-primary)]/40">
        <Monitor className="size-3.5" />
        Tema e navegação são restaurados automaticamente neste dispositivo, por usuário
      </p>
    </Card>
  );
}

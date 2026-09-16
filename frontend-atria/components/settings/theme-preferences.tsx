"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { NavigationLayoutPicker } from "@/components/settings/navigation-layout-picker";
import { useTheme } from "@/contexts/theme-context";
import { THEME_PALETTES, THEME_PALETTE_IDS } from "@/lib/theme-utils";
import { cn } from "@/lib/utils";

export function ThemePreferences() {
  const { mode, palette, setMode, setPalette } = useTheme();

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
        <NavigationLayoutPicker />
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-[var(--atria-primary)]/40">
        <Monitor className="size-3.5" />
        Tema e navegação são restaurados automaticamente neste dispositivo, por usuário
      </p>
    </Card>
  );
}

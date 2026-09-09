"use client";

import { AppearanceCustomizer } from "@/components/settings/appearance-customizer";
import { ThemePreferences } from "@/components/settings/theme-preferences";

export default function SettingsAppearancePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
          Aparência
        </h1>
        <p className="text-sm text-[var(--atria-primary)]/50">
          Modo escuro e paletas neste dispositivo, além de cores salvas na conta
        </p>
      </div>
      <ThemePreferences />
      <AppearanceCustomizer />
    </div>
  );
}

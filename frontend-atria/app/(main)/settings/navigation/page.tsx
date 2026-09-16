"use client";

import { Card } from "@/components/ui/card";
import { NavigationLayoutPicker } from "@/components/settings/navigation-layout-picker";

export default function SettingsNavigationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
          Configurações
        </h1>
        <p className="text-sm text-[var(--atria-primary)]/50">
          Escolha o menu deste dispositivo. A preferência é salva por usuário.
        </p>
      </div>

      <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-card p-6 dark:border-white/10">
        <div className="mb-4">
          <h2 className="font-semibold text-[var(--atria-primary)]">
            Navegação
          </h2>
          <p className="text-xs text-[var(--atria-primary)]/50">
            Sidebar clássica ou dock na base da tela
          </p>
        </div>
        <NavigationLayoutPicker />
      </Card>
    </div>
  );
}

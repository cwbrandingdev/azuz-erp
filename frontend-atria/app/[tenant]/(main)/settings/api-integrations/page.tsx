"use client";

import { ApiIntegrationsCustomizer } from "@/components/settings/api-integrations-customizer";

export default function SettingsApiIntegrationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
          Integrações / APIs
        </h1>
        <p className="text-sm text-[var(--atria-primary)]/50">
          Gerencie chaves de API e credenciais de integrações externas da
          empresa
        </p>
      </div>
      <ApiIntegrationsCustomizer />
    </div>
  );
}

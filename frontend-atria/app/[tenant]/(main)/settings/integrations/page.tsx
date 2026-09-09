"use client";

import { IntegrationsCustomizer } from "@/components/settings/integrations-customizer";

export default function SettingsIntegrationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
          Integrações
        </h1>
        <p className="text-sm text-[var(--atria-primary)]/50">
          Conecte Slack, Discord e alertas para fluxos externos da agência
        </p>
      </div>
      <IntegrationsCustomizer />
    </div>
  );
}

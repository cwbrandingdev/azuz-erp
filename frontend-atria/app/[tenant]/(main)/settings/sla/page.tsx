"use client";

import { SlaDashboardPanel } from "@/components/sla/sla-dashboard-panel";
import { SlaSettingsForm } from "@/components/settings/sla-settings-form";

export default function SettingsSlaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
          SLA
        </h1>
        <p className="text-sm text-[var(--atria-primary)]/50">
          Configure prazos de resposta e resolução e monitore cumprimento
        </p>
      </div>

      <SlaDashboardPanel />
      <SlaSettingsForm />
    </div>
  );
}

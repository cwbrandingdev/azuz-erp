"use client";

import { ClientSdrSettingsPanel } from "@/components/settings/client-sdr-settings-panel";

export default function SettingsClientSdrPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
          Configurações SDR do Cliente
        </h1>
        <p className="text-sm text-[var(--atria-primary)]/50">
          Ative o SDR por organização e defina os SDRs responsáveis pelo funil
          comercial.
        </p>
      </div>

      <ClientSdrSettingsPanel />
    </div>
  );
}

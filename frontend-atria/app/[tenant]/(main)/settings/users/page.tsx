"use client";

import { ClientCrmSettingsPanel } from "@/components/settings/client-crm-settings-panel";
import { UsersAndGroupsPanel } from "@/components/users/users-and-groups-panel";

export default function SettingsUsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
          Usuários e Acessos
        </h1>
        <p className="text-sm text-[var(--atria-primary)]/50">
          Gerencie membros internos, usuários cliente e grupos de equipe
        </p>
      </div>

      <ClientCrmSettingsPanel />
      <UsersAndGroupsPanel />
    </div>
  );
}

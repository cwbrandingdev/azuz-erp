"use client";

import { UsersAndGroupsPanel } from "@/components/users/users-and-groups-panel";

export default function SettingsUsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
          Usuários e Acessos
        </h1>
        <p className="text-sm text-[var(--atria-primary)]/50">
          Gerencie membros internos e grupos de equipe. Logins de clientes e
          representantes ficam em{" "}
          <a
            href="/clients"
            className="font-medium text-[var(--atria-primary)] underline-offset-2 hover:underline"
          >
            Clientes
          </a>
          , na aba Acessos de cada empresa.
        </p>
      </div>

      <UsersAndGroupsPanel />
    </div>
  );
}

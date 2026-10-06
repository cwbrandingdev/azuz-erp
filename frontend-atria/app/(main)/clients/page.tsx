"use client";

import { useState } from "react";
import { ClientCard } from "@/components/clients/client-card";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { ClientsImportDialog } from "@/components/clients/clients-import-dialog";
import { ClientGroupFilter } from "@/components/clients/client-group-filter";
import { ClientGroupsManager } from "@/components/clients/client-groups-manager";
import { useClients, useCompanySettings } from "@/hooks/use-clients";
import { usePermissions } from "@/hooks/use-permissions";
import { useInvalidateClients } from "@/hooks/use-query-invalidation";

export default function ClientsPage() {
  const { canManageClientDirectory } = usePermissions();
  const canManageClients = canManageClientDirectory();
  const [groupFilter, setGroupFilter] = useState("");
  const invalidateClients = useInvalidateClients();
  const clientsQuery = useClients(groupFilter);
  const settingsQuery = useCompanySettings();
  const clients = clientsQuery.data;
  const hasCrmModuleEnabled =
    settingsQuery.data?.hasCrmModuleEnabled ?? false;

  if (clientsQuery.isPending && !clients) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
      </div>
    );
  }

  const list = clients ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
            Clientes
          </h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Gerencie clientes e conecte com a criação de conteúdo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManageClients && (
            <>
              <ClientGroupsManager onChange={() => void invalidateClients()} />
              <ClientsImportDialog onSuccess={() => void invalidateClients()} />
            </>
          )}
          <ClientFormDialog onSuccess={() => void invalidateClients()} />
        </div>
      </div>

      <ClientGroupFilter value={groupFilter} onChange={setGroupFilter} />

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/20 p-12 text-center">
          <p className="text-sm text-[var(--atria-primary)]/50">
            Nenhum cliente cadastrado. Adicione o primeiro cliente para começar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onUpdate={() => void invalidateClients()}
              hasCrmModuleEnabled={hasCrmModuleEnabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

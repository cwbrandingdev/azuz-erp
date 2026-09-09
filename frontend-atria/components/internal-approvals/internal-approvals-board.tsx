"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { InternalApprovalDetailPanel } from "@/components/internal-approvals/internal-approval-detail-panel";
import { InternalApprovalListItem } from "@/components/internal-approvals/internal-approval-list-item";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { usePermissions } from "@/hooks/use-permissions";
import { useInternalApprovals } from "@/hooks/use-internal-approvals";
import { clientsService } from "@/services";
import type { Client } from "@/services/types";

export function InternalApprovalsBoard() {
  const { canPerformInternalApproval } = usePermissions();
  const { data: items = [], isLoading } = useInternalApprovals(
    canPerformInternalApproval(),
  );
  const [clientFilter, setClientFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    clientsService
      .getClients()
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  const filteredItems = useMemo(() => {
    if (!clientFilter) return items;
    return items.filter((item) => item.client?.id === clientFilter);
  }, [items, clientFilter]);

  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ??
    filteredItems[0] ??
    null;

  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  const clientOptions = useMemo(() => {
    const fromItems = new Map<string, string>();
    for (const item of items) {
      if (item.client) {
        fromItems.set(item.client.id, item.client.companyName);
      }
    }
    for (const client of clients) {
      if (!fromItems.has(client.id)) {
        fromItems.set(client.id, client.companyName);
      }
    }
    return Array.from(fromItems.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [items, clients]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-[var(--atria-primary)]/10 bg-[var(--atria-accent)]/20 p-3 text-[var(--atria-primary)]">
          <ClipboardCheck className="size-6" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
              Aprovação Interna
            </h1>
            <p className="text-sm text-[var(--atria-primary)]/50">
              Entregas aguardando revisão do Master antes de seguir para o cliente
            </p>
          </div>
          {!isLoading && filteredItems.length > 0 ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {filteredItems.length} pendente
              {filteredItems.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-4">
        <p className="mb-1.5 text-xs font-medium text-[var(--atria-primary)]/50">
          Cliente
        </p>
        <SearchableSelect
          value={clientFilter}
          onValueChange={setClientFilter}
          allowEmpty
          emptyOptionLabel="Todos os clientes"
          options={clientOptions}
          placeholder="Todos os clientes"
        />
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 bg-white px-6 py-16 text-center">
          <ClipboardCheck className="mx-auto mb-3 size-8 text-[var(--atria-primary)]/30" />
          <p className="font-medium text-[var(--atria-primary)]">
            {clientFilter
              ? "Nenhuma entrega pendente para este cliente"
              : "Nenhuma entrega pendente"}
          </p>
          <p className="mt-1 text-sm text-[var(--atria-primary)]/50">
            Quando designers enviarem arquivos, eles aparecerão aqui para
            aprovação.
          </p>
        </div>
      ) : (
        <div className="grid min-h-[70vh] gap-4 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col gap-2 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto xl:pr-1">
            {filteredItems.map((item) => (
              <InternalApprovalListItem
                key={item.id}
                item={item}
                selected={selectedItem?.id === item.id}
                onSelect={() => setSelectedId(item.id)}
              />
            ))}
          </div>

          {selectedItem ? (
            <div className="min-h-0 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto">
              <InternalApprovalDetailPanel item={selectedItem} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

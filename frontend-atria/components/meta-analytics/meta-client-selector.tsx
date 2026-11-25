"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";
import type { MetaAdAccountClient } from "@/services/types";
import { useMemo } from "react";

function getStatusLabel(client: MetaAdAccountClient) {
  return client.isActive ? "Ativa" : "Inativa";
}

function formatAmountSpent(amount: number, currency: string) {
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  });
}

interface MetaClientSelectorProps {
  clients: MetaAdAccountClient[];
  value: string;
  onValueChange: (clientId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function MetaClientSelector({
  clients,
  value,
  onValueChange,
  disabled = false,
  loading = false,
  className,
}: MetaClientSelectorProps) {
  const options = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: client.name,
        description: `${formatAmountSpent(client.amountSpent, client.currency)} · ${getStatusLabel(client)}`,
        searchText: client.accountId,
      })),
    [clients],
  );

  if (!loading && clients.length === 0) {
    return (
      <div className="flex h-10 min-w-[14rem] items-center rounded-lg border border-dashed border-input px-3 text-sm text-muted-foreground">
        Nenhuma conta Meta disponível
      </div>
    );
  }

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      disabled={disabled}
      loading={loading}
      placeholder="Selecione uma conta"
      searchPlaceholder="Buscar conta por nome ou ID..."
      emptyLabel="Nenhuma conta encontrada"
      loadingLabel="Carregando contas..."
      className={className ?? "min-w-[16rem] w-full sm:w-72"}
    />
  );
}
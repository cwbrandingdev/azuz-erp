"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InstagramInsightClient } from "@/services/types";

interface ClientMetricsSelectorProps {
  clients: InstagramInsightClient[];
  value: string;
  onValueChange: (clientId: string) => void;
  loading?: boolean;
}

export function ClientMetricsSelector({
  clients,
  value,
  onValueChange,
  loading = false,
}: ClientMetricsSelectorProps) {
  if (loading) {
    return <Skeleton className="h-10 w-full min-w-[16rem] rounded-lg" />;
  }

  if (clients.length === 0) {
    return (
      <div className="flex h-10 min-w-[16rem] items-center rounded-lg border border-dashed border-input px-3 text-sm text-muted-foreground">
        Nenhum cliente com Instagram conectado
      </div>
    );
  }

  const selected = clients.find((client) => client.id === value);

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
    >
      <SelectTrigger aria-label="Selecionar cliente">
        {selected ? (
          <span className="truncate font-medium text-[var(--atria-primary)]">
            {selected.companyName}
          </span>
        ) : (
          <SelectValue placeholder="Selecione um cliente" />
        )}
      </SelectTrigger>
      <SelectContent>
        {clients.map((client) => (
          <SelectItem key={client.id} value={client.id}>
            {client.companyName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

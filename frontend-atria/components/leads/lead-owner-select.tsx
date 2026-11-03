"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CrmUserOption } from "@/services/types";

interface LeadOwnerSelectProps {
  id: string;
  value: string;
  onChange: (ownerUserId: string) => void;
  owners: CrmUserOption[];
  loading?: boolean;
  required?: boolean;
}

export function LeadOwnerSelect({
  id,
  value,
  onChange,
  owners,
  loading = false,
  required = false,
}: LeadOwnerSelectProps) {
  const selected = owners.find((owner) => owner.id === value);

  return (
    <Field>
      <FieldLabel htmlFor={id}>
        Responsável{required ? " *" : ""}
      </FieldLabel>
      <Select
        value={value || undefined}
        onValueChange={(next) => {
          if (next) onChange(next);
        }}
        disabled={loading || owners.length === 0}
      >
        <SelectTrigger id={id} className="w-full">
          {selected ? (
            <span className="line-clamp-1 min-w-0 flex-1 truncate text-left">
              {selected.name}
            </span>
          ) : (
            <SelectValue
              placeholder={loading ? "Carregando..." : "Selecione a pessoa"}
            />
          )}
        </SelectTrigger>
        <SelectContent>
          {owners.map((owner) => (
            <SelectItem key={owner.id} value={owner.id}>
              {owner.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

"use client";

import { History } from "lucide-react";
import { formatSearchSessionLabel } from "@/lib/lead-search-session";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LeadSearchSessionSummary } from "@/services/company-search.service";

interface SearchSessionFilterProps {
  sessions: LeadSearchSessionSummary[];
  selectedSessionId: string | null;
  loading?: boolean;
  onChange: (sessionId: string | null) => void;
}

export function SearchSessionFilter({
  sessions,
  selectedSessionId,
  loading,
  onChange,
}: SearchSessionFilterProps) {
  const value = selectedSessionId ?? "all";

  return (
    <Field>
      <FieldLabel htmlFor="search-session-filter">
        <span className="inline-flex items-center gap-2">
          <History className="size-4 text-[var(--atria-primary)]/60" />
          Ver buscas anteriores
        </span>
      </FieldLabel>
      <Select
        value={value}
        onValueChange={(next) => {
          if (!next) return;
          onChange(next === "all" ? null : next);
        }}
        disabled={loading}
      >
        <SelectTrigger
          id="search-session-filter"
          className="h-11 w-full text-sm font-medium"
        >
          <SelectValue
            placeholder={
              loading ? "Carregando buscas..." : "Última busca realizada"
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Mostrar a busca mais recente</SelectItem>
          {sessions.map((session) => (
            <SelectItem key={session.id} value={session.id}>
              <span className="line-clamp-1">
                {formatSearchSessionLabel(session)}
                {session.leadsCount > 0 ? ` (${session.leadsCount})` : ""}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

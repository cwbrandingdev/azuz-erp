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
  description?: string;
  onChange: (sessionId: string | null) => void;
}

export function SearchSessionFilter({
  sessions,
  selectedSessionId,
  loading,
  description,
  onChange,
}: SearchSessionFilterProps) {
  const value = selectedSessionId ?? "all";
  const selectedSession =
    selectedSessionId != null
      ? sessions.find((s) => s.id === selectedSessionId)
      : null;
  const selectedLabel = selectedSession
    ? formatSearchSessionLabel(selectedSession)
    : null;
  const triggerDisplayText =
    value === "all"
      ? "Mostrar a busca mais recente"
      : selectedLabel
        ? `${selectedLabel}${
            selectedSession && selectedSession.leadsCount > 0
              ? ` (${selectedSession.leadsCount})`
              : ""
          }`
        : null;

  return (
    <Field>
      <FieldLabel htmlFor="search-session-filter">
        <span className="inline-flex items-center gap-2">
          <History className="size-4 text-[var(--atria-primary)]/60" />
          Buscas recentes
        </span>
      </FieldLabel>
      {description ? (
        <p className="mb-2 text-xs text-[var(--atria-primary)]/50">
          {description}
        </p>
      ) : null}
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
          {triggerDisplayText ? (
            <span className="line-clamp-1 min-w-0 flex-1 truncate text-left">
              {triggerDisplayText}
            </span>
          ) : (
            <SelectValue
              placeholder={
                loading ? "Carregando buscas..." : "Selecione uma busca recente"
              }
            />
          )}
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

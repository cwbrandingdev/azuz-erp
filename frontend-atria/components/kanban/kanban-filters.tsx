"use client";

import { DateInput } from "@/components/ui/date-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  RECORDING_FILTER_OPTIONS,
  type RecordingFilter,
} from "@/lib/production-phase";
import type { Client, KanbanTask, TeamMember } from "@/services/types";

export type KanbanDateField = "" | "delivery" | "publication";

export interface KanbanFiltersState {
  assigneeId: string;
  clientId: string;
  recordingFilter: RecordingFilter;
  dateField: KanbanDateField;
  startDate: string;
  endDate: string;
}

export const EMPTY_KANBAN_FILTERS: KanbanFiltersState = {
  assigneeId: "",
  clientId: "",
  recordingFilter: "",
  dateField: "",
  startDate: "",
  endDate: "",
};

const DATE_FIELD_OPTIONS: { value: Exclude<KanbanDateField, "">; label: string }[] =
  [
    { value: "delivery", label: "Data de Entrega" },
    { value: "publication", label: "Data de Publicação" },
  ];

interface KanbanFiltersProps {
  filters: KanbanFiltersState;
  onChange: (filters: KanbanFiltersState) => void;
  members: TeamMember[];
  clients: Client[];
  showDateFilters?: boolean;
}

function toLocalDateKey(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateKeyInRange(
  dateKey: string | null,
  startDate: string,
  endDate: string,
): boolean {
  if (!dateKey) return false;
  if (startDate && dateKey < startDate) return false;
  if (endDate && dateKey > endDate) return false;
  return true;
}

export function matchesTaskDateFilter(
  task: Pick<KanbanTask, "deliveryDate" | "publicationDate" | "dueDate">,
  filters: Pick<KanbanFiltersState, "dateField" | "startDate" | "endDate">,
): boolean {
  if (!filters.startDate && !filters.endDate) return true;

  const deliveryKey = toLocalDateKey(task.deliveryDate ?? task.dueDate);
  const publicationKey = toLocalDateKey(task.publicationDate);

  if (filters.dateField === "delivery") {
    return isDateKeyInRange(deliveryKey, filters.startDate, filters.endDate);
  }

  if (filters.dateField === "publication") {
    return isDateKeyInRange(
      publicationKey,
      filters.startDate,
      filters.endDate,
    );
  }

  return (
    isDateKeyInRange(deliveryKey, filters.startDate, filters.endDate) ||
    isDateKeyInRange(publicationKey, filters.startDate, filters.endDate)
  );
}

export function KanbanFilters({
  filters,
  onChange,
  members,
  clients,
  showDateFilters = false,
}: KanbanFiltersProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3 ${
        showDateFilters ? "xl:grid-cols-6" : ""
      }`}
    >
      <div>
        <p className="mb-1.5 text-xs font-medium text-[var(--atria-primary)]/50">
          Responsável
        </p>
        <SearchableSelect
          value={filters.assigneeId}
          onValueChange={(value) =>
            onChange({ ...filters, assigneeId: value })
          }
          allowEmpty
          emptyOptionLabel="Todos"
          options={members.map((member) => ({
            value: member.id,
            label: member.name,
          }))}
          placeholder="Todos"
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-[var(--atria-primary)]/50">
          Cliente
        </p>
        <SearchableSelect
          value={filters.clientId}
          onValueChange={(value) => onChange({ ...filters, clientId: value })}
          allowEmpty
          emptyOptionLabel="Todos"
          options={clients.map((client) => ({
            value: client.id,
            label: client.companyName,
          }))}
          placeholder="Todos"
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-[var(--atria-primary)]/50">
          Gravação
        </p>
        <SearchableSelect
          value={filters.recordingFilter}
          onValueChange={(value) =>
            onChange({
              ...filters,
              recordingFilter: value as RecordingFilter,
            })
          }
          allowEmpty
          emptyOptionLabel="Todos"
          options={RECORDING_FILTER_OPTIONS.filter((option) => option.value !== "").map(
            (option) => ({
              value: option.value,
              label: option.label,
            }),
          )}
          placeholder="Todos"
        />
      </div>

      {showDateFilters && (
        <>
          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--atria-primary)]/50">
              Filtrar por data
            </p>
            <SearchableSelect
              value={filters.dateField}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  dateField: value as KanbanDateField,
                })
              }
              allowEmpty
              emptyOptionLabel="Qualquer data"
              options={DATE_FIELD_OPTIONS}
              placeholder="Qualquer data"
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--atria-primary)]/50">
              De
            </p>
            <DateInput
              value={filters.startDate}
              max={filters.endDate || undefined}
              onChange={(event) =>
                onChange({ ...filters, startDate: event.target.value })
              }
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--atria-primary)]/50">
              Até
            </p>
            <DateInput
              value={filters.endDate}
              min={filters.startDate || undefined}
              onChange={(event) =>
                onChange({ ...filters, endDate: event.target.value })
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

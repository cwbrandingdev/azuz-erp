"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input, inputClassName } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useProductivityReport } from "@/hooks/use-productivity-report";
import { isMasterOrAdmin, normalizeAppRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ProductivityFight } from "@/components/productivity/productivity-fight";
import type { ProductivityRow } from "@/services/productivity.service";

type MetricKey = Exclude<
  keyof ProductivityRow,
  "userId" | "name" | "role"
>;

interface MetricColumn {
  key: MetricKey;
  label: string;
  short: string;
}

const SDR_COLUMNS: MetricColumn[] = [
  { key: "calls", label: "Ligações", short: "Ligações" },
  { key: "messagesSent", label: "Mensagens enviadas", short: "Mensagens" },
  { key: "leadsOnKanban", label: "Leads no kanban", short: "Leads" },
  { key: "meetings", label: "Reuniões agendadas", short: "Reuniões" },
];

const PRODUCTION_COLUMNS: MetricColumn[] = [
  { key: "tasksCreated", label: "Tarefas criadas", short: "Criadas" },
  { key: "uploads", label: "Arquivos enviados", short: "Arquivos" },
  { key: "tasksCompleted", label: "Tarefas concluídas", short: "Concluídas" },
  { key: "comments", label: "Comentários", short: "Notas" },
];

const REVIEW_COLUMNS: MetricColumn[] = [
  { key: "internalApprovals", label: "Aprovações internas", short: "Aprovadas" },
  { key: "internalRejections", label: "Reprovações internas", short: "Reprovadas" },
];

const PORTAL_COLUMNS: MetricColumn[] = [
  { key: "clientApprovals", label: "Aprovados pelo cliente", short: "Cliente" },
  { key: "clientAdjustments", label: "Pedidos de ajuste", short: "Ajustes" },
];

interface CargoSection {
  role: string;
  label: string;
  columns: MetricColumn[];
}

const CARGO_SECTIONS: CargoSection[] = [
  { role: "crm", label: "CRM / SDR", columns: SDR_COLUMNS },
  {
    role: "designer_junior",
    label: "Designer Júnior",
    columns: [...PRODUCTION_COLUMNS, ...PORTAL_COLUMNS],
  },
  {
    role: "designer_master",
    label: "Designer Sênior",
    columns: [...PRODUCTION_COLUMNS, ...REVIEW_COLUMNS, ...PORTAL_COLUMNS],
  },
  {
    role: "master",
    label: "Master",
    columns: [
      ...SDR_COLUMNS,
      ...PRODUCTION_COLUMNS,
      ...REVIEW_COLUMNS,
      ...PORTAL_COLUMNS,
    ],
  },
];

const CARGO_OPTIONS = [
  { value: "", label: "Todos os cargos" },
  { value: "CRM", label: "CRM / SDR" },
  { value: "DESIGNER_MASTER", label: "Designer Sênior" },
  { value: "DESIGNER_JUNIOR", label: "Designer Júnior" },
  { value: "MASTER", label: "Master" },
];

const numberFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function currentMonthInputs() {
  const now = new Date();
  return {
    from: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function startOfLocalDay(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}

function endOfLocalDay(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

function formatMetric(value: number): string {
  return numberFormat.format(value);
}

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function monthLabel(date: Date): string {
  const label = date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function DayCalendar({
  from,
  to,
  onSelectDay,
}: {
  from: string;
  to: string;
  onSelectDay: (iso: string) => void;
}) {
  const [browse, setBrowse] = useState({ anchor: from, offset: 0 });
  const offset = browse.anchor === from ? browse.offset : 0;
  const now = new Date();
  const anchor = from
    ? new Date(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const visibleMonth = new Date(
    anchor.getFullYear(),
    anchor.getMonth() + offset,
    1,
  );
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  function shiftMonth(delta: number) {
    setBrowse({ anchor: from, offset: offset + delta });
  }
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toDateInputValue(new Date());
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div className="w-full max-w-xs rounded-2xl border border-[var(--atria-primary)]/35 bg-white p-3 shadow-sm dark:bg-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Mês anterior"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft />
        </Button>
        <p className="text-sm font-semibold text-[var(--atria-primary)]">
          {monthLabel(visibleMonth)}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Próximo mês"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <span
            key={weekday}
            className="py-1 text-[10px] font-medium uppercase text-[var(--atria-primary)]"
          >
            {weekday}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day == null) {
            return <span key={`empty-${index}`} />;
          }
          const iso = toDateInputValue(new Date(year, month, day));
          const isSingle = Boolean(from && to && from === to && iso === from);
          const isInRange = Boolean(from && to && iso >= from && iso <= to);
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              aria-pressed={isSingle}
              aria-label={isoDateLabel(iso)}
              onClick={() => onSelectDay(iso)}
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm font-medium text-[var(--atria-primary)] transition-colors hover:bg-[var(--atria-primary)]/15",
                isInRange && !isSingle && "bg-[var(--atria-primary)]/20",
                isSingle &&
                  "bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]",
                isToday && !isSingle && "ring-2 ring-[var(--atria-primary)]",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-[var(--atria-primary)]/80">
        Clique em um dia para filtrar só esse dia.
      </p>
    </div>
  );
}

function isoDateLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function maxByColumn(
  columns: MetricColumn[],
  rows: ProductivityRow[],
): Map<MetricKey, number> {
  const maxes = new Map<MetricKey, number>();
  for (const column of columns) {
    let max = 0;
    for (const row of rows) {
      max = Math.max(max, row[column.key]);
    }
    maxes.set(column.key, max);
  }
  return maxes;
}

function MetricBars({
  columns,
  row,
  maxes,
}: {
  columns: MetricColumn[];
  row: ProductivityRow;
  maxes: Map<MetricKey, number>;
}) {
  return (
    <div className="flex flex-wrap items-end gap-x-2 gap-y-3">
      {columns.map((column) => {
        const value = row[column.key];
        const max = maxes.get(column.key) ?? 0;
        const ratio = max <= 0 ? 0 : value / max;
        const height = value <= 0 ? 0 : Math.max(ratio * 100, 10);
        return (
          <div
            key={column.key}
            className="flex w-12 flex-col items-center gap-1"
            title={`${column.label}: ${formatMetric(value)}`}
          >
            <span className="text-[10px] tabular-nums text-[var(--atria-primary)]">
              {formatMetric(value)}
            </span>
            <div className="flex h-24 w-full items-end rounded-md bg-[var(--atria-primary)]/15">
              <div
                className="w-full rounded-md bg-[var(--atria-primary)] transition-[height] duration-500"
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-center text-[10px] leading-tight text-[var(--atria-primary)]/90">
              {column.short}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CargoCards({
  label,
  columns,
  rows,
}: {
  label: string;
  columns: MetricColumn[];
  rows: ProductivityRow[];
}) {
  const maxes = maxByColumn(columns, rows);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--atria-primary)]">
          {label}
        </h2>
        <p className="text-xs text-[var(--atria-primary)]/80">
          {rows.length === 1 ? "1 pessoa" : `${rows.length} pessoas`}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article
            key={row.userId}
            className="rounded-2xl border border-[var(--atria-primary)]/35 bg-white p-4 shadow-sm dark:bg-card"
          >
            <h3 className="truncate text-sm font-semibold text-[var(--atria-primary)]">
              {row.name}
            </h3>
            <div className="mt-4">
              <MetricBars columns={columns} row={row} maxes={maxes} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProductivityReport() {
  const { user } = useAuth();
  const canFilterPeople = isMasterOrAdmin(user?.role);
  const initialRange = useMemo(() => currentMonthInputs(), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const deferredName = useDeferredValue(name.trim());
  const rangeInvalid = Boolean(from && to && from > to);

  const query = useMemo(
    () => ({
      from: from ? startOfLocalDay(from) : undefined,
      to: to ? endOfLocalDay(to) : undefined,
      role: canFilterPeople && role ? role : undefined,
      q: canFilterPeople && deferredName ? deferredName : undefined,
    }),
    [canFilterPeople, deferredName, from, role, to],
  );

  const fightQuery = useMemo(
    () => ({ from: query.from, to: query.to }),
    [query.from, query.to],
  );
  const report = useProductivityReport(query, !rangeInvalid);
  const fightReport = useProductivityReport(
    fightQuery,
    canFilterPeople && !rangeInvalid,
  );
  const rows = report.data?.rows ?? [];
  const sections = CARGO_SECTIONS.map((section) => ({
    ...section,
    rows: rows.filter((row) => normalizeAppRole(row.role) === section.role),
  })).filter((section) => section.rows.length > 0);
  const ownColumns = rows[0]
    ? CARGO_SECTIONS.find(
        (section) => section.role === normalizeAppRole(rows[0].role),
      )?.columns ?? []
    : [];

  function selectDay(iso: string) {
    setFrom(iso);
    setTo(iso);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <DayCalendar from={from} to={to} onSelectDay={selectDay} />
      <div className="flex flex-1 flex-wrap items-end gap-3">
        <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-medium text-[var(--atria-primary)]">
          De
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-medium text-[var(--atria-primary)]">
          Até
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const month = currentMonthInputs();
            setFrom(month.from);
            setTo(month.to);
          }}
        >
          Mês atual
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setFrom("");
            setTo("");
          }}
        >
          Todo o período
        </Button>
        <Button type="button" variant="outline" onClick={() => selectDay(toDateInputValue(new Date()))}>
          Hoje
        </Button>
        {canFilterPeople ? (
          <>
            <label className="flex min-w-[12rem] flex-col gap-1 text-xs font-medium text-[var(--atria-primary)]">
              Cargo
              <select
                className={cn(inputClassName, "h-8")}
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                {CARGO_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-medium text-[var(--atria-primary)]">
              Nome
              <Input
                value={name}
                placeholder="Buscar por nome"
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          </>
        ) : null}
      </div>
      </div>

      {rangeInvalid ? (
        <p className="text-sm text-destructive">
          A data inicial precisa ser anterior à data final.
        </p>
      ) : null}

      {report.isPending ? (
        <div className="flex min-h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
        </div>
      ) : null}

      {report.isError ? (
        <p className="text-sm text-destructive">
          Não foi possível carregar o relatório.
        </p>
      ) : null}

      {!report.isPending && !report.isError && !rangeInvalid && rows.length === 0 ? (
        <p className="text-sm text-[var(--atria-primary)]/85">
          Nenhuma pessoa nesse filtro.
        </p>
      ) : null}

      {!report.isPending && !report.isError && !rangeInvalid && rows.length > 0 ? (
        canFilterPeople ? (
          <div className="flex flex-col gap-6">
            {fightReport.data ? (
              <ProductivityFight rows={fightReport.data.rows} />
            ) : null}
            {sections.map((section) => (
              <CargoCards
                key={section.role}
                label={section.label}
                columns={section.columns}
                rows={section.rows}
              />
            ))}
          </div>
        ) : (
          <article className="max-w-xl rounded-2xl border border-[var(--atria-primary)]/35 bg-white p-4 shadow-sm dark:bg-card">
            <h2 className="truncate text-sm font-semibold text-[var(--atria-primary)]">
              {rows[0].name}
            </h2>
            <div className="mt-4">
              <MetricBars
                columns={ownColumns}
                row={rows[0]}
                maxes={maxByColumn(ownColumns, [rows[0]])}
              />
            </div>
          </article>
        )
      ) : null}

      <p className="max-w-3xl text-xs leading-relaxed text-[var(--atria-primary)]/80">
        Cada cargo fica na própria tabela, só com as métricas daquele
        trabalho. Leads no kanban contam o responsável do lead criado no
        período. Aprovações e pedidos de ajuste do portal contam para quem
        enviou o arquivo.
      </p>
    </div>
  );
}

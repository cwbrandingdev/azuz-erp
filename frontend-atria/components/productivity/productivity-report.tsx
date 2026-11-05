"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useProductivityReport } from "@/hooks/use-productivity-report";
import { isMasterOrAdmin, normalizeAppRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ProductivityFight } from "@/components/productivity/productivity-fight";
import type { ProductivityRow } from "@/services/productivity.service";

type MetricKey = Exclude<
  keyof ProductivityRow,
  "userId" | "name" | "role" | "avatarUrl"
>;

interface MetricColumn {
  key: MetricKey;
  label: string;
  short: string;
  source: string;
}

const SDR_COLUMNS: MetricColumn[] = [
  { key: "calls", label: "Ligações", short: "Ligações", source: "Ligação do lead" },
  {
    key: "messagesSent",
    label: "Mensagens enviadas",
    short: "Mensagens",
    source: "WhatsApp enviado",
  },
  {
    key: "leadsOnKanban",
    label: "Leads no kanban",
    short: "Leads",
    source: "Lead no kanban",
  },
  {
    key: "meetings",
    label: "Reuniões agendadas",
    short: "Reuniões",
    source: "Reunião do lead",
  },
];

const PRODUCTION_COLUMNS: MetricColumn[] = [
  {
    key: "tasksCreated",
    label: "Tarefas criadas",
    short: "Criadas",
    source: "Tarefa do kanban",
  },
  {
    key: "uploads",
    label: "Arquivos enviados",
    short: "Arquivos",
    source: "Arquivo do kanban",
  },
  {
    key: "tasksCompleted",
    label: "Tarefas concluídas",
    short: "Concluídas",
    source: "Concluída no kanban",
  },
  {
    key: "comments",
    label: "Comentários",
    short: "Notas",
    source: "Comentário no kanban",
  },
];

const REVIEW_COLUMNS: MetricColumn[] = [
  {
    key: "internalApprovals",
    label: "Aprovações internas",
    short: "Aprovadas",
    source: "Revisão interna",
  },
  {
    key: "internalRejections",
    label: "Reprovações internas",
    short: "Reprovadas",
    source: "Revisão interna",
  },
];

const PORTAL_COLUMNS: MetricColumn[] = [
  {
    key: "clientApprovals",
    label: "Aprovados pelo cliente",
    short: "Cliente",
    source: "Portal do cliente",
  },
  {
    key: "clientAdjustments",
    label: "Pedidos de ajuste",
    short: "Ajustes",
    source: "Portal do cliente",
  },
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

const VIEW_TOGGLES = [
  { id: "sdr", label: "SDR", roles: ["crm"] },
  {
    id: "designers",
    label: "Designers",
    roles: ["designer_junior", "designer_master"],
  },
  { id: "master", label: "Master", roles: ["master"] },
] as const;

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
    <div className="w-full max-w-xs rounded-2xl border border-[var(--atria-primary)]/35 bg-white p-3 shadow-sm lg:w-80 dark:bg-card">
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
            className="flex w-16 flex-col items-center gap-1"
            title={`${column.label} · ${column.source}: ${formatMetric(value)}`}
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
            <span className="text-center text-[10px] leading-tight font-medium text-[var(--atria-primary)]">
              {column.short}
            </span>
            <span className="line-clamp-2 min-h-8 text-center text-[10px] leading-tight text-[var(--atria-primary)]/70">
              {column.source}
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
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article
            key={row.userId}
            className="min-w-0 rounded-2xl border border-[var(--atria-primary)]/35 bg-white p-4 shadow-sm dark:bg-card"
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
  const [name, setName] = useState("");
  const [visibleGroups, setVisibleGroups] = useState<Set<string>>(
    () => new Set(VIEW_TOGGLES.map((group) => group.id)),
  );
  const deferredName = useDeferredValue(name.trim());
  const rangeInvalid = Boolean(from && to && from > to);

  const query = useMemo(
    () => ({
      from: from ? startOfLocalDay(from) : undefined,
      to: to ? endOfLocalDay(to) : undefined,
      q: canFilterPeople && deferredName ? deferredName : undefined,
    }),
    [canFilterPeople, deferredName, from, to],
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
  const visibleRoles = new Set<string>(
    VIEW_TOGGLES.filter((group) => visibleGroups.has(group.id)).flatMap(
      (group) => group.roles,
    ),
  );
  const sections = CARGO_SECTIONS.map((section) => ({
    ...section,
    rows: rows.filter((row) => normalizeAppRole(row.role) === section.role),
  })).filter(
    (section) => section.rows.length > 0 && visibleRoles.has(section.role),
  );

  function toggleGroup(id: string) {
    setVisibleGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
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
    <div className="flex min-w-0 max-w-full flex-col gap-5">
      <div className="flex min-w-0 flex-wrap items-end gap-3">
        {canFilterPeople ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setVisibleGroups(new Set(VIEW_TOGGLES.map((group) => group.id)))
              }
              className="rounded-full border border-[var(--atria-primary)]/40 px-3 py-1.5 text-sm font-medium text-[var(--atria-primary)]"
            >
              Todos
            </button>
            {VIEW_TOGGLES.map((group) => {
              const active = visibleGroups.has(group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium",
                    active
                      ? "border-[var(--atria-primary)] bg-[var(--atria-primary)] text-white"
                      : "border-[var(--atria-primary)]/40 bg-transparent text-[var(--atria-primary)]",
                  )}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
        ) : null}
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
        <Button
          type="button"
          variant="outline"
          onClick={() => selectDay(toDateInputValue(new Date()))}
        >
          Hoje
        </Button>
        {canFilterPeople ? (
          <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-medium text-[var(--atria-primary)]">
            Nome
            <Input
              value={name}
              placeholder="Buscar por nome"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        ) : null}
      </div>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[max-content_minmax(0,1fr)] lg:items-stretch">
        <DayCalendar from={from} to={to} onSelectDay={selectDay} />
        {canFilterPeople && !rangeInvalid ? (
          <div className="relative min-w-0">
            {fightReport.isPending ? (
              <div className="flex min-h-40 items-center justify-center rounded-2xl border border-[var(--atria-primary)]/35 bg-white lg:absolute lg:inset-0 lg:min-h-0 dark:bg-card">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
              </div>
            ) : null}
            {fightReport.data ? (
              <ProductivityFight
                rows={fightReport.data.rows}
                className="lg:absolute lg:inset-0"
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {canFilterPeople ? (
        <p className="text-xs leading-relaxed text-[var(--atria-primary)]/80">
          Os dois lutadores precisam ser do mesmo cargo. SDR conta ligações,
          mensagens, leads e reuniões. Designer conta tarefas criadas,
          arquivos, tarefas concluídas, comentários e aprovações do cliente.
        </p>
      ) : null}

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
            {sections.length === 0 ? (
              <p className="text-sm text-[var(--atria-primary)]/85">
                Ative um cargo para ver os gráficos.
              </p>
            ) : (
              sections.map((section) => (
                <CargoCards
                  key={section.role}
                  label={section.label}
                  columns={section.columns}
                  rows={section.rows}
                />
              ))
            )}
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

"use client";

import { useState, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetaClientSelector } from "@/components/meta-analytics/meta-client-selector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMetaAdsReport,
  useMetaAgencyOverview,
} from "@/hooks/use-meta-analytics";
import { useMetaClientSelection } from "@/hooks/use-meta-client-selection";
import { cn } from "@/lib/utils";
import type {
  MetaAdsBreakdownRow,
  MetaAdsCreativeRow,
  MetaAdsEntityRow,
  MetaAdsDailyPoint,
  MetaAdsFunnelStep,
  MetaAdsKpis,
  MetaCampaignStatus,
  MetaDatePreset,
} from "@/services/types";

const DATE_PRESET_OPTIONS: { value: MetaDatePreset; label: string }[] = [
  { value: "last_7d", label: "Últimos 7 dias" },
  { value: "last_30d", label: "Últimos 30 dias" },
  { value: "last_90d", label: "Últimos 90 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "this_year", label: "Este ano" },
];

const MONTH_OPTIONS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const PAGE_TABS = [
  { id: "account", label: "Performance da conta" },
  { id: "agency", label: "Todas as contas da agência" },
] as const;

type PageTabId = (typeof PAGE_TABS)[number]["id"];

const SECTIONS = [
  { id: "overview", label: "Visão geral" },
  { id: "campaigns", label: "Campanhas" },
  { id: "ads", label: "Anúncios" },
  { id: "audience", label: "Público" },
  { id: "placement", label: "Posicionamento" },
  { id: "funnel", label: "Funil" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const STATUS_LABELS: Record<MetaCampaignStatus, string> = {
  active: "Ativa",
  paused: "Pausada",
  completed: "Concluída",
  learning: "Em processo",
  unknown: "—",
};

function formatMoney(value: number, currency = "BRL") {
  try {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    });
  } catch {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatRatio(value: number) {
  return value > 0 ? `${value.toFixed(2)}x` : "—";
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatShortDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatPeriodLabel(
  datePreset: MetaDatePreset,
  month?: number,
  year?: number,
) {
  if (month && year) {
    return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }
  return (
    DATE_PRESET_OPTIONS.find((option) => option.value === datePreset)?.label ??
    "Período selecionado"
  );
}

const CHART_PRIMARY = "var(--atria-primary)";
const CHART_ACCENT = "var(--atria-accent)";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-[var(--atria-primary)]">{title}</h4>
        {description ? (
          <p className="text-xs text-[var(--atria-primary)]/50">{description}</p>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

function EmptyBlock({ title }: { title: string }) {
  return (
    <p className="py-6 text-center text-sm text-[var(--atria-primary)]/50">{title}</p>
  );
}

function BreakdownList({
  rows,
  currency,
}: {
  rows: MetaAdsBreakdownRow[];
  currency: string;
}) {
  if (rows.length === 0) return <EmptyBlock title="Sem dados neste recorte." />;
  const max = Math.max(...rows.map((row) => row.spend), 1);

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-[var(--atria-primary)]">
              {row.label}
              {row.detail ? (
                <span className="ml-2 text-xs font-normal text-[var(--atria-primary)]/45">
                  {row.detail}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-xs text-[var(--atria-primary)]/60">
              {formatMoney(row.spend, currency)} · CTR {formatPercent(row.ctr)} · ROAS{" "}
              {formatRatio(row.roas)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--atria-primary)]/10">
            <div
              className="h-full rounded-full bg-[var(--atria-primary)]"
              style={{ width: `${Math.max((row.spend / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EntityTable({
  rows,
  currency,
  nameLabel,
}: {
  rows: MetaAdsEntityRow[];
  currency: string;
  nameLabel: string;
}) {
  if (rows.length === 0) return <EmptyBlock title="Nada com entrega neste período." />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-[var(--atria-primary)]/55">
          <tr>
            <th className="px-3 py-2 font-medium">{nameLabel}</th>
            <th className="px-3 py-2 font-medium">Objetivo</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Investimento</th>
            <th className="px-3 py-2 font-medium">Alcance</th>
            <th className="px-3 py-2 font-medium">Frequência</th>
            <th className="px-3 py-2 font-medium">CTR</th>
            <th className="px-3 py-2 font-medium">CPC</th>
            <th className="px-3 py-2 font-medium">CPM</th>
            <th className="px-3 py-2 font-medium">Compras</th>
            <th className="px-3 py-2 font-medium">CPA</th>
            <th className="px-3 py-2 font-medium">Receita</th>
            <th className="px-3 py-2 font-medium">ROAS</th>
            <th className="px-3 py-2 font-medium">Leads</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-[var(--atria-primary)]/8">
              <td className="max-w-[16rem] px-3 py-3">
                <p className="truncate font-medium text-[var(--atria-primary)]">{row.name}</p>
                {row.parentName ? (
                  <p className="truncate text-xs text-[var(--atria-primary)]/45">{row.parentName}</p>
                ) : null}
                {row.budget > 0 ? (
                  <p className="text-[11px] text-[var(--atria-primary)]/40">
                    Orçamento {formatMoney(row.budget, currency)}
                    {row.budgetType === "daily" ? "/dia" : ""}
                  </p>
                ) : null}
              </td>
              <td className="px-3 py-3 text-[var(--atria-primary)]/70">
                {row.objectiveLabel ?? "—"}
              </td>
              <td className="px-3 py-3 text-[var(--atria-primary)]/70">
                {row.status ? STATUS_LABELS[row.status] : "—"}
              </td>
              <td className="px-3 py-3 font-medium text-[var(--atria-primary)]">
                {formatMoney(row.spend, currency)}
              </td>
              <td className="px-3 py-3 text-[var(--atria-primary)]/70">{formatNumber(row.reach)}</td>
              <td className="px-3 py-3 text-[var(--atria-primary)]/70">
                {row.frequency > 0 ? row.frequency.toFixed(2) : "—"}
              </td>
              <td className="px-3 py-3 text-[var(--atria-primary)]/70">{formatPercent(row.ctr)}</td>
              <td className="px-3 py-3 text-[var(--atria-primary)]/70">
                {formatMoney(row.cpc, currency)}
              </td>
              <td className="px-3 py-3 text-[var(--atria-primary)]/70">
                {formatMoney(row.cpm, currency)}
              </td>
              <td className="px-3 py-3 text-[var(--atria-primary)]/70">
                {formatNumber(row.purchases)}
              </td>
              <td className="px-3 py-3 text-[var(--atria-primary)]/70">
                {row.costPerPurchase > 0 ? formatMoney(row.costPerPurchase, currency) : "—"}
              </td>
              <td className="px-3 py-3 text-[var(--atria-primary)]/70">
                {formatMoney(row.revenue, currency)}
              </td>
              <td className="px-3 py-3 font-medium text-[var(--atria-primary)]">
                {formatRatio(row.roas)}
              </td>
              <td className="px-3 py-3 text-[var(--atria-primary)]/70">{formatNumber(row.leads)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PerformanceKpiStrip({
  overview,
  currency,
}: {
  overview: MetaAdsKpis;
  currency: string;
}) {
  const results = overview.purchases + overview.leads;
  const costPerResult = results > 0 ? overview.spend / results : 0;

  const items = [
    { label: "Investimento", value: formatMoney(overview.spend, currency) },
    { label: "Impressões", value: formatNumber(overview.impressions) },
    { label: "Cliques", value: formatNumber(overview.clicks) },
    { label: "CTR médio", value: formatPercent(overview.ctr) },
    { label: "CPC médio", value: formatMoney(overview.cpc, currency) },
    { label: "Resultados", value: formatNumber(results) },
    {
      label: "CPL médio",
      value: results > 0 ? formatMoney(costPerResult, currency) : "—",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {items.map((item) => (
        <Card
          key={item.label}
          className="rounded-xl border border-[var(--atria-primary)]/10 bg-white px-4 py-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--atria-primary)]/45">
            {item.label}
          </p>
          <p className="mt-1 text-lg font-bold tracking-tight text-[var(--atria-primary)] sm:text-xl">
            {item.value}
          </p>
        </Card>
      ))}
    </div>
  );
}

function DailyEvolutionChart({
  data,
  currency,
}: {
  data: MetaAdsDailyPoint[];
  currency: string;
}) {
  const chartData = data.map((point) => ({
    ...point,
    results: point.purchases + point.leads,
  }));

  return (
    <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--atria-primary)]">
            Evolução diária — investimento & resultados
          </h3>
          <p className="text-xs text-[var(--atria-primary)]/50">
            Barras: gasto · Linha: compras + leads
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-[var(--atria-primary)]/60">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-[var(--atria-primary)]" />
            Gasto
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[var(--atria-accent)]" />
            Resultados
          </span>
        </div>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#00494918" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              stroke="#00494955"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              yAxisId="spend"
              stroke="#00494955"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) =>
                value >= 1000 ? `R$ ${(value / 1000).toFixed(1)}k` : `R$ ${value}`
              }
            />
            <YAxis
              yAxisId="results"
              orientation="right"
              stroke="#00494955"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value, name) =>
                name === "Gasto"
                  ? formatMoney(Number(value ?? 0), currency)
                  : formatNumber(Number(value ?? 0))
              }
              labelFormatter={(label) =>
                new Date(`${String(label)}T12:00:00`).toLocaleDateString("pt-BR")
              }
            />
            <Bar
              yAxisId="spend"
              dataKey="spend"
              name="Gasto"
              fill={CHART_PRIMARY}
              fillOpacity={0.85}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Line
              yAxisId="results"
              type="monotone"
              dataKey="results"
              name="Resultados"
              stroke={CHART_ACCENT}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART_ACCENT }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function DailySecondaryCharts({ data }: { data: MetaAdsDailyPoint[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-[var(--atria-primary)]">
          Cliques por dia
        </h3>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00494918" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                labelFormatter={(label) =>
                  new Date(`${String(label)}T12:00:00`).toLocaleDateString("pt-BR")
                }
              />
              <Bar
                dataKey="clicks"
                name="Cliques"
                fill={CHART_PRIMARY}
                fillOpacity={0.75}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-[var(--atria-primary)]">
          CTR por dia
        </h3>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00494918" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `${value}%`}
              />
              <Tooltip
                formatter={(value) => formatPercent(Number(value ?? 0))}
                labelFormatter={(label) =>
                  new Date(`${String(label)}T12:00:00`).toLocaleDateString("pt-BR")
                }
              />
              <Line
                type="monotone"
                dataKey="ctr"
                name="CTR"
                stroke={CHART_ACCENT}
                strokeWidth={2}
                dot={{ r: 2, fill: CHART_ACCENT }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function Funnel({ steps }: { steps: MetaAdsFunnelStep[] }) {
  const max = Math.max(...steps.map((step) => step.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {steps.map((step) => (
        <div key={step.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-[var(--atria-primary)]">{step.label}</span>
            <span className="text-xs text-[var(--atria-primary)]/60">
              {formatNumber(step.value)}
              {step.rateFromPrevious != null
                ? ` · ${formatPercent(step.rateFromPrevious * 100)} da etapa anterior`
                : ""}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--atria-primary)]/10">
            <div
              className="h-full rounded-full bg-[var(--atria-primary)]"
              style={{ width: `${Math.max((step.value / max) * 100, step.value > 0 ? 2 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CreativeGrid({
  ads,
  currency,
}: {
  ads: MetaAdsCreativeRow[];
  currency: string;
}) {
  if (ads.length === 0) return <EmptyBlock title="Nenhum anúncio com entrega neste período." />;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {ads.map((ad) => (
        <Card
          key={ad.id}
          className="overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white"
        >
          <div className="flex gap-3 p-4">
            <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-[var(--atria-primary)]/5">
              {ad.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ad.thumbnailUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--atria-primary)]">
                {ad.headline || ad.name}
              </p>
              {ad.parentName ? (
                <p className="truncate text-xs text-[var(--atria-primary)]/45">{ad.parentName}</p>
              ) : null}
              {ad.primaryText ? (
                <p className="mt-1 line-clamp-2 text-xs text-[var(--atria-primary)]/60">
                  {ad.primaryText}
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-[var(--atria-primary)]/8 px-4 py-3 text-xs">
            <Metric label="Gasto" value={formatMoney(ad.spend, currency)} />
            <Metric label="CTR" value={formatPercent(ad.ctr)} />
            <Metric label="CPC" value={formatMoney(ad.cpc, currency)} />
            <Metric label="Compras" value={formatNumber(ad.purchases)} />
            <Metric label="CPA" value={ad.costPerPurchase > 0 ? formatMoney(ad.costPerPurchase, currency) : "—"} />
            <Metric label="ROAS" value={formatRatio(ad.roas)} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[var(--atria-primary)]/45">{label}</p>
      <p className="font-medium text-[var(--atria-primary)]">{value}</p>
    </div>
  );
}

export function MetaAdsReportPanel() {
  const [pageTab, setPageTab] = useState<PageTabId>("account");
  const [section, setSection] = useState<SectionId>("overview");
  const [level, setLevel] = useState<"campaigns" | "adsets">("campaigns");
  const {
    clients,
    selectedClientId,
    setSelectedClientId,
    datePreset,
    setDatePreset,
    month,
    year,
    setMonthFilter,
    isLoadingClients,
    isClientsError,
    clientsError,
    refetchClients,
  } = useMetaClientSelection();

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
  const query = {
    datePreset: month && year ? undefined : datePreset,
    month,
    year,
  };

  const agency = useMetaAgencyOverview(query);
  const report = useMetaAdsReport(selectedClientId, query);
  const currency = report.data?.client.currency || "BRL";
  const selectedName =
    clients.find((client) => client.id === selectedClientId)?.name ??
    report.data?.client.name;
  const periodLabel = formatPeriodLabel(datePreset, month, year);
  const isRefreshing = agency.isFetching || report.isFetching || isLoadingClients;
  const updatedAtLabel = report.dataUpdatedAt
    ? new Date(report.dataUpdatedAt).toLocaleString("pt-BR")
    : null;

  return (
    <section className="flex flex-col gap-5">
      <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-[var(--atria-primary)]">
                  {pageTab === "agency"
                    ? "Todas as contas da agência"
                    : `${selectedName ?? "Conta"} · Performance Meta Ads`}
                </h2>
                <span className="rounded-full bg-[var(--atria-accent)]/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--atria-primary)]">
                  ao vivo
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--atria-primary)]/50">
                {pageTab === "agency"
                  ? `Comparativo de todas as contas · ${periodLabel}`
                  : `conta ${selectedName ?? "—"} · ${periodLabel}`}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <MetaClientSelector
                clients={clients}
                value={selectedClientId}
                onValueChange={setSelectedClientId}
                loading={isLoadingClients}
                disabled={isClientsError}
                className="w-full sm:w-72"
              />
              <select
                value={month && year ? "custom_month" : datePreset}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "custom_month") {
                    setMonthFilter(new Date().getMonth() + 1, currentYear);
                    return;
                  }
                  setDatePreset(value as MetaDatePreset);
                }}
                className="h-10 rounded-lg border border-input bg-white px-3 text-sm"
              >
                {DATE_PRESET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value="custom_month">Mês específico</option>
              </select>
              {month && year ? (
                <>
                  <select
                    value={month}
                    onChange={(event) =>
                      setMonthFilter(Number(event.target.value), year)
                    }
                    className="h-10 rounded-lg border border-input bg-white px-3 text-sm"
                  >
                    {MONTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={year}
                    onChange={(event) => setMonthFilter(month, Number(event.target.value))}
                    className="h-10 rounded-lg border border-input bg-white px-3 text-sm"
                  >
                    {yearOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end">
            <Button
              type="button"
              className="gap-2 bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90"
              onClick={() => {
                void refetchClients();
                void agency.refetch();
                void report.refetch();
              }}
              disabled={isRefreshing}
            >
              <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Atualizar dados
            </Button>
            {updatedAtLabel ? (
              <p className="text-center text-[11px] text-[var(--atria-primary)]/45 sm:text-right">
                Atualizado {updatedAtLabel}
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      <div
        className="flex flex-wrap gap-2 border-b border-[var(--atria-primary)]/15 pb-1"
        role="tablist"
        aria-label="Visão Meta Ads"
      >
        {PAGE_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={pageTab === item.id}
            onClick={() => setPageTab(item.id)}
            className={cn(
              "-mb-px rounded-t-lg border border-transparent px-4 py-2.5 text-sm font-medium transition-colors",
              pageTab === item.id
                ? "border-[var(--atria-primary)]/15 border-b-white bg-white text-[var(--atria-primary)] shadow-sm"
                : "text-[var(--atria-primary)]/60 hover:bg-[var(--atria-primary)]/5 hover:text-[var(--atria-primary)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isClientsError ? (
        <Card className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-8 text-center">
          <AlertCircle className="size-6 text-red-600" />
          <p className="font-semibold text-red-800">Não foi possível carregar as contas</p>
          <p className="text-sm text-red-700/80">
            {clientsError instanceof Error ? clientsError.message : "Erro ao consultar o Meta."}
          </p>
        </Card>
      ) : null}

      {pageTab === "agency" ? (
        <Card className="overflow-visible rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5">
          {agency.isLoading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : agency.isError ? (
            <p className="text-sm text-red-700">
              {agency.error instanceof Error
                ? agency.error.message
                : "Erro ao carregar resumo."}
            </p>
          ) : agency.data && !agency.data.empty ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-[var(--atria-primary)]/60">
                  <tr>
                    <th className="px-3 py-2 font-medium">Conta</th>
                    <th className="px-3 py-2 font-medium">Investimento</th>
                    <th className="px-3 py-2 font-medium">CTR</th>
                    <th className="px-3 py-2 font-medium">Resultados</th>
                  </tr>
                </thead>
                <tbody>
                  {agency.data.accounts.map((row) => (
                    <tr
                      key={row.client.id}
                      className="cursor-pointer border-t border-[var(--atria-primary)]/8 hover:bg-[var(--atria-accent)]/10"
                      onClick={() => {
                        setSelectedClientId(row.client.id);
                        setPageTab("account");
                        setSection("overview");
                      }}
                    >
                      <td className="px-3 py-2 font-medium text-[var(--atria-primary)]">
                        {row.client.name}
                      </td>
                      <td className="px-3 py-2">
                        {row.empty
                          ? "—"
                          : formatMoney(row.overview.totalSpend, row.client.currency)}
                      </td>
                      <td className="px-3 py-2">
                        {row.empty ? "—" : formatPercent(row.overview.ctr)}
                      </td>
                      <td className="px-3 py-2">
                        {row.empty
                          ? "—"
                          : formatNumber(row.overview.purchases + row.overview.leads)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--atria-primary)]/50">Nenhuma conta com dados.</p>
          )}
        </Card>
      ) : null}

      {pageTab === "account" && (report.isLoading || (report.isFetching && !report.data)) ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-52 rounded-2xl" />
            <Skeleton className="h-52 rounded-2xl" />
          </div>
        </div>
      ) : pageTab === "account" && report.isError ? (
        <Card className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-800">
          {report.error instanceof Error
            ? report.error.message
            : "Erro ao carregar o relatório da conta."}
        </Card>
      ) : pageTab === "account" && report.data?.empty ? (
        <Card className="rounded-2xl border border-dashed border-[var(--atria-primary)]/20 bg-white px-6 py-12 text-center text-sm text-[var(--atria-primary)]/60">
          Essa conta não teve entrega no período selecionado.
        </Card>
      ) : pageTab === "account" && report.data ? (
        <>
          <PerformanceKpiStrip overview={report.data.overview} currency={currency} />
          {report.data.performance.length > 0 ? (
            <>
              <DailyEvolutionChart data={report.data.performance} currency={currency} />
              <DailySecondaryCharts data={report.data.performance} />
            </>
          ) : null}
        </>
      ) : null}

      {pageTab === "account" ? (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 border-b border-[var(--atria-primary)]/10 pb-3">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                section === item.id
                  ? "bg-[var(--atria-primary)] text-white"
                  : "text-[var(--atria-primary)]/70 hover:bg-[var(--atria-primary)]/5"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {report.data && !report.data.empty ? (
          <>
            {section === "overview" ? (
              <SectionCard
                title="Por objetivo"
                description="Reconhecimento, tráfego, cadastro e venda medidos separados."
              >
                <BreakdownList rows={report.data.objectives} currency={currency} />
              </SectionCard>
            ) : null}

            {section === "campaigns" ? (
              <SectionCard
                title={level === "campaigns" ? "Campanhas" : "Conjuntos de anúncios"}
                description="Gasto, alcance, frequência, custo e retorno de cada nível."
              >
                <div className="mb-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLevel("campaigns")}
                    className={`rounded-full px-3 py-1 text-xs ${level === "campaigns" ? "bg-[var(--atria-primary)] text-white" : "bg-[var(--atria-primary)]/5 text-[var(--atria-primary)]"}`}
                  >
                    Campanhas
                  </button>
                  <button
                    type="button"
                    onClick={() => setLevel("adsets")}
                    className={`rounded-full px-3 py-1 text-xs ${level === "adsets" ? "bg-[var(--atria-primary)] text-white" : "bg-[var(--atria-primary)]/5 text-[var(--atria-primary)]"}`}
                  >
                    Conjuntos
                  </button>
                </div>
                <EntityTable
                  rows={level === "campaigns" ? report.data.campaigns : report.data.adSets}
                  currency={currency}
                  nameLabel={level === "campaigns" ? "Campanha" : "Conjunto"}
                />
              </SectionCard>
            ) : null}

            {section === "ads" ? (
              <CreativeGrid ads={report.data.ads} currency={currency} />
            ) : null}

            {section === "audience" ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <SectionCard title="Idade e gênero" description="Onde o gasto e o retorno se concentram.">
                  <BreakdownList rows={report.data.demographics} currency={currency} />
                </SectionCard>
                <SectionCard title="País" description="Os doze países com maior investimento.">
                  <BreakdownList rows={report.data.countries} currency={currency} />
                </SectionCard>
                <SectionCard title="Dispositivo">
                  <BreakdownList rows={report.data.devices} currency={currency} />
                </SectionCard>
              </div>
            ) : null}

            {section === "placement" ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <SectionCard title="Facebook e Instagram">
                  <BreakdownList rows={report.data.platforms} currency={currency} />
                </SectionCard>
                <SectionCard
                  title="Posicionamento"
                  description="Feed, Stories, Reels e Audience Network."
                >
                  <BreakdownList rows={report.data.placements} currency={currency} />
                </SectionCard>
              </div>
            ) : null}

            {section === "funnel" ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <SectionCard
                  title="Da impressão à compra"
                  description="A taxa é o quanto passou da etapa anterior."
                >
                  <Funnel steps={report.data.funnel} />
                </SectionCard>
                <SectionCard
                  title="Vídeo"
                  description="Pessoas que assistiram 25%, 50%, 75% e 100%."
                >
                  <Funnel
                    steps={[
                      { key: "p25", label: "25%", value: report.data.overview.videoP25, rateFromPrevious: null, rateFromStart: null },
                      { key: "p50", label: "50%", value: report.data.overview.videoP50, rateFromPrevious: null, rateFromStart: null },
                      { key: "p75", label: "75%", value: report.data.overview.videoP75, rateFromPrevious: null, rateFromStart: null },
                      { key: "p100", label: "100%", value: report.data.overview.videoP100, rateFromPrevious: null, rateFromStart: null },
                    ]}
                  />
                </SectionCard>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      ) : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  FINANCE_COLORS,
  formatChartMonth,
  formatCompactCurrency,
  formatCurrency,
  formatScopeLabel,
  getCurrentPeriod,
} from "@/lib/financial-utils";
import type { DashboardOverview } from "@/services/types";

interface FinanceWidgetProps {
  finance: DashboardOverview["finance"];
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function TrendBadge({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      }`}
    >
      <Icon className="size-3" />
      {isPositive ? "+" : ""}
      {value.toFixed(1)}% {label}
    </span>
  );
}

export function FinanceWidget({ finance }: FinanceWidgetProps) {
  const period = getCurrentPeriod();
  const currentMonthKey = `${period.year}-${String(period.month).padStart(2, "0")}`;
  const periodLabel = formatScopeLabel(period);

  const {
    chartData,
    profitMargin,
    revenueChange,
    expenseChange,
    bestMonth,
    monthsWithActivity,
  } = useMemo(() => {
    const enriched = finance.monthlyTrend.map((point) => ({
      ...point,
      label: formatChartMonth(point.month),
      net: point.income - point.expense,
    }));

    const last = enriched[enriched.length - 1];
    const prev = enriched[enriched.length - 2];

    const margin =
      finance.revenue > 0 ? (finance.netProfit / finance.revenue) * 100 : 0;

    const best = enriched.reduce(
      (acc, item) => (item.net > acc.net ? item : acc),
      enriched[0] ?? { label: "—", net: 0, month: "", income: 0, expense: 0 },
    );

    const activeMonths = enriched.filter(
      (item) =>
        item.month === currentMonthKey && (item.income > 0 || item.expense > 0),
    );

    return {
      chartData: enriched,
      profitMargin: margin,
      revenueChange: last && prev ? percentChange(last.income, prev.income) : 0,
      expenseChange:
        last && prev ? percentChange(last.expense, prev.expense) : 0,
      bestMonth: best,
      monthsWithActivity: activeMonths,
    };
  }, [finance, currentMonthKey]);

  const kpis = [
    {
      label: "Receita",
      value: formatCurrency(finance.revenue),
      icon: ArrowUpRight,
      colors: FINANCE_COLORS.income,
    },
    {
      label: "Despesas",
      value: formatCurrency(finance.expenses),
      icon: ArrowDownRight,
      colors: FINANCE_COLORS.expense,
    },
    {
      label: "Saldo líquido",
      value: formatCurrency(finance.netProfit),
      icon: Wallet,
      colors: FINANCE_COLORS.balance,
    },
    {
      label: "Margem",
      value: `${profitMargin.toFixed(1)}%`,
      icon: TrendingUp,
      colors: FINANCE_COLORS.pending,
      subtitle: "Sobre a receita",
    },
  ] as const;

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white shadow-sm">
      <div className="border-b border-[var(--atria-primary)]/8 bg-gradient-to-br from-[var(--atria-primary)]/[0.03] to-[var(--atria-accent)]/10 p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--atria-primary)] p-2.5 text-white shadow-sm">
              <Wallet className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--atria-primary)]">
                Financeiro
              </h2>
              <p className="text-xs text-[var(--atria-primary)]/50">
                {periodLabel}
              </p>
            </div>
          </div>
          <Link
            href="/financial"
            className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--atria-primary)]/10 bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--atria-primary)] transition-colors hover:bg-[var(--atria-primary)]/5"
          >
            Ver mais <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--atria-primary)]/45">
              Resultado do período
            </p>
            <p
              className={`text-3xl font-bold tracking-tight ${
                finance.netProfit >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {formatCurrency(finance.netProfit)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {finance.monthlyTrend.length >= 2 && (
              <>
                <TrendBadge value={revenueChange} label="receita" />
                <TrendBadge value={-expenseChange} label="despesas" />
              </>
            )}
            {bestMonth.net > 0 && (
              <span className="rounded-full bg-[var(--atria-primary)]/8 px-2 py-0.5 text-[10px] font-medium text-[var(--atria-primary)]">
                Melhor mês: {bestMonth.label}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 sm:p-6 sm:pt-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;

          return (
            <div
              key={kpi.label}
              className="rounded-xl border p-3"
              style={{
                borderColor: kpi.colors.border,
                backgroundColor: kpi.colors.bg,
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div
                  className="rounded-lg p-1.5"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.7)",
                    color: kpi.colors.dark,
                  }}
                >
                  <Icon className="size-3.5" />
                </div>
              </div>
              <p
                className="text-base font-bold leading-tight sm:text-lg"
                style={{ color: kpi.colors.dark }}
              >
                {kpi.value}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-[var(--atria-primary)]/55">
                {kpi.label}
              </p>
              {"subtitle" in kpi && kpi.subtitle && (
                <p className="text-[9px] text-[var(--atria-primary)]/40">
                  {kpi.subtitle}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex-1 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--atria-primary)]">
            Fluxo dos últimos meses
          </p>
          <div className="flex gap-3 text-[10px] text-[var(--atria-primary)]/50">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-500" />
              Receita
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-red-400" />
              Despesa
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <span className="size-2 rounded-full bg-violet-500" />
              Saldo
            </span>
          </div>
        </div>

        <div className="h-40 w-full sm:h-44">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} barGap={2}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(0,73,73,0.08)"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "rgba(0,73,73,0.55)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCompactCurrency(Number(v))}
                tick={{ fontSize: 10, fill: "rgba(0,73,73,0.45)" }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(
                    typeof value === "number" ? value : Number(value),
                  ),
                  name,
                ]}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid rgba(0,73,73,0.12)",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ display: "none" }} />
              <Bar
                dataKey="income"
                name="Receita"
                fill={FINANCE_COLORS.income.primary}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                dataKey="expense"
                name="Despesa"
                fill={FINANCE_COLORS.expense.primary}
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Area
                type="monotone"
                dataKey="net"
                name="Saldo"
                stroke={FINANCE_COLORS.balance.primary}
                fill={FINANCE_COLORS.balance.bg}
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {monthsWithActivity.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--atria-primary)]/45">
              Resumo mensal
            </p>
            <div className="space-y-2">
              {[...monthsWithActivity]
                .reverse()
                .slice(0, 4)
                .map((month) => {
                  const total = month.income + month.expense;
                  const incomePct =
                    total > 0 ? (month.income / total) * 100 : 50;

                  return (
                    <div
                      key={month.month}
                      className="rounded-xl border border-[var(--atria-primary)]/8 bg-[var(--atria-primary)]/[0.02] px-3 py-2"
                    >
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--atria-primary)]">
                          {month.label}
                        </span>
                        <span
                          className={`font-semibold ${
                            month.net >= 0 ? "text-emerald-700" : "text-red-600"
                          }`}
                        >
                          {formatCompactCurrency(month.net)}
                        </span>
                      </div>
                      <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--atria-primary)]/8">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${incomePct}%` }}
                        />
                        <div
                          className="h-full bg-red-400 transition-all"
                          style={{ width: `${100 - incomePct}%` }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-[var(--atria-primary)]/45">
                        <span>+ {formatCompactCurrency(month.income)}</span>
                        <span>- {formatCompactCurrency(month.expense)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--atria-primary)]/8 pt-4">
          <Link
            href="/financial/lancamentos?create=1"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--atria-primary)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--atria-primary)]/90"
            onClick={() => {
              // #region agent log
              fetch('http://127.0.0.1:7796/ingest/d0e4e72f-da91-4dd1-9779-2825ee7f66bc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e211ce'},body:JSON.stringify({sessionId:'e211ce',runId:'btn-pre',hypothesisId:'H5',location:'finance-widget.tsx:novoLink',message:'widget Novo lancamento click',data:{href:'/financial/lancamentos?create=1'},timestamp:Date.now()})}).catch(()=>{});
              // #endregion
            }}
          >
            <Plus className="size-3.5" />
            Novo lançamentossss
          </Link>
          <Link
            href="/financial"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--atria-primary)]/15 px-3 py-1.5 text-xs font-medium text-[var(--atria-primary)] transition-colors hover:bg-[var(--atria-primary)]/5"
          >
            Abrir financeiro
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

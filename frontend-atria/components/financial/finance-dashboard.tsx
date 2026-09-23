"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Filter,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, MONTH_NAMES_SHORT } from "@/lib/financial-utils";
import { financeService } from "@/services";
import type { ManagementDashboard } from "@/services/types";

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function defaultRange() {
  const now = new Date();
  return {
    from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: isoDate(now),
  };
}

function amountClass(value: number) {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-red-600";
  return "text-slate-800";
}

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

const HORIZON_PILL: Record<number, string> = {
  7: "bg-violet-100 text-violet-700",
  15: "bg-emerald-100 text-emerald-700",
  30: "bg-sky-100 text-sky-700",
};

const cardClass =
  "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export function FinanceDashboard() {
  const initial = defaultRange();
  const currentYear = new Date().getFullYear();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [applied, setApplied] = useState(initial);
  const [chartYear, setChartYear] = useState(currentYear);
  const [data, setData] = useState<ManagementDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const years = [0, 1, 2, 3].map((offset) => currentYear - offset);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    financeService
      .getManagementDashboard({ ...applied, chartYear })
      .then((dashboard) => {
        if (!cancelled) setData(dashboard);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applied, chartYear]);

  const overdueCount =
    (data?.overdue.incomeCount ?? 0) + (data?.overdue.expenseCount ?? 0);
  const chartData = (data?.monthly ?? []).map((item) => ({
    ...item,
    label: MONTH_NAMES_SHORT[Number(item.month.slice(5, 7)) - 1] ?? item.label,
  }));
  const hasBanks = (data?.banks.length ?? 0) > 0;
  const hasPaidBalance =
    hasBanks || Math.abs(data?.availableBalance ?? 0) > 0;
  const todayLabel = new Date().toLocaleDateString("pt-BR");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section data-tour="finance-balance" className={`${cardClass} p-5`}>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
            SALDO DISPONÍVEL
          </p>
          <p className="mt-1 text-sm text-slate-400">Somente lançamentos pagos</p>
          <p className={`mt-4 text-4xl font-bold tracking-tight ${amountClass(data?.availableBalance ?? 0)}`}>
            {formatCurrency(data?.availableBalance ?? 0)}
          </p>
          <p className={`mt-4 inline-flex items-center gap-1 text-sm font-medium ${(data?.availableBalance ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            <ArrowUpRight className="size-4" />
            {(data?.availableBalance ?? 0) >= 0 ? "Positivo" : "Negativo"}
          </p>
        </section>

        <section className={`${cardClass} flex min-h-40 flex-col p-5`}>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
            SALDO POR BANCO / CAIXA
          </p>
          <p className="mt-1 text-sm text-slate-400">Lançamentos pagos acumulados</p>
          {!hasPaidBalance ? (
            <p className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Sem lançamentos pagos registrados.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {data?.banks.map((bank) => (
                <li key={bank.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{bank.name}</span>
                  <span className={`font-semibold ${amountClass(bank.balance)}`}>
                    {formatCurrency(bank.balance)}
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Caixa</span>
                <span className={`font-semibold ${amountClass(hasBanks ? (data?.unassignedBalance ?? 0) : (data?.availableBalance ?? 0))}`}>
                  {formatCurrency(hasBanks ? (data?.unassignedBalance ?? 0) : (data?.availableBalance ?? 0))}
                </span>
              </li>
            </ul>
          )}
        </section>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-rose-500">
          <span className="size-1.5 rounded-full bg-rose-500" />
          VISÃO ATUAL
        </p>
        <div className="grid gap-4 xl:grid-cols-2">
          <section className={`${cardClass} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-800">Contas em atraso</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                <TrendingUp className="size-3.5" />
                {overdueCount} atrasados
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-emerald-600">
                  <ArrowUpRight className="size-3.5" />
                  RECEITAS ATRASADAS
                </p>
                <p className="mt-3 text-2xl font-bold text-emerald-600">
                  {formatCurrency(data?.overdue.incomeAmount ?? 0)}
                </p>
                <p className="mt-3 inline-flex rounded-full bg-white px-2 py-0.5 text-xs text-emerald-700">
                  {data?.overdue.incomeCount ?? 0} vencidas
                </p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-rose-600">
                  <ArrowDownRight className="size-3.5" />
                  DESPESAS ATRASADAS
                </p>
                <p className="mt-3 text-2xl font-bold text-rose-600">
                  {formatCurrency(data?.overdue.expenseAmount ?? 0)}
                </p>
                <p className="mt-3 inline-flex rounded-full bg-white px-2 py-0.5 text-xs text-rose-700">
                  {data?.overdue.expenseCount ?? 0} vencidas
                </p>
              </div>
            </div>
          </section>

          <section className={`${cardClass} p-5`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-slate-800">Projeção de Fluxo de Caixa</h2>
              <p className="text-xs text-slate-400">a partir de {todayLabel}</p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] tracking-wide text-slate-400">
                    <th className="py-2 text-left font-semibold">HORIZONTE</th>
                    <th className="py-2 text-right font-semibold text-emerald-600">ENTRADAS</th>
                    <th className="py-2 text-right font-semibold text-rose-500">SAÍDAS</th>
                    <th className="py-2 text-right font-semibold text-slate-500">= SALDO</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.projection.map((row) => (
                    <tr key={row.days} className="border-t border-slate-100">
                      <td className="py-2.5">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${HORIZON_PILL[row.days]}`}>
                          {row.days} dias
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-medium text-emerald-600">
                        {formatCurrency(row.income)}
                      </td>
                      <td className="py-2.5 text-right font-medium text-rose-500">
                        {formatCurrency(row.expense)}
                      </td>
                      <td className={`py-2.5 text-right font-semibold ${amountClass(row.balance)}`}>
                        {formatCurrency(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className={`${cardClass} p-5`}>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
            PEO DO PERÍODO
          </p>
          <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
            {formatCurrency(data?.breakEven ?? 0)}
          </p>
          <p className={`mt-4 inline-flex items-center gap-1.5 text-sm font-medium ${data?.aboveEquilibrium ? "text-emerald-600" : "text-rose-600"}`}>
            <Check className="size-4" />
            {data?.aboveEquilibrium ? "Acima do equilíbrio" : "Abaixo do equilíbrio"}
          </p>
        </section>
        <section className={`${cardClass} p-5`}>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
            RENTABILIDADE DO PERÍODO
          </p>
          <p className={`mt-3 text-4xl font-bold tracking-tight ${amountClass(data?.profitability ?? 0)}`}>
            {formatPercent(data?.profitability ?? 0)}
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <Check className="size-4" />
            Lucro líquido / Faturamento
          </p>
        </section>
      </div>

      <section data-tour="finance-period-filter" className={`${cardClass} p-5`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
            <Filter className="size-4" />
            Filtro de período
          </p>
          <p className="text-sm text-slate-400">
            {formatDisplayDate(applied.from)} – {formatDisplayDate(applied.to)}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-wide text-slate-400">
            DATA INICIAL
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold tracking-wide text-slate-400">
            DATA FINAL
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <Button
            type="button"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => setApplied({ from, to })}
            disabled={loading}
          >
            Buscar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const range = defaultRange();
              setFrom(range.from);
              setTo(range.to);
              setApplied(range);
            }}
          >
            Limpar
          </Button>
        </div>
      </section>

      <section className={`${cardClass} p-5`}>
        <h2 className="font-semibold text-slate-800">Análise</h2>
        <p className="text-sm text-slate-400">Demonstração do Resultado — período filtrado</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {data?.statement.map((line, index) => {
                const isLast = index === (data.statement.length ?? 0) - 1;
                return (
                  <tr
                    key={line.label}
                    className={
                      isLast
                        ? "bg-emerald-50 font-semibold"
                        : line.emphasize
                          ? "bg-slate-50 font-medium"
                          : "border-t border-slate-100"
                    }
                  >
                    <td className="px-3 py-3 text-slate-700">{line.label}</td>
                    <td className={`px-3 py-3 text-right ${amountClass(line.percent)}`}>
                      {formatPercent(line.percent)}
                    </td>
                    <td className={`px-3 py-3 text-right font-semibold ${amountClass(line.amount)}`}>
                      {formatCurrency(line.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${cardClass} p-5`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-800">Histórico</h2>
          <div className="flex gap-1">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setChartYear(year)}
                className={
                  chartYear === year
                    ? "rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                    : "rounded-full px-3 py-1 text-xs font-medium text-slate-400 hover:bg-slate-100"
                }
              >
                {year}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Fluxo de Caixa por Mês</h3>
              <span className="text-xs text-slate-400">{chartYear}</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.25)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="expense" name="Despesas" fill="#FB7185" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Line type="monotone" dataKey="result" name="Resultado" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              Receitas vs Despesas
              <span className="ml-2 text-xs font-normal text-slate-400">Mês a mês — {chartYear}</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.25)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="income" name="Rec." stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="expense" name="Des." stroke="#FB7185" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

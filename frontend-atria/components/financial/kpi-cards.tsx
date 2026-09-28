"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  FINANCE_COLORS,
  MONTH_NAMES_LONG,
  formatCurrency,
} from "@/lib/financial-utils";
import type { FinanceOverview } from "@/services/types";

type KpiKey =
  | "totalRevenue"
  | "totalExpenses"
  | "netProfit"
  | "pendingReceivables"
  | "pendingPayables";

interface KpiCardsProps {
  overview: FinanceOverview;
  hrefFor?: (key: KpiKey) => string;
}

function getPeriodLabel(overview: FinanceOverview) {
  const period = overview.period;
  if (!period) return "";

  const { month, year } = period;
  if (month) {
    return `${MONTH_NAMES_LONG[month - 1]} ${year}`;
  }
  return String(year);
}

const KPI_CONFIG: {
  key: KpiKey;
  label: string;
  icon: typeof ArrowUpRight;
  color: (typeof FINANCE_COLORS)[keyof typeof FINANCE_COLORS];
  getValue: (overview: FinanceOverview) => string;
  subtitle: (overview: FinanceOverview) => string;
}[] = [
  {
    key: "totalRevenue",
    label: "Receita",
    icon: ArrowUpRight,
    color: FINANCE_COLORS.income,
    getValue: (overview) => formatCurrency(overview.totalRevenue),
    subtitle: (overview) => `Faturamento em ${getPeriodLabel(overview)}`,
  },
  {
    key: "totalExpenses",
    label: "Despesas",
    icon: ArrowDownRight,
    color: FINANCE_COLORS.expense,
    getValue: (overview) => formatCurrency(overview.totalExpenses),
    subtitle: (overview) => `Custos e gastos em ${getPeriodLabel(overview)}`,
  },
  {
    key: "netProfit",
    label: "Resultado",
    icon: TrendingUp,
    color: FINANCE_COLORS.balance,
    getValue: (overview) => formatCurrency(overview.netProfit),
    subtitle: (overview) => `Receita − despesas em ${getPeriodLabel(overview)}`,
  },
  {
    key: "pendingReceivables",
    label: "A receber",
    icon: ArrowUpRight,
    color: FINANCE_COLORS.income,
    getValue: (overview) => formatCurrency(overview.pendingReceivables),
    subtitle: (overview) => `Pendências em ${getPeriodLabel(overview)}`,
  },
  {
    key: "pendingPayables",
    label: "A pagar",
    icon: ArrowDownRight,
    color: FINANCE_COLORS.expense,
    getValue: (overview) => formatCurrency(overview.pendingPayables),
    subtitle: (overview) => `Pendências em ${getPeriodLabel(overview)}`,
  },
];

export function KpiCards({ overview, hrefFor }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {KPI_CONFIG.map((kpi) => {
        const Icon = kpi.icon;
        const href = hrefFor?.(kpi.key);
        const card = (
          <Card
            className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm ${
              href
                ? "cursor-pointer transition hover:scale-[1.01] hover:shadow-md"
                : ""
            }`}
            style={{
              borderColor: kpi.color.border,
              boxShadow: `0 10px 30px -18px ${kpi.color.glow}`,
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{
                background: `linear-gradient(90deg, ${kpi.color.primary}, ${kpi.color.dark})`,
              }}
            />

            <div
              className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full blur-2xl"
              style={{ backgroundColor: kpi.color.bg }}
            />

            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div
                  className="rounded-xl p-2.5"
                  style={{
                    backgroundColor: kpi.color.bg,
                    color: kpi.color.dark,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: kpi.color.bg,
                    color: kpi.color.dark,
                  }}
                >
                  {kpi.label}
                </span>
              </div>

              <p
                className="text-2xl font-bold tracking-tight"
                style={{ color: kpi.color.dark }}
              >
                {kpi.getValue(overview)}
              </p>
              <p className="mt-1 text-xs font-medium text-[var(--atria-primary)]/55">
                {kpi.subtitle(overview)}
              </p>
              {href ? (
                <p className="mt-2 text-[11px] font-medium text-[var(--atria-primary)]/40">
                  Ver lançamentos
                </p>
              ) : null}
            </div>
          </Card>
        );

        if (!href) return <div key={kpi.key}>{card}</div>;

        return (
          <Link
            key={kpi.key}
            href={href}
            className="rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--atria-primary)]"
          >
            {card}
          </Link>
        );
      })}
    </div>
  );
}

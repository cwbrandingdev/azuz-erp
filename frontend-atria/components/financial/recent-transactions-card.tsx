"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatDate,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/financial-utils";
import type { FinanceTransaction } from "@/services/types";

interface RecentTransactionsCardProps {
  transactions: FinanceTransaction[];
  href: string;
  periodLabel: string;
  loading?: boolean;
}

export function RecentTransactionsCard({
  transactions,
  href,
  periodLabel,
  loading,
}: RecentTransactionsCardProps) {
  return (
    <section
      data-tour="finance-recent"
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-800">Últimos lançamentos</h2>
          <p className="text-sm text-slate-400">
            Movimentações mais recentes de {periodLabel.toLowerCase()}
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:underline"
        >
          Ver todos
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
          Nenhum lançamento em {periodLabel.toLowerCase()}.{" "}
          <Link href={`${href}${href.includes("?") ? "&" : "?"}create=1`} className="font-medium text-violet-700 hover:underline">
            Registrar o primeiro
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {transactions.map((transaction) => (
            <li
              key={transaction.id}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">
                  {transaction.title?.trim() || transaction.description}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {formatDate(transaction.date)} · {transaction.category}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge className={STATUS_STYLES[transaction.status]} variant="outline">
                  {STATUS_LABELS[transaction.status]}
                </Badge>
                <span
                  className={`font-semibold ${
                    transaction.type === "income"
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {transaction.type === "expense" ? "−" : "+"}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

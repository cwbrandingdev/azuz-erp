"use client";

import { useState } from "react";
import { LayoutDashboard, Table2 } from "lucide-react";
import { FinanceDashboard } from "@/components/financial/finance-dashboard";
import { FinanceScopeSwitcher } from "@/components/financial/finance-scope-switcher";
import { FinanceSheetView } from "@/components/financial/finance-sheet-view";
import { FinanceSubnav } from "@/components/financial/finance-subnav";
import { KpiCards } from "@/components/financial/kpi-cards";
import { MonthSwitcher } from "@/components/financial/month-switcher";
import { RecentTransactionsCard } from "@/components/financial/recent-transactions-card";
import { TransactionDialog } from "@/components/financial/transaction-dialog";
import { TransactionsImportDialog } from "@/components/financial/transactions-import-dialog";
import { Button } from "@/components/ui/button";
import { useFinanceOverview } from "@/hooks/use-finance";
import { useInvalidateFinance } from "@/hooks/use-query-invalidation";
import {
  buildLancamentosHref,
  formatScopeLabel,
  getCurrentScope,
  scopeToPeriod,
  type FinanceScope,
} from "@/lib/financial-utils";
import { financeService } from "@/services";
import type { FinanceTransaction } from "@/services/types";

export default function FinancialPage() {
  const [scope, setScope] = useState<FinanceScope>(getCurrentScope);
  const [viewMode, setViewMode] = useState<"dashboard" | "sheet">("dashboard");
  const [sheetEpoch, setSheetEpoch] = useState(0);
  const sheetPeriod = scopeToPeriod(scope);
  const invalidateFinance = useInvalidateFinance();
  const overviewQuery = useFinanceOverview(scope.year, scope.month);
  const overview = overviewQuery.data;
  const loadingOverview = overviewQuery.isPending && !overview;

  function handleRefresh() {
    void invalidateFinance();
    setSheetEpoch((current) => current + 1);
  }

  function handleTransactionSaved(_transaction: FinanceTransaction) {
    handleRefresh();
  }

  function handleMarkAsPaid(transaction: FinanceTransaction) {
    void financeService
      .markTransactionAsPaid(transaction.id)
      .finally(() => handleRefresh());
  }

  function handleDelete(transaction: FinanceTransaction) {
    void financeService
      .deleteTransaction(transaction.id)
      .finally(() => handleRefresh());
  }

  const lancamentosHref = buildLancamentosHref({
    year: scope.year,
    month: scope.month,
  });

  const viewToggle = (
    <div
      data-tour="finance-view-toggle"
      className="flex gap-1 rounded-xl border border-[var(--atria-primary)]/15 bg-white p-0.5"
    >
      <Button
        type="button"
        variant={viewMode === "dashboard" ? "default" : "ghost"}
        size="sm"
        className={
          viewMode === "dashboard"
            ? "rounded-lg bg-[var(--atria-primary)] text-white"
            : "rounded-lg text-[var(--atria-primary)]"
        }
        onClick={() => setViewMode("dashboard")}
        aria-pressed={viewMode === "dashboard"}
      >
        <LayoutDashboard className="size-4" />
        Visão geral
      </Button>
      <Button
        type="button"
        variant={viewMode === "sheet" ? "default" : "ghost"}
        size="sm"
        className={
          viewMode === "sheet"
            ? "rounded-lg bg-[var(--atria-primary)] text-white"
            : "rounded-lg text-[var(--atria-primary)]"
        }
        onClick={() => setViewMode("sheet")}
        aria-pressed={viewMode === "sheet"}
      >
        <Table2 className="size-4" />
        Modo planilha
      </Button>
    </div>
  );

  if (viewMode === "sheet") {
    return (
      <div className="flex flex-col gap-4">
        <FinanceSubnav />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
              Modo planilha
            </h1>
            <MonthSwitcher
              period={sheetPeriod}
              onChange={(period) =>
                setScope({ year: period.year, month: period.month })
              }
              compact
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {viewToggle}
            <TransactionsImportDialog onSuccess={handleRefresh} />
            <TransactionDialog onSuccess={handleTransactionSaved} />
          </div>
        </div>
        <FinanceSheetView
          period={sheetPeriod}
          reloadSignal={sheetEpoch}
          onTransactionSaved={handleTransactionSaved}
          onMarkAsPaid={handleMarkAsPaid}
          onDelete={handleDelete}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FinanceSubnav />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
              Visão comercial
            </h1>
            <p className="text-sm text-[var(--atria-primary)]/50">
              Resultado de {formatScopeLabel(scope).toLowerCase()} — receitas,
              despesas e o que ainda está em aberto
            </p>
          </div>
          <FinanceScopeSwitcher scope={scope} onChange={setScope} compact />
        </div>
        <div className="flex flex-wrap gap-2">
          {viewToggle}
          <TransactionsImportDialog onSuccess={handleRefresh} />
          <TransactionDialog onSuccess={handleTransactionSaved} />
        </div>
      </div>

      <div data-tour="finance-kpi">
        {overview ? (
          <KpiCards
            overview={overview}
            hrefFor={(key) => {
              if (key === "totalRevenue") {
                return buildLancamentosHref({
                  year: scope.year,
                  month: scope.month,
                  type: "income",
                });
              }
              if (key === "totalExpenses") {
                return buildLancamentosHref({
                  year: scope.year,
                  month: scope.month,
                  type: "expense",
                });
              }
              if (key === "pendingReceivables") {
                return buildLancamentosHref({
                  year: scope.year,
                  month: scope.month,
                  type: "income",
                  status: "pending",
                });
              }
              if (key === "pendingPayables") {
                return buildLancamentosHref({
                  year: scope.year,
                  month: scope.month,
                  type: "expense",
                  status: "pending",
                });
              }
              return lancamentosHref;
            }}
          />
        ) : loadingOverview ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-2xl border border-[var(--atria-primary)]/10 bg-white"
              />
            ))}
          </div>
        ) : null}
      </div>

      <RecentTransactionsCard
        transactions={overview?.recentTransactions ?? []}
        href={lancamentosHref}
        periodLabel={formatScopeLabel(scope)}
        loading={loadingOverview}
      />

      <FinanceDashboard year={scope.year} />
    </div>
  );
}

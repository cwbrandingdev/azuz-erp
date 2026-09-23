"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CashFlowChart } from "@/components/financial/cash-flow-chart";
import { ExpenseDistributionChart } from "@/components/financial/expense-distribution-chart";
import { FiltersToolbar } from "@/components/financial/filters-toolbar";
import { KpiCards } from "@/components/financial/kpi-cards";
import { MonthSwitcher } from "@/components/financial/month-switcher";
import { TransactionsTable } from "@/components/financial/transactions-table";
import {
  getCurrentPeriod,
  getMonthBounds,
  type FinancePeriod,
} from "@/lib/financial-utils";
import {
  getLegacyCategories,
  getLegacyFinanceOverview,
  getLegacyTransactions,
} from "@/services/finance.service";
import type {
  FinanceCategory,
  FinanceOverview,
  PaginatedTransactions,
  TransactionFilters,
} from "@/services/types";

const emptyPaginated: PaginatedTransactions = {
  data: [],
  meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
};

function buildDefaultFilters(period: FinancePeriod): TransactionFilters {
  const { startDate, endDate } = getMonthBounds(period);

  return {
    search: "",
    categoryIds: [],
    status: "",
    type: "",
    startDate,
    endDate,
    sortBy: "date",
    sortOrder: "asc",
  };
}

export default function LegacyFinancialPage() {
  const [period, setPeriod] = useState<FinancePeriod>(getCurrentPeriod);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [transactions, setTransactions] =
    useState<PaginatedTransactions>(emptyPaginated);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFilters>(() =>
    buildDefaultFilters(getCurrentPeriod()),
  );
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await getLegacyCategories());
    } catch {
      setCategories([]);
    }
  }, []);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      setOverview(
        await getLegacyFinanceOverview({
          month: period.month,
          year: period.year,
        }),
      );
    } catch {
      setOverview(null);
    } finally {
      setLoadingOverview(false);
    }
  }, [period.month, period.year]);

  const transactionQuery = useMemo(
    () => ({
      page,
      limit: 100,
      search: debouncedSearch || undefined,
      categoryIds:
        filters.categoryIds.length > 0 ? filters.categoryIds : undefined,
      status: filters.status || undefined,
      type: filters.type || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    }),
    [page, debouncedSearch, filters],
  );

  const loadTransactions = useCallback(async () => {
    setLoadingTransactions(true);
    try {
      setTransactions(await getLegacyTransactions(transactionQuery));
    } catch {
      setTransactions(emptyPaginated);
    } finally {
      setLoadingTransactions(false);
    }
  }, [transactionQuery]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  function handlePeriodChange(nextPeriod: FinancePeriod) {
    setPeriod(nextPeriod);
    setPage(1);
    setFilters((current) => ({
      ...current,
      ...getMonthBounds(nextPeriod),
    }));
  }

  if (loadingOverview && !overview) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
          Financeiro antigo
        </h1>
        <p className="text-sm text-[var(--atria-primary)]/50">
          Receitas, despesas e fluxo de caixa do livro original
        </p>
      </div>

      <MonthSwitcher period={period} onChange={handlePeriodChange} />

      {overview && <KpiCards overview={overview} />}

      {overview && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <CashFlowChart
            key={overview.monthlyCashFlow
              .map((item) => `${item.month}:${item.income}:${item.expense}`)
              .join("|")}
            data={overview.monthlyCashFlow}
            period={period}
          />
          <ExpenseDistributionChart data={overview.expenseByCategory} />
        </div>
      )}

      <FiltersToolbar
        filters={filters}
        categories={categories}
        onChange={(nextFilters) => {
          setFilters(nextFilters);
          setPage(1);
        }}
        onClear={() => {
          setFilters(buildDefaultFilters(period));
          setPage(1);
        }}
      />

      <TransactionsTable
        transactions={transactions}
        filters={filters}
        onSortChange={(sortBy, sortOrder) => {
          setFilters((current) => ({ ...current, sortBy, sortOrder }));
          setPage(1);
        }}
        onPageChange={setPage}
        onRefresh={() => {
          void loadTransactions();
        }}
        loading={loadingTransactions && transactions.data.length === 0}
        readOnly
      />
    </div>
  );
}

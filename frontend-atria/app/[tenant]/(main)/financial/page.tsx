"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KpiCards } from "@/components/financial/kpi-cards";
import { CashFlowChart } from "@/components/financial/cash-flow-chart";
import { ExpenseDistributionChart } from "@/components/financial/expense-distribution-chart";
import { TransactionsTable } from "@/components/financial/transactions-table";
import { TransactionDialog } from "@/components/financial/transaction-dialog";
import { TransactionsImportDialog } from "@/components/financial/transactions-import-dialog";
import { CategoryManagementDrawer } from "@/components/financial/category-management-drawer";
import { FiltersToolbar } from "@/components/financial/filters-toolbar";
import { MonthSwitcher } from "@/components/financial/month-switcher";
import { financeService } from "@/services";
import {
  getCurrentPeriod,
  getMonthBounds,
  type FinancePeriod,
} from "@/lib/financial-utils";
import type {
  FinanceCategory,
  FinanceOverview,
  FinanceTransaction,
  PaginatedTransactions,
  SortOrder,
  TransactionFilters,
  TransactionSortField,
} from "@/services/types";

const emptyPaginated: PaginatedTransactions = {
  data: [],
  meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
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
    sortOrder: "desc",
  };
}

function applyPaidToOverview(
  overview: FinanceOverview,
  transaction: FinanceTransaction,
): FinanceOverview {
  const amount = transaction.amount;
  const next = { ...overview };

  if (transaction.type === "income") {
    next.pendingReceivables = Math.max(0, next.pendingReceivables - amount);
    next.totalRevenue += amount;
  } else {
    next.pendingPayables = Math.max(0, next.pendingPayables - amount);
    next.totalExpenses += amount;
  }

  next.netProfit = next.totalRevenue - next.totalExpenses;
  next.profitMargin =
    next.totalRevenue > 0
      ? Math.round((next.netProfit / next.totalRevenue) * 10000) / 100
      : 0;

  return next;
}

function applyCreatedTransactionToOverview(
  overview: FinanceOverview,
  transaction: FinanceTransaction,
): FinanceOverview {
  const amount = transaction.amount;
  const next = { ...overview };

  if (transaction.status === "paid") {
    if (transaction.type === "income") {
      next.totalRevenue += amount;
    } else {
      next.totalExpenses += amount;
    }
  } else {
    if (transaction.type === "income") {
      next.pendingReceivables += amount;
    } else {
      next.pendingPayables += amount;
    }
  }

  next.netProfit = next.totalRevenue - next.totalExpenses;
  next.profitMargin =
    next.totalRevenue > 0
      ? Math.round((next.netProfit / next.totalRevenue) * 10000) / 100
      : 0;

  next.monthlyCashFlow = applyTransactionToMonthlyCashFlow(
    overview.monthlyCashFlow,
    transaction,
    "add",
  );
  next.expenseByCategory = applyTransactionToExpenseByCategory(
    overview.expenseByCategory,
    transaction,
    "add",
  );

  return next;
}

function applyDeletedTransactionToOverview(
  overview: FinanceOverview,
  transaction: FinanceTransaction,
): FinanceOverview {
  const amount = transaction.amount;
  const next = { ...overview };

  if (transaction.status === "paid") {
    if (transaction.type === "income") {
      next.totalRevenue = Math.max(0, next.totalRevenue - amount);
    } else {
      next.totalExpenses = Math.max(0, next.totalExpenses - amount);
    }
  } else {
    if (transaction.type === "income") {
      next.pendingReceivables = Math.max(0, next.pendingReceivables - amount);
    } else {
      next.pendingPayables = Math.max(0, next.pendingPayables - amount);
    }
  }

  next.netProfit = next.totalRevenue - next.totalExpenses;
  next.profitMargin =
    next.totalRevenue > 0
      ? Math.round((next.netProfit / next.totalRevenue) * 10000) / 100
      : 0;

  next.monthlyCashFlow = applyTransactionToMonthlyCashFlow(
    overview.monthlyCashFlow,
    transaction,
    "remove",
  );
  next.expenseByCategory = applyTransactionToExpenseByCategory(
    overview.expenseByCategory,
    transaction,
    "remove",
  );

  return next;
}

function affectsMonthlyCashFlow(transaction: FinanceTransaction) {
  return transaction.status === "paid" || transaction.status === "pending";
}

function applyTransactionToMonthlyCashFlow(
  monthlyCashFlow: FinanceOverview["monthlyCashFlow"],
  transaction: FinanceTransaction,
  mode: "add" | "remove",
) {
  if (!affectsMonthlyCashFlow(transaction)) {
    return monthlyCashFlow;
  }

  const monthKey = transaction.date.slice(0, 7);
  const delta = mode === "add" ? transaction.amount : -transaction.amount;

  return monthlyCashFlow.map((item) => {
    if (item.month !== monthKey) return item;

    if (transaction.type === "income") {
      return {
        ...item,
        income: Math.max(0, item.income + delta),
      };
    }

    return {
      ...item,
      expense: Math.max(0, item.expense + delta),
    };
  });
}

function applyTransactionToExpenseByCategory(
  expenseByCategory: FinanceOverview["expenseByCategory"],
  transaction: FinanceTransaction,
  mode: "add" | "remove",
) {
  if (transaction.type !== "expense" || !affectsMonthlyCashFlow(transaction)) {
    return expenseByCategory;
  }

  const delta = mode === "add" ? transaction.amount : -transaction.amount;
  const existing = expenseByCategory.find(
    (item) => item.categoryId === transaction.categoryId,
  );

  if (existing) {
    return expenseByCategory
      .map((item) =>
        item.categoryId === transaction.categoryId
          ? { ...item, amount: Math.max(0, item.amount + delta) }
          : item,
      )
      .filter((item) => item.amount > 0);
  }

  if (mode === "remove") {
    return expenseByCategory;
  }

  return [
    ...expenseByCategory,
    {
      categoryId: transaction.categoryId,
      categoryName: transaction.category,
      amount: transaction.amount,
      color: transaction.categoryColor ?? "#8B5CF6",
    },
  ];
}

function transactionMatchesFilters(
  transaction: FinanceTransaction,
  filters: TransactionFilters,
  search: string,
): boolean {
  const txDate = transaction.date.slice(0, 10);

  if (filters.startDate && txDate < filters.startDate) return false;
  if (filters.endDate && txDate > filters.endDate) return false;
  if (
    filters.categoryIds.length > 0 &&
    !filters.categoryIds.includes(transaction.categoryId)
  ) {
    return false;
  }
  if (filters.status && transaction.status !== filters.status) return false;
  if (filters.type && transaction.type !== filters.type) return false;

  const normalizedSearch = search.trim().toLowerCase();
  if (
    normalizedSearch &&
    !transaction.description.toLowerCase().includes(normalizedSearch)
  ) {
    return false;
  }

  return true;
}

function sortTransactions(
  data: FinanceTransaction[],
  sortBy: TransactionSortField,
  sortOrder: SortOrder,
): FinanceTransaction[] {
  const sorted = [...data];

  sorted.sort((left, right) => {
    let comparison = 0;

    switch (sortBy) {
      case "amount":
        comparison = left.amount - right.amount;
        break;
      case "description":
        comparison = left.description.localeCompare(right.description, "pt-BR");
        break;
      case "status":
        comparison = left.status.localeCompare(right.status, "pt-BR");
        break;
      case "date":
      default:
        comparison = left.date.localeCompare(right.date);
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return sorted;
}

function upsertTransactionInList(
  current: PaginatedTransactions,
  transaction: FinanceTransaction,
  sortBy: TransactionSortField,
  sortOrder: SortOrder,
): PaginatedTransactions {
  const exists = current.data.some((item) => item.id === transaction.id);
  const merged = exists
    ? current.data.map((item) =>
        item.id === transaction.id ? transaction : item,
      )
    : [...current.data, transaction];

  const sorted = sortTransactions(merged, sortBy, sortOrder);
  const limit = current.meta.limit;
  const page = current.meta.page;
  const start = (page - 1) * limit;
  const nextTotal = exists ? current.meta.total : current.meta.total + 1;

  return {
    data: sorted.slice(start, start + limit),
    meta: {
      ...current.meta,
      total: nextTotal,
      totalPages: Math.max(1, Math.ceil(nextTotal / limit)),
    },
  };
}

export default function FinancialPage() {
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
      const data = await financeService.getCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    }
  }, []);

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setLoadingOverview(true);
    try {
      const data = await financeService.getFinanceOverview({
        month: period.month,
        year: period.year,
      });
      setOverview(data);
    } catch {
      if (!silent) setOverview(null);
    } finally {
      if (!silent) setLoadingOverview(false);
    }
  }, [period.month, period.year]);

  const transactionQuery = useMemo(
    () => ({
      page,
      limit: 10,
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

  const loadTransactions = useCallback(async (silent = false) => {
    if (!silent) setLoadingTransactions(true);
    try {
      const data = await financeService.getTransactions(transactionQuery);
      setTransactions(data);
    } catch {
      if (!silent) setTransactions(emptyPaginated);
    } finally {
      if (!silent) setLoadingTransactions(false);
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

  function handleRefresh() {
    void loadCategories();
    void loadOverview(true);
    void loadTransactions(true);
  }

  function handleTransactionSaved(
    transaction: FinanceTransaction,
    mode: "create" | "update",
  ) {
    if (
      page === 1 &&
      transactionMatchesFilters(transaction, filters, debouncedSearch)
    ) {
      setTransactions((current) =>
        upsertTransactionInList(
          current,
          transaction,
          filters.sortBy,
          filters.sortOrder,
        ),
      );
    }

    if (mode === "create") {
      setOverview((current) =>
        current
          ? applyCreatedTransactionToOverview(current, transaction)
          : current,
      );
    }

    void loadOverview(true);
    void loadTransactions(true);
  }

  function handleOptimisticMarkPaid(transaction: FinanceTransaction) {
    setTransactions((current) => ({
      ...current,
      data: current.data.map((item) =>
        item.id === transaction.id ? { ...item, status: "paid" as const } : item,
      ),
    }));

    setOverview((current) =>
      current ? applyPaidToOverview(current, transaction) : current,
    );

    void financeService
      .markTransactionAsPaid(transaction.id)
      .then(() => {
        void loadOverview(true);
        void loadTransactions(true);
      })
      .catch(() => {
        void loadOverview(true);
        void loadTransactions(true);
      });
  }

  function handleOptimisticDelete(transaction: FinanceTransaction) {
    setTransactions((current) => ({
      ...current,
      data: current.data.filter((item) => item.id !== transaction.id),
      meta: {
        ...current.meta,
        total: Math.max(0, current.meta.total - 1),
      },
    }));

    setOverview((current) =>
      current ? applyDeletedTransactionToOverview(current, transaction) : current,
    );

    void financeService
      .deleteTransaction(transaction.id)
      .then(() => {
        void loadOverview(true);
        void loadTransactions(true);
      })
      .catch(() => {
        void loadTransactions(true);
        void loadOverview(true);
      });
  }

  function handleFiltersChange(nextFilters: TransactionFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  function handleClearFilters() {
    setFilters(buildDefaultFilters(period));
    setPage(1);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
            Financeiro
          </h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Receitas, despesas e fluxo de caixa com visão mensal
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CategoryManagementDrawer onCategoriesChange={handleRefresh} />
          <TransactionsImportDialog onSuccess={handleRefresh} />
          <TransactionDialog onSuccess={handleTransactionSaved} />
        </div>
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
        onChange={handleFiltersChange}
        onClear={handleClearFilters}
      />

      <TransactionsTable
        transactions={transactions}
        filters={filters}
        onSortChange={(sortBy, sortOrder) =>
          handleFiltersChange({ ...filters, sortBy, sortOrder })
        }
        onPageChange={setPage}
        onRefresh={handleRefresh}
        onTransactionSaved={handleTransactionSaved}
        onMarkAsPaid={handleOptimisticMarkPaid}
        onDelete={handleOptimisticDelete}
        loading={loadingTransactions && transactions.data.length === 0}
      />
    </div>
  );
}

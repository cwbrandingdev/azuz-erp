"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BankAccountsDialog } from "@/components/financial/bank-accounts-dialog";
import { FiltersToolbar } from "@/components/financial/filters-toolbar";
import { FinanceScopeSwitcher } from "@/components/financial/finance-scope-switcher";
import { FinanceSubnav } from "@/components/financial/finance-subnav";
import { TransactionDialog } from "@/components/financial/transaction-dialog";
import { TransactionsImportDialog } from "@/components/financial/transactions-import-dialog";
import { TransactionsTable } from "@/components/financial/transactions-table";
import {
  buildLancamentosHref,
  formatScopeLabel,
  getCurrentScope,
  getScopeBounds,
  type FinanceScope,
} from "@/lib/financial-utils";
import { financeService } from "@/services";
import type {
  FinanceCategory,
  FinanceTransaction,
  PaginatedTransactions,
  SortOrder,
  TransactionFilters,
  TransactionSortField,
} from "@/services/types";

const emptyPaginated: PaginatedTransactions = {
  data: [],
  meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
};

function parseScope(searchParams: URLSearchParams): FinanceScope {
  const current = getCurrentScope();
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const year = Number(yearParam) || current.year;

  if (monthParam === "all") {
    return { year, month: null };
  }

  const monthValue = Number(monthParam);
  if (monthValue >= 1 && monthValue <= 12) {
    return { year, month: monthValue };
  }

  if (yearParam && !monthParam) {
    return { year, month: null };
  }

  return current;
}

function parseType(
  value: string | null,
): TransactionFilters["type"] {
  return value === "income" || value === "expense" ? value : "";
}

function parseStatus(
  value: string | null,
): TransactionFilters["status"] {
  return value === "paid" || value === "pending" || value === "overdue"
    ? value
    : "";
}

function buildDefaultFilters(
  scope: FinanceScope,
  searchParams?: URLSearchParams,
): TransactionFilters {
  const { startDate, endDate } = getScopeBounds(scope);
  return {
    search: "",
    categoryIds: [],
    status: parseStatus(searchParams?.get("status") ?? null),
    type: parseType(searchParams?.get("type") ?? null),
    startDate,
    endDate,
    sortBy: "date",
    sortOrder: "desc",
  };
}

function isInRange(value: string, startDate?: string, endDate?: string) {
  const key = value.slice(0, 10);
  if (startDate && key < startDate) return false;
  if (endDate && key > endDate) return false;
  return true;
}

function transactionMatchesFilters(
  transaction: FinanceTransaction,
  filters: TransactionFilters,
  search: string,
) {
  if (!isInRange(transaction.date, filters.startDate, filters.endDate)) {
    return false;
  }
  if (
    filters.categoryIds.length > 0 &&
    !filters.categoryIds.includes(transaction.categoryId)
  ) {
    return false;
  }
  if (filters.status && transaction.status !== filters.status) return false;
  if (filters.type && transaction.type !== filters.type) return false;
  const normalized = search.trim().toLowerCase();
  if (
    normalized &&
    !transaction.description.toLowerCase().includes(normalized)
  ) {
    return false;
  }
  return true;
}

function sortTransactions(
  data: FinanceTransaction[],
  sortBy: TransactionSortField,
  sortOrder: SortOrder,
) {
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
        comparison = (left.dueDate ?? left.date).localeCompare(
          right.dueDate ?? right.date,
        );
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

export default function LancamentosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="h-10 animate-pulse rounded-xl bg-white" />
          <div className="h-20 animate-pulse rounded-2xl bg-white" />
          <div className="h-80 animate-pulse rounded-2xl bg-white" />
        </div>
      }
    >
      <LancamentosPageContent />
    </Suspense>
  );
}

function LancamentosPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scope, setScope] = useState<FinanceScope>(() =>
    parseScope(searchParams),
  );
  const [filters, setFilters] = useState<TransactionFilters>(() =>
    buildDefaultFilters(parseScope(searchParams), searchParams),
  );
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [transactions, setTransactions] =
    useState<PaginatedTransactions>(emptyPaginated);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(
    () => searchParams.get("create") === "1",
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    financeService
      .getChartOfAccounts()
      .then((accounts) => {
        setCategories(
          accounts
            .filter((account) => !account.isGroup)
            .map((account) => ({
              id: account.id,
              name:
                account.code &&
                !account.name
                  .toLowerCase()
                  .startsWith(`${account.code.toLowerCase()} `)
                  ? `${account.code} ${account.name}`
                  : account.name,
              color: account.color,
              type: account.type,
            })),
        );
      })
      .catch(() => {
        setCategories([]);
      });
  }, []);

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    setCreateOpen(true);
    router.replace(
      buildLancamentosHref({
        year: scope.year,
        month: scope.month,
        type: filters.type,
        status: filters.status,
      }),
      { scroll: false },
    );
  }, [filters.status, filters.type, router, scope.month, scope.year, searchParams]);

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

  const loadTransactions = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await financeService.getTransactions(transactionQuery);
        setTransactions(data);
      } catch {
        if (!silent) setTransactions(emptyPaginated);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [transactionQuery],
  );

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  function syncUrl(nextScope: FinanceScope, nextFilters: TransactionFilters) {
    router.replace(
      buildLancamentosHref({
        year: nextScope.year,
        month: nextScope.month,
        type: nextFilters.type,
        status: nextFilters.status,
      }),
      { scroll: false },
    );
  }

  function handleScopeChange(nextScope: FinanceScope) {
    const nextFilters = {
      ...filters,
      ...getScopeBounds(nextScope),
    };
    setScope(nextScope);
    setFilters(nextFilters);
    setPage(1);
    syncUrl(nextScope, nextFilters);
  }

  function handleFiltersChange(nextFilters: TransactionFilters) {
    setFilters(nextFilters);
    setPage(1);
    syncUrl(scope, nextFilters);
  }

  function handleClearFilters() {
    const nextFilters = buildDefaultFilters(scope);
    setFilters(nextFilters);
    setPage(1);
    syncUrl(scope, nextFilters);
  }

  function handleTransactionSaved(
    transaction: FinanceTransaction,
    _mode: "create" | "update",
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
    void loadTransactions(true);
  }

  function handleOptimisticMarkPaid(transaction: FinanceTransaction) {
    setTransactions((current) => ({
      ...current,
      data: current.data.map((item) =>
        item.id === transaction.id ? { ...item, status: "paid" as const } : item,
      ),
    }));
    void financeService
      .markTransactionAsPaid(transaction.id)
      .then(() => loadTransactions(true))
      .catch(() => loadTransactions(true));
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
    void financeService
      .deleteTransaction(transaction.id)
      .then(() => loadTransactions(true))
      .catch(() => loadTransactions(true));
  }

  const periodLabel = formatScopeLabel(scope);

  return (
    <div className="flex flex-col gap-6">
      <FinanceSubnav />
      <div
        data-tour="finance-lancamentos-header"
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
            Lançamentos
          </h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Receitas e despesas de {periodLabel.toLowerCase()} —{" "}
            {transactions.meta.total} registro
            {transactions.meta.total === 1 ? "" : "s"}
          </p>
        </div>
        <div
          data-tour="finance-lancamentos-actions"
          className="flex flex-wrap items-center gap-2"
        >
          <BankAccountsDialog />
          <TransactionsImportDialog
            onSuccess={() => void loadTransactions(true)}
          />
          <TransactionDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSuccess={handleTransactionSaved}
          />
        </div>
      </div>

      <FinanceScopeSwitcher scope={scope} onChange={handleScopeChange} />

      <div data-tour="finance-lancamentos-list" className="flex flex-col gap-4">
        <FiltersToolbar
          filters={filters}
          categories={categories}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
        />
        <TransactionsTable
          transactions={transactions}
          filters={filters}
          onSortChange={(sortBy, sortOrder) => {
            handleFiltersChange({ ...filters, sortBy, sortOrder });
          }}
          onPageChange={setPage}
          onRefresh={() => {
            void loadTransactions(true);
          }}
          onTransactionSaved={handleTransactionSaved}
          onMarkAsPaid={handleOptimisticMarkPaid}
          onDelete={handleOptimisticDelete}
          loading={loading && transactions.data.length === 0}
          emptyLabel={`Nenhum lançamento em ${periodLabel.toLowerCase()}. Clique em Novo lançamento para registrar o primeiro.`}
        />
      </div>
    </div>
  );
}

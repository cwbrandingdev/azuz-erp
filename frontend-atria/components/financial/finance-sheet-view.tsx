"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpAZ,
  CalendarClock,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionDialog } from "@/components/financial/transaction-dialog";
import {
  applySheetSort,
  formatCurrency,
  formatDate,
  formatPeriodLabel,
  getDueDateKey,
  getDueSheetBuckets,
  getMonthBounds,
  getMonthSheetRows,
  getTransactionLabel,
  MONTH_NAMES_LONG,
  STATUS_LABELS,
  STATUS_STYLES,
  type FinancePeriod,
  type FinanceSheetFocus,
  type FinanceSheetSort,
} from "@/lib/financial-utils";
import { cn } from "@/lib/utils";
import { financeService, ApiError } from "@/services";
import type { FinanceTransaction } from "@/services/types";

interface FinanceSheetViewProps {
  period: FinancePeriod;
  reloadSignal?: number;
  onTransactionSaved?: (
    transaction: FinanceTransaction,
    mode: "create" | "update",
  ) => void;
  onMarkAsPaid?: (transaction: FinanceTransaction) => void;
  onDelete?: (transaction: FinanceTransaction) => void;
}

const FILTER_BUTTONS: {
  id: FinanceSheetFocus;
  label: string;
  subtitle: (period: FinancePeriod) => string;
  empty: (period: FinancePeriod) => string;
}[] = [
  {
    id: "all",
    label: "Tudo",
    subtitle: (period) =>
      `Todas as contas de ${formatPeriodLabel(period).toLowerCase()}, sem filtro de vencimento`,
    empty: (period) =>
      `Nenhuma transação em ${formatPeriodLabel(period).toLowerCase()}`,
  },
  {
    id: "due",
    label: "Já está para vencer",
    subtitle: () => "Vencidas ou com vencimento até hoje",
    empty: () => "Nenhuma conta vencida ou a vencer hoje",
  },
  {
    id: "month-end",
    label: "Fim do mês",
    subtitle: (period) =>
      `A vencer até o fim de ${MONTH_NAMES_LONG[period.month - 1]}`,
    empty: (period) =>
      `Nenhuma conta a vencer até o fim de ${formatPeriodLabel(period).toLowerCase()}`,
  },
];

const SORT_BUTTONS: {
  id: FinanceSheetSort;
  label: string;
  icon: typeof CalendarClock;
}[] = [
  { id: "due", label: "Vencimento", icon: CalendarClock },
  { id: "alpha", label: "A–Z", icon: ArrowUpAZ },
];

async function fetchAllTransactions(params: {
  status?: "paid" | "pending" | "overdue";
  startDate?: string;
  endDate?: string;
}) {
  const limit = 100;
  const first = await financeService.getTransactions({
    ...params,
    page: 1,
    limit,
  });

  if (first.meta.totalPages <= 1) return first.data;

  const remaining = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) =>
      financeService.getTransactions({
        ...params,
        page: index + 2,
        limit,
      }),
    ),
  );

  return [first, ...remaining].flatMap((page) => page.data);
}

function SheetColumnTable({
  rows,
  focus,
  loading,
  emptyLabel,
  onEdit,
  onMarkAsPaid,
  onDelete,
}: {
  rows: FinanceTransaction[];
  focus: FinanceSheetFocus;
  loading?: boolean;
  emptyLabel?: string;
  onEdit: (transaction: FinanceTransaction) => void;
  onMarkAsPaid: (transaction: FinanceTransaction) => void;
  onDelete: (transaction: FinanceTransaction) => void;
}) {
  return (
    <Table className="text-sm">
      <TableHeader className="sticky top-0 z-10 bg-[#f8fafc]">
        <TableRow className="bg-[#f8fafc] hover:bg-[#f8fafc]">
          <TableHead className="h-8 px-2 text-xs text-[var(--atria-primary)]/50">
            Descrição
          </TableHead>
          <TableHead className="h-8 px-2 text-xs text-[var(--atria-primary)]/50">
            Data
          </TableHead>
          <TableHead className="h-8 px-2 text-xs text-[var(--atria-primary)]/50">
            Venc.
          </TableHead>
          <TableHead className="h-8 px-2 text-xs text-[var(--atria-primary)]/50">
            Status
          </TableHead>
          <TableHead className="h-8 px-2 text-right text-xs text-[var(--atria-primary)]/50">
            Valor
          </TableHead>
          <TableHead className="h-8 w-9 px-1 text-xs text-[var(--atria-primary)]/50" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="py-4 text-center text-muted-foreground">
              Carregando...
            </TableCell>
          </TableRow>
        ) : rows.length === 0 ? (
          emptyLabel ? (
            <TableRow>
              <TableCell colSpan={6} className="py-4 text-center text-muted-foreground">
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : null
        ) : (
          rows.map((transaction) => {
            const dueKey = getDueDateKey(transaction);
            const isPaid = transaction.status === "paid";

            return (
              <TableRow
                key={transaction.id}
                className={cn(
                  isPaid
                    ? "bg-emerald-100 hover:bg-emerald-200/80"
                    : "hover:bg-violet-50/40",
                )}
              >
                <TableCell
                  className={cn(
                    "max-w-0 px-2 py-1.5 font-medium",
                    isPaid ? "text-emerald-900" : "text-[var(--atria-primary)]",
                  )}
                >
                  <p className="truncate">
                    {getTransactionLabel(transaction)}
                  </p>
                  <p className="truncate text-xs font-normal opacity-60">
                    {transaction.category}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 py-1.5 text-xs text-[var(--atria-primary)]/70">
                  {formatDate(transaction.date)}
                </TableCell>
                <TableCell className="px-2 py-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                      isPaid
                        ? "bg-emerald-200 text-emerald-900"
                        : focus === "due"
                          ? "bg-amber-50 text-amber-800"
                          : "bg-violet-50 text-violet-800",
                    )}
                  >
                    <ArrowRight className="size-3" />
                    {formatDate(dueKey)}
                  </span>
                </TableCell>
                <TableCell className="px-2 py-1.5">
                  <Badge
                    className={cn(STATUS_STYLES[transaction.status], "px-2 py-0.5 text-xs")}
                    variant="outline"
                  >
                    {STATUS_LABELS[transaction.status]}
                  </Badge>
                </TableCell>
                <TableCell
                  className={cn(
                    "px-2 py-1.5 text-right font-bold",
                    isPaid
                      ? transaction.type === "expense"
                        ? "text-red-600"
                        : "text-emerald-800"
                      : transaction.type === "income"
                        ? "text-emerald-600"
                        : "text-red-600",
                  )}
                >
                  {transaction.type === "expense" ? "−" : "+"}
                  {formatCurrency(transaction.amount)}
                </TableCell>
                <TableCell className="px-1 py-1.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-xs" />}
                    >
                      <MoreHorizontal className="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(transaction)}>
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                      {transaction.status !== "paid" && (
                        <DropdownMenuItem onClick={() => onMarkAsPaid(transaction)}>
                          <CheckCircle2 className="size-4" />
                          Marcar como pago
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(transaction)}
                      >
                        <Trash2 className="size-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

export function FinanceSheetView({
  period,
  reloadSignal = 0,
  onTransactionSaved,
  onMarkAsPaid,
  onDelete,
}: FinanceSheetViewProps) {
  const [focus, setFocus] = useState<FinanceSheetFocus>("all");
  const [sort, setSort] = useState<FinanceSheetSort>("due");
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingTransaction, setEditingTransaction] =
    useState<FinanceTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<FinanceTransaction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadTransactions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const { startDate, endDate } = getMonthBounds(period);
      setTransactions(await fetchAllTransactions({ startDate, endDate }));
    } catch {
      if (!silent) setTransactions([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    if (reloadSignal === 0) return;
    void loadTransactions(true);
  }, [loadTransactions, reloadSignal]);

  const buckets = useMemo(
    () => getDueSheetBuckets(transactions, period),
    [period, transactions],
  );

  const visibleRows = useMemo(() => {
    const source =
      focus === "all"
        ? getMonthSheetRows(transactions, period)
        : focus === "due"
          ? buckets.dueNow
          : buckets.monthEnd;

    const query = search.trim().toLowerCase();
    const filtered = query
      ? source.filter((transaction) => {
          const label = getTransactionLabel(transaction).toLowerCase();
          const category = transaction.category.toLowerCase();
          return label.includes(query) || category.includes(query);
        })
      : source;

    return applySheetSort(filtered, sort);
  }, [buckets.dueNow, buckets.monthEnd, focus, period, search, sort, transactions]);

  const expenseRows = useMemo(
    () => visibleRows.filter((transaction) => transaction.type === "expense"),
    [visibleRows],
  );
  const incomeRows = useMemo(
    () => visibleRows.filter((transaction) => transaction.type === "income"),
    [visibleRows],
  );

  const totals = useMemo(() => {
    return visibleRows.reduce(
      (acc, transaction) => {
        if (transaction.status === "paid") {
          if (transaction.type === "income") acc.incomePaid += transaction.amount;
          else acc.expensePaid += transaction.amount;
        } else if (transaction.type === "income") {
          acc.income += transaction.amount;
        } else {
          acc.expense += transaction.amount;
        }
        return acc;
      },
      { income: 0, expense: 0, incomePaid: 0, expensePaid: 0 },
    );
  }, [visibleRows]);

  function handleMarkAsPaid(transaction: FinanceTransaction) {
    setTransactions((current) =>
      current.map((item) =>
        item.id === transaction.id ? { ...item, status: "paid" as const } : item,
      ),
    );

    if (onMarkAsPaid) {
      onMarkAsPaid(transaction);
      return;
    }

    void financeService
      .markTransactionAsPaid(transaction.id)
      .then(() => loadTransactions(true))
      .catch(() => loadTransactions(true));
  }

  async function handleDelete() {
    if (!deletingTransaction) return;

    const transaction = deletingTransaction;
    setDeletingTransaction(null);
    setActionError(null);
    setTransactions((current) =>
      current.filter((item) => item.id !== transaction.id),
    );

    if (onDelete) {
      onDelete(transaction);
      return;
    }

    try {
      await financeService.deleteTransaction(transaction.id);
      void loadTransactions(true);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir a transação.",
      );
      void loadTransactions(true);
    }
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--atria-primary)]/10 bg-white px-3 py-2">
          {FILTER_BUTTONS.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={focus === item.id ? "default" : "outline"}
              size="xs"
              className={cn(
                "rounded-lg",
                focus === item.id
                  ? "bg-[var(--atria-primary)] text-white"
                  : "border-[var(--atria-primary)]/15 text-[var(--atria-primary)]",
              )}
              onClick={() => setFocus(item.id)}
              aria-pressed={focus === item.id}
            >
              {item.label}
            </Button>
          ))}

          <span className="mx-1 h-4 w-px bg-[var(--atria-primary)]/15" />

          {SORT_BUTTONS.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                type="button"
                variant={sort === item.id ? "default" : "outline"}
                size="xs"
                className={cn(
                  "rounded-lg",
                  sort === item.id
                    ? "bg-violet-600 text-white hover:bg-violet-600"
                    : "border-violet-200 text-violet-800 hover:bg-violet-50",
                )}
                onClick={() => setSort(item.id)}
                aria-pressed={sort === item.id}
              >
                <Icon className="size-3.5" />
                {item.label}
              </Button>
            );
          })}

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar..."
            className="h-7 max-w-[180px]"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="overflow-hidden rounded-xl border border-red-100 bg-white">
            <header className="flex items-center justify-between gap-2 border-b border-red-100 bg-red-50/70 px-3 py-2">
              <div>
                <h2 className="text-base font-semibold text-red-800">Saídas</h2>
                <p className="text-xs text-red-700/70">
                  {expenseRows.length} {expenseRows.length === 1 ? "lançamento" : "lançamentos"}
                </p>
              </div>
              <div className="text-right text-xs font-semibold">
                <p className="text-red-700">A pagar {formatCurrency(totals.expense)}</p>
                {focus === "all" ? (
                  <p className="text-red-600/70">Pago {formatCurrency(totals.expensePaid)}</p>
                ) : null}
              </div>
            </header>
            <SheetColumnTable
              rows={loading ? [] : expenseRows}
              focus={focus}
              loading={loading}
              emptyLabel="Nenhuma saída neste filtro"
              onEdit={setEditingTransaction}
              onMarkAsPaid={handleMarkAsPaid}
              onDelete={setDeletingTransaction}
            />
          </section>

          <section className="overflow-hidden rounded-xl border border-emerald-100 bg-white">
            <header className="flex items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50/70 px-3 py-2">
              <div>
                <h2 className="text-base font-semibold text-emerald-800">Entradas</h2>
                <p className="text-xs text-emerald-700/70">
                  {incomeRows.length} {incomeRows.length === 1 ? "lançamento" : "lançamentos"}
                </p>
              </div>
              <div className="text-right text-xs font-semibold">
                <p className="text-emerald-700">A receber {formatCurrency(totals.income)}</p>
                {focus === "all" ? (
                  <p className="text-emerald-600/70">Recebido {formatCurrency(totals.incomePaid)}</p>
                ) : null}
              </div>
            </header>
            <SheetColumnTable
              rows={loading ? [] : incomeRows}
              focus={focus}
              loading={loading}
              emptyLabel="Nenhuma entrada neste filtro"
              onEdit={setEditingTransaction}
              onMarkAsPaid={handleMarkAsPaid}
              onDelete={setDeletingTransaction}
            />
          </section>
        </div>
      </div>

      <TransactionDialog
        transaction={editingTransaction}
        open={Boolean(editingTransaction)}
        trigger={null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingTransaction(null);
        }}
        onSuccess={(transaction, mode) => {
          setEditingTransaction(null);
          setTransactions((current) => {
            const exists = current.some((item) => item.id === transaction.id);
            return exists
              ? current.map((item) =>
                  item.id === transaction.id ? transaction : item,
                )
              : [...current, transaction];
          });
          onTransactionSaved?.(transaction, mode);
        }}
      />

      <Dialog
        open={Boolean(deletingTransaction)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeletingTransaction(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[var(--atria-primary)]">
              Excluir transação
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--atria-primary)]/70">
            Tem certeza que deseja excluir &quot;
            {deletingTransaction
              ? getTransactionLabel(deletingTransaction)
              : ""}
            &quot;? Esta ação não pode ser desfeita.
          </p>
          {actionError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {actionError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingTransaction(null)}
            >
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

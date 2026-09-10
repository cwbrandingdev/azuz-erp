"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { CategoryBadge } from "@/components/financial/category-badge";
import { TransactionDialog } from "@/components/financial/transaction-dialog";
import {
  formatCurrency,
  formatDate,
  formatPeriodLabel,
  getDueDateKey,
  getDueSheetBuckets,
  getTransactionLabel,
  MONTH_NAMES_LONG,
  STATUS_LABELS,
  STATUS_STYLES,
  TYPE_LABELS,
  type FinancePeriod,
  type FinanceSheetFocus,
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

const SHEET_FOCUSES: {
  id: FinanceSheetFocus;
  title: string;
  subtitle: (period: FinancePeriod) => string;
  empty: (period: FinancePeriod) => string;
  accent: string;
}[] = [
  {
    id: "due",
    title: "Já está para vencer",
    subtitle: () => "Vencidas ou com vencimento até hoje, por ordem alfabética",
    empty: () => "Nenhuma conta vencida ou a vencer hoje",
    accent: "from-amber-500 to-orange-500",
  },
  {
    id: "month-end",
    title: "Vence no fim do mês",
    subtitle: (period) =>
      `A vencer até ${MONTH_NAMES_LONG[period.month - 1]} ${period.year}, por ordem alfabética`,
    empty: (period) =>
      `Nenhuma conta a vencer até o fim de ${formatPeriodLabel(period).toLowerCase()}`,
    accent: "from-violet-500 to-purple-600",
  },
];

async function fetchAllTransactions(params: {
  status?: "pending" | "overdue";
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

export function FinanceSheetView({
  period,
  reloadSignal = 0,
  onTransactionSaved,
  onMarkAsPaid,
  onDelete,
}: FinanceSheetViewProps) {
  const [focus, setFocus] = useState<FinanceSheetFocus>("due");
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
      const [pending, overdue] = await Promise.all([
        fetchAllTransactions({ status: "pending" }),
        fetchAllTransactions({ status: "overdue" }),
      ]);

      const byId = new Map<string, FinanceTransaction>();
      for (const transaction of [...pending, ...overdue]) {
        byId.set(transaction.id, transaction);
      }

      setTransactions([...byId.values()]);
    } catch {
      if (!silent) setTransactions([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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

  const focusIndex = SHEET_FOCUSES.findIndex((item) => item.id === focus);
  const currentFocus = SHEET_FOCUSES[focusIndex] ?? SHEET_FOCUSES[0];

  const visibleRows = useMemo(() => {
    const source = focus === "due" ? buckets.dueNow : buckets.monthEnd;
    const query = search.trim().toLowerCase();
    if (!query) return source;

    return source.filter((transaction) => {
      const label = getTransactionLabel(transaction).toLowerCase();
      const category = transaction.category.toLowerCase();
      return label.includes(query) || category.includes(query);
    });
  }, [buckets.dueNow, buckets.monthEnd, focus, search]);

  const totals = useMemo(() => {
    return visibleRows.reduce(
      (acc, transaction) => {
        if (transaction.type === "income") {
          acc.income += transaction.amount;
        } else {
          acc.expense += transaction.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [visibleRows]);

  function shiftFocus(delta: number) {
    const nextIndex =
      (focusIndex + delta + SHEET_FOCUSES.length) % SHEET_FOCUSES.length;
    setFocus(SHEET_FOCUSES[nextIndex].id);
  }

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
      <Card className="overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-0">
        <div className="border-b border-[var(--atria-primary)]/10 bg-gradient-to-br from-white via-white to-[#f7fafa] p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
                  onClick={() => shiftFocus(-1)}
                  aria-label="Lista anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                <div
                  className={cn(
                    "min-w-[240px] rounded-xl bg-gradient-to-r px-4 py-2 text-center text-white shadow-[0_8px_24px_rgba(139,92,246,0.28)]",
                    currentFocus.accent,
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                    Vencimento
                  </p>
                  <p className="text-sm font-bold">{currentFocus.title}</p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
                  onClick={() => shiftFocus(1)}
                  aria-label="Próxima lista"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  {visibleRows.length}{" "}
                  {visibleRows.length === 1 ? "conta" : "contas"}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  Receber {formatCurrency(totals.income)}
                </span>
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                  Pagar {formatCurrency(totals.expense)}
                </span>
              </div>
            </div>

            <p className="text-sm text-[var(--atria-primary)]/55">
              {currentFocus.subtitle(period)}
            </p>

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por descrição ou categoria..."
              className="max-w-md"
            />
          </div>
        </div>

        <div className="p-0">
          <Table className="text-[13px]">
            <TableHeader>
              <TableRow className="bg-[#f8fafc] hover:bg-[#f8fafc]">
                <TableHead className="w-[44px] text-[var(--atria-primary)]/50">
                  #
                </TableHead>
                <TableHead className="text-[var(--atria-primary)]/50">
                  Descrição
                </TableHead>
                <TableHead className="text-[var(--atria-primary)]/50">
                  Vencimento
                </TableHead>
                <TableHead className="text-[var(--atria-primary)]/50">
                  Tipo
                </TableHead>
                <TableHead className="text-[var(--atria-primary)]/50">
                  Status
                </TableHead>
                <TableHead className="text-right text-[var(--atria-primary)]/50">
                  Valor
                </TableHead>
                <TableHead className="text-[var(--atria-primary)]/50">
                  Categoria
                </TableHead>
                <TableHead className="w-12 text-[var(--atria-primary)]/50" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Carregando planilha...
                  </TableCell>
                </TableRow>
              ) : visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {currentFocus.empty(period)}
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((transaction, index) => {
                  const dueKey = getDueDateKey(transaction);

                  return (
                    <TableRow key={transaction.id} className="hover:bg-violet-50/40">
                      <TableCell className="font-mono text-xs text-[var(--atria-primary)]/40">
                        {index + 1}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate font-medium text-[var(--atria-primary)]">
                        {getTransactionLabel(transaction)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                            focus === "due"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-violet-50 text-violet-800",
                          )}
                        >
                          <ArrowRight className="size-3" />
                          {formatDate(dueKey)}
                        </span>
                      </TableCell>
                      <TableCell className="text-[var(--atria-primary)]/70">
                        {TYPE_LABELS[transaction.type]}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={STATUS_STYLES[transaction.status]}
                          variant="outline"
                        >
                          {STATUS_LABELS[transaction.status]}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-bold",
                          transaction.type === "income"
                            ? "text-emerald-600"
                            : "text-red-600",
                        )}
                      >
                        {transaction.type === "expense" ? "−" : "+"}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <CategoryBadge
                          name={transaction.category}
                          color={transaction.categoryColor ?? "#8B5CF6"}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon-sm" />}
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setEditingTransaction(transaction)}
                            >
                              <Pencil className="size-4" />
                              Editar
                            </DropdownMenuItem>
                            {transaction.status !== "paid" && (
                              <DropdownMenuItem
                                onClick={() => handleMarkAsPaid(transaction)}
                              >
                                <CheckCircle2 className="size-4" />
                                Marcar como pago
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                setDeletingTransaction(transaction)
                              }
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
        </div>
      </Card>

      <TransactionDialog
        transaction={editingTransaction}
        open={Boolean(editingTransaction)}
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

"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatDate,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/financial-utils";
import { financeService, ApiError } from "@/services";
import type {
  FinanceTransaction,
  PaginatedTransactions,
  SortOrder,
  TransactionFilters,
  TransactionSortField,
} from "@/services/types";

interface TransactionsTableProps {
  transactions: PaginatedTransactions;
  filters: TransactionFilters;
  onSortChange: (sortBy: TransactionSortField, sortOrder: SortOrder) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onTransactionSaved?: (
    transaction: FinanceTransaction,
    mode: "create" | "update",
  ) => void;
  onMarkAsPaid?: (transaction: FinanceTransaction) => void;
  onDelete?: (transaction: FinanceTransaction) => void;
  loading?: boolean;
}

const SORTABLE_COLUMNS: {
  key: TransactionSortField;
  label: string;
}[] = [
  { key: "description", label: "Descrição" },
  { key: "date", label: "Data" },
  { key: "status", label: "Status" },
  { key: "amount", label: "Valor" },
];

export function TransactionsTable({
  transactions,
  filters,
  onSortChange,
  onPageChange,
  onRefresh,
  onTransactionSaved,
  onMarkAsPaid,
  onDelete,
  loading,
}: TransactionsTableProps) {
  const { data, meta } = transactions;
  const [editingTransaction, setEditingTransaction] =
    useState<FinanceTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<FinanceTransaction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function toggleSort(column: TransactionSortField) {
    if (filters.sortBy === column) {
      onSortChange(column, filters.sortOrder === "asc" ? "desc" : "asc");
      return;
    }

    onSortChange(column, column === "date" ? "asc" : "desc");
  }

  function SortIcon({ column }: { column: TransactionSortField }) {
    if (filters.sortBy !== column) return null;
    return filters.sortOrder === "asc" ? (
      <ArrowUp className="ml-1 inline size-3" />
    ) : (
      <ArrowDown className="ml-1 inline size-3" />
    );
  }

  async function handleDelete() {
    if (!deletingTransaction) return;

    setActionError(null);
    const transaction = deletingTransaction;
    setDeletingTransaction(null);

    if (onDelete) {
      onDelete(transaction);
      return;
    }

    try {
      await financeService.deleteTransaction(transaction.id);
      onRefresh();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir a transação.",
      );
    }
  }

  function handleMarkAsPaid(transaction: FinanceTransaction) {
    if (onMarkAsPaid) {
      onMarkAsPaid(transaction);
      return;
    }

    void financeService.markTransactionAsPaid(transaction.id).then(onRefresh);
  }

  return (
    <>
      <Card className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-6">
        <div className="mb-4">
          <h2 className="font-semibold text-[var(--atria-primary)]">
            Transações
          </h2>
          <p className="text-sm text-[var(--atria-primary)]/50">
            {meta.total} registro{meta.total === 1 ? "" : "s"} encontrado
            {meta.total === 1 ? "" : "s"}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              {SORTABLE_COLUMNS.map((column) => (
                <TableHead
                  key={column.key}
                  className={`text-[var(--atria-primary)]/50 ${
                    column.key === "amount" ? "text-right" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="inline-flex items-center font-medium hover:text-[var(--atria-primary)]"
                  >
                    {column.label}
                    <SortIcon column={column.key} />
                  </button>
                </TableHead>
              ))}
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
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Carregando...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            ) : (
              data.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium text-[var(--atria-primary)]">
                    {tx.title}
                  </TableCell>
                  <TableCell className="text-[var(--atria-primary)]/60">
                    {formatDate(tx.dueDate ?? tx.date)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={STATUS_STYLES[tx.status]}
                      variant="outline"
                    >
                      {STATUS_LABELS[tx.status]}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right text-base font-bold ${
                      tx.type === "income"
                        ? "text-emerald-600 drop-shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                        : "text-red-600 drop-shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                    }`}
                  >
                    <span
                      className={`inline-flex rounded-lg px-2 py-1 ${
                        tx.type === "income" ? "bg-emerald-50" : "bg-red-50"
                      }`}
                    >
                      {tx.type === "expense" ? "−" : "+"}
                      {formatCurrency(tx.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge
                      name={tx.category}
                      color={tx.categoryColor ?? "#8B5CF6"}
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
                          onClick={() => setEditingTransaction(tx)}
                        >
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        {tx.status !== "paid" && (
                          <DropdownMenuItem
                            onClick={() => handleMarkAsPaid(tx)}
                          >
                            <CheckCircle2 className="size-4" />
                            Marcar como pago
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeletingTransaction(tx)}
                        >
                          <Trash2 className="size-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {meta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-[var(--atria-primary)]/50">
              Página {meta.page} de {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={meta.page <= 1}
                onClick={() => onPageChange(meta.page - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={meta.page >= meta.totalPages}
                onClick={() => onPageChange(meta.page + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <TransactionDialog
        transaction={editingTransaction}
        open={Boolean(editingTransaction)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingTransaction(null);
        }}
        onSuccess={(transaction, mode) => {
          setEditingTransaction(null);
          if (onTransactionSaved) {
            onTransactionSaved(transaction, mode);
            return;
          }
          onRefresh();
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
            {deletingTransaction?.description}&quot;? Esta ação não pode ser
            desfeita.
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

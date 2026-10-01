"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { financeService, ApiError } from "@/services";
import { toast } from "@/lib/toast";
import { formatLocalDate, toLocalDateIso } from "@/lib/financial-utils";
import type { BankAccount, ChartAccount, FinanceTransaction } from "@/services/types";
import { NumericFormat } from "react-number-format";

interface TransactionDialogProps {
  transaction?: FinanceTransaction | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess: (
    transaction: FinanceTransaction,
    mode: "create" | "update",
  ) => void;
  trigger?: React.ReactNode;
}

export function TransactionDialog({
  transaction,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  trigger,
}: TransactionDialogProps) {
  const isEdit = Boolean(transaction);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<ChartAccount[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("income");
  const [status, setStatus] = useState<"paid" | "pending">("pending");
  const [date, setDate] = useState(formatLocalDate(new Date()));
  const [dueDate, setDueDate] = useState(formatLocalDate(new Date()));
  const [categoryId, setCategoryId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState("1");
  const [recurrenceMonths, setRecurrenceMonths] = useState("12");

  const previousTypeRef = useRef<"income" | "expense" | null>(null);
  const categories = allCategories.filter(
    (category) => !category.isGroup && category.type === type,
  );

  useEffect(() => {
    if (!open) return;

    if (transaction) {
      setDescription(transaction.description);
      setAmount(String(transaction.amount));
      setType(transaction.type);
      setStatus(transaction.status === "paid" ? "paid" : "pending");
      setDate(transaction.date.slice(0, 10));
      setDueDate((transaction.dueDate ?? transaction.date).slice(0, 10));
      setCategoryId(transaction.categoryId);
      setBankAccountId(transaction.bankAccountId ?? "");
      setRecurring(false);
      previousTypeRef.current = transaction.type;
    } else {
      resetForm();
      previousTypeRef.current = "income";
    }
  }, [open, transaction]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setCategoriesLoading(true);

    Promise.all([
      financeService.getChartOfAccounts(),
      financeService.getBankAccounts().catch(() => [] as BankAccount[]),
    ])
      .then(([cats, accounts]) => {
        if (cancelled) return;
        setAllCategories(cats);
        setBanks(accounts);
      })
      .catch((err) => {
        if (cancelled) return;
        setAllCategories([]);
        setBanks([]);
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar o plano de contas.",
        );
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || categoriesLoading) return;

    const typed = allCategories.filter(
      (category) => !category.isGroup && category.type === type,
    );
    const typeChanged = previousTypeRef.current !== type;
    previousTypeRef.current = type;

    setCategoryId((current) => {
      if (typed.some((cat) => cat.id === current) && !typeChanged) {
        return current;
      }
      if (
        transaction &&
        !typeChanged &&
        typed.some((cat) => cat.id === transaction.categoryId)
      ) {
        return transaction.categoryId;
      }
      return typed[0]?.id ?? "";
    });
  }, [open, type, allCategories, categoriesLoading, transaction]);

  function resetForm() {
    setDescription("");
    setAmount("");
    setType("income");
    setStatus("pending");
    const today = formatLocalDate(new Date());
    setDate(today);
    setDueDate(today);
    setCategoryId("");
    setBankAccountId("");
    setRecurring(false);
    setRecurrenceDay("1");
    setRecurrenceMonths("12");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    const dayFromDate = Number(date.split("-")[2] || "1");
    const payload = {
      description,
      amount: parseFloat(amount),
      type,
      status,
      date: toLocalDateIso(date),
      dueDate: toLocalDateIso(dueDate || date),
      categoryId,
      bankAccountId: bankAccountId ? bankAccountId : isEdit ? null : undefined,
      ...(!isEdit && recurring
        ? {
            recurrenceDay: Number(recurrenceDay) || dayFromDate,
            recurrenceMonths: Math.max(1, Number(recurrenceMonths) || 1),
          }
        : {}),
    };

    try {
      const saved =
        isEdit && transaction
          ? await financeService.updateTransaction(transaction.id, payload)
          : await financeService.createTransaction(payload);

      resetForm();
      setOpen(false);
      onSuccess(saved, isEdit ? "update" : "create");

      toast.success(
        isEdit
          ? "Lançamento atualizado com sucesso"
          : recurring
            ? "Lançamentos recorrentes registrados com sucesso"
            : "Lançamento registrado com sucesso",
      );
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError(
          `Não foi possível ${isEdit ? "atualizar" : "criar"} a transação.`,
        );
        toast.error(
          `Não foi possível ${isEdit ? "atualizar" : "criar"} a transação.`,
        );
      } else {
        setError(err.message);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) resetForm();
      }}
    >
      {trigger !== undefined ? (
        trigger && <DialogTrigger render={trigger as React.ReactElement} />
      ) : !isEdit ? (
        <DialogTrigger
          render={
            <Button className="bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90" />
          }
        >
          <Plus className="size-4" />
          Novo lançamento
        </DialogTrigger>
      ) : null}

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-[var(--atria-primary)]">
              {isEdit ? "Editar lançamento" : "Novo lançamento"}
            </DialogTitle>
          </DialogHeader>

          <FieldGroup className="py-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <Field>
              <FieldLabel htmlFor="tx-description">Descrição</FieldLabel>
              <Input
                id="tx-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="tx-amount">Valor (R$)</FieldLabel>
                <NumericFormat
                  id="tx-amount"
                  customInput={Input}
                  thousandSeparator="."
                  decimalSeparator=","
                  prefix="R$ "
                  decimalScale={2}
                  fixedDecimalScale
                  value={amount}
                  onValueChange={(values) => {
                    setAmount(values.value ?? "");
                  }}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="tx-type">Tipo</FieldLabel>
                <NativeSelect
                  id="tx-type"
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as "income" | "expense")
                  }
                >
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                </NativeSelect>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="tx-date">Data</FieldLabel>
                <Input
                  id="tx-date"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDueDate((current) => (current === date ? next : current));
                    setDate(next);
                  }}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="tx-status">Status</FieldLabel>
                <NativeSelect
                  id="tx-status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "paid" | "pending")
                  }
                >
                  {type === "income" ? (
                    <>
                      <option value="paid">Recebido</option>
                      <option value="pending">A receber</option>
                    </>
                  ) : (
                    <>
                      <option value="paid">Pago</option>
                      <option value="pending">A pagar</option>
                    </>
                  )}
                </NativeSelect>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="tx-due-date">Vencimento</FieldLabel>
              <Input
                id="tx-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="tx-category">Categoria</FieldLabel>
              <SearchableSelect
                id="tx-category"
                value={categoryId}
                onValueChange={setCategoryId}
                loading={categoriesLoading}
                loadingLabel="Carregando contas..."
                emptyLabel={
                  type === "income"
                    ? "Nenhuma conta de receita"
                    : "Nenhuma conta de despesa"
                }
                placeholder="Selecione a conta"
                options={categories.map((cat) => ({
                  value: cat.id,
                  label:
                    cat.code &&
                    !cat.name.toLowerCase().startsWith(`${cat.code.toLowerCase()} `)
                      ? `${cat.code} ${cat.name}`
                      : cat.name,
                }))}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="tx-bank">Conta bancária</FieldLabel>
              <NativeSelect
                id="tx-bank"
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
              >
                <option value="">Caixa / sem banco</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                    {bank.institution ? ` · ${bank.institution}` : ""}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            {!isEdit && (
              <div className="space-y-3 rounded-xl border border-[var(--atria-primary)]/10 p-3">
                <label className="flex items-center gap-2 text-sm text-[var(--atria-primary)]">
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(e) => {
                      setRecurring(e.target.checked);
                      if (e.target.checked) {
                        setRecurrenceDay(
                          String(Number(date.split("-")[2] || 1)),
                        );
                      }
                    }}
                  />
                  Repetir mensalmente
                </label>

                {recurring && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="tx-recurrence-day">
                        Dia do mês
                      </FieldLabel>
                      <Input
                        id="tx-recurrence-day"
                        type="number"
                        min={1}
                        max={31}
                        value={recurrenceDay}
                        onChange={(e) => setRecurrenceDay(e.target.value)}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="tx-recurrence-months">
                        Quantidade de meses
                      </FieldLabel>
                      <Input
                        id="tx-recurrence-months"
                        type="number"
                        min={2}
                        max={60}
                        value={recurrenceMonths}
                        onChange={(e) => setRecurrenceMonths(e.target.value)}
                        required
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!categoryId || submitting}
              className="bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90"
            >
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

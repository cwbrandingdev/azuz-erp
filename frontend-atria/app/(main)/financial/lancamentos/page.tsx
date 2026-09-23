"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BankAccountsDialog } from "@/components/financial/bank-accounts-dialog";
import { ChartAccountField } from "@/components/financial/chart-account-field";
import { FinanceSubnav } from "@/components/financial/finance-subnav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { financeService } from "@/services";
import type { BankAccount, ChartAccount } from "@/services/types";

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function EntryForm({
  title,
  description,
  type,
  accounts,
  banks,
  submitLabel,
  onSaved,
}: {
  title: string;
  description: string;
  type: "income" | "expense";
  accounts: ChartAccount[];
  banks: BankAccount[];
  submitLabel: string;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [text, setText] = useState("");
  const [date, setDate] = useState(todayIso);
  const [categoryId, setCategoryId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [paid, setPaid] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const parsed = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!parsed || parsed <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    if (!text.trim()) {
      toast.error("Informe a descrição.");
      return;
    }
    if (!categoryId) {
      toast.error("Selecione o plano de contas.");
      return;
    }

    const day = Number(date.slice(8, 10));
    setSaving(true);
    try {
      await financeService.createTransaction({
        description: text.trim(),
        amount: parsed,
        type,
        status: paid ? "paid" : "pending",
        date,
        dueDate: date,
        categoryId,
        bankAccountId: bankAccountId || undefined,
        ...(recurring ? { recurrenceDay: day, recurrenceMonths: 12 } : {}),
      });
      setAmount("");
      setText("");
      setCategoryId("");
      setRecurring(false);
      setPaid(false);
      toast.success(type === "income" ? "Entrada lançada." : "Saída lançada.");
      onSaved();
    } catch {
      toast.error("Não foi possível salvar o lançamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--atria-primary)]">{title}</h2>
        <p className="text-sm text-[var(--atria-primary)]/50">{description}</p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Valor
        <Input
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0,00"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Descrição
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={type === "income" ? "Ex: Salário do mês..." : "Ex: Conta de luz..."}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Data
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <div className="flex flex-col gap-1 text-sm">
        Plano de Contas
        <ChartAccountField
          accounts={accounts}
          type={type}
          value={categoryId}
          onChange={setCategoryId}
        />
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Banco
        <select
          className="h-8 rounded-lg border border-input px-2 text-sm"
          value={bankAccountId}
          onChange={(event) => setBankAccountId(event.target.value)}
        >
          <option value="">Nenhum</option>
          {banks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={recurring}
          onChange={(event) => setRecurring(event.target.checked)}
        />
        {type === "income" ? "Receita recorrente" : "Despesa recorrente"}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={paid}
          onChange={(event) => setPaid(event.target.checked)}
        />
        {type === "income" ? "Já recebido" : "Já pago"}
      </label>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setAmount("");
            setText("");
            setCategoryId("");
            setRecurring(false);
            setPaid(false);
          }}
        >
          Limpar
        </Button>
        <Button
          type="button"
          className={type === "expense" ? "bg-red-600 text-white hover:bg-red-700" : undefined}
          onClick={handleSubmit}
          disabled={saving}
        >
          {submitLabel}
        </Button>
      </div>
    </section>
  );
}

export default function LancamentosPage() {
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    financeService.getChartOfAccounts().then(setAccounts).catch(() => {
      toast.error("Não foi possível carregar o plano de contas.");
    });
    financeService.getBankAccounts().then(setBanks).catch(() => {
      setBanks([]);
    });
  }, [reload]);

  return (
    <div className="flex flex-col gap-6">
      <FinanceSubnav />
      <div
        data-tour="finance-lancamentos-header"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">Lançamentos</h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Entradas e saídas no mesmo livro-caixa
          </p>
        </div>
        <div data-tour="finance-lancamentos-banks">
          <BankAccountsDialog onChange={() => setReload((value) => value + 1)} />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div data-tour="finance-lancamentos-income">
        <EntryForm
          title="Entradas"
          description="Entrada de dinheiro"
          type="income"
          accounts={accounts}
          banks={banks}
          submitLabel="Salvar receita"
          onSaved={() => setReload((value) => value + 1)}
        />
        </div>
        <div data-tour="finance-lancamentos-expense">
        <EntryForm
          title="Saídas"
          description="Saída de dinheiro"
          type="expense"
          accounts={accounts}
          banks={banks}
          submitLabel="Salvar despesa"
          onSaved={() => setReload((value) => value + 1)}
        />
        </div>
      </div>
    </div>
  );
}

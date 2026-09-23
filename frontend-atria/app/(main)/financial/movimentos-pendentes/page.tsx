"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BankAccountsDialog } from "@/components/financial/bank-accounts-dialog";
import { FinanceSubnav } from "@/components/financial/finance-subnav";
import { Button } from "@/components/ui/button";
import { downloadWorkbook, escapeHtml, printReport } from "@/lib/finance-export";
import { formatCurrency } from "@/lib/financial-utils";
import { financeService } from "@/services";
import type { ReconciliationData } from "@/services/types";

export default function MovimentosPendentesPage() {
  const [bankAccountId, setBankAccountId] = useState("");
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState("");
  const [selectedLine, setSelectedLine] = useState("");

  async function load(accountId = bankAccountId) {
    try {
      const reconciliation = await financeService.getReconciliation(accountId || undefined);
      setData(reconciliation);
      setSelectedLines([]);
      setSelectedLine("");
      setSelectedTransaction("");
    } catch {
      toast.error("Não foi possível carregar os movimentos pendentes.");
    }
  }

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function match() {
    if (!selectedLine || !selectedTransaction) {
      toast.error("Selecione uma linha do extrato e um lançamento.");
      return;
    }
    try {
      await financeService.matchStatementLine(selectedLine, selectedTransaction);
      toast.success("Lançamento conciliado.");
      await load();
    } catch {
      toast.error("Não foi possível conciliar.");
    }
  }

  async function ignoreSelected() {
    if (selectedLines.length === 0) {
      toast.error("Selecione ao menos uma linha do extrato.");
      return;
    }
    try {
      await financeService.ignoreStatementLines(selectedLines);
      toast.success("Linhas ignoradas.");
      await load();
    } catch {
      toast.error("Não foi possível ignorar as linhas.");
    }
  }

  function exportReport() {
    if (!data) return;
    const rows: (string | number)[][] = [
      ["Origem", "Data", "Descrição", "Tipo", "Valor"],
      ...data.lines.map((line) => [
        "Extrato",
        line.postedAt.slice(0, 10),
        line.description,
        line.type,
        line.amount,
      ]),
      ...data.transactions.map((tx) => [
        "Atria",
        tx.date.slice(0, 10),
        tx.description,
        tx.type,
        tx.amount,
      ]),
    ];
    void downloadWorkbook("movimentos-pendentes.xlsx", [{ name: "Pendentes", rows }]);
    const html = `<h2>Extrato</h2><ul>${data.lines
      .map((line) => `<li>${escapeHtml(line.description)} — ${formatCurrency(line.amount)}</li>`)
      .join("")}</ul><h2>Lançamentos</h2><ul>${data.transactions
      .map((tx) => `<li>${escapeHtml(tx.description)} — ${formatCurrency(tx.amount)}</li>`)
      .join("")}</ul>`;
    printReport("Movimentos pendentes", html);
  }

  return (
    <div className="flex flex-col gap-6">
      <FinanceSubnav />
      <div
        data-tour="finance-mov-header"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">Movimentos Pendentes</h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Concilie o extrato com os lançamentos sem alterar valor nem categoria.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BankAccountsDialog onChange={() => void load()} />
          <Button type="button" variant="outline" onClick={exportReport}>Relatório</Button>
        </div>
      </div>

      <div data-tour="finance-mov-actions" className="flex flex-wrap items-center gap-3">
        <select
          className="h-8 rounded-lg border px-2 text-sm"
          value={bankAccountId}
          onChange={(event) => {
            setBankAccountId(event.target.value);
            void load(event.target.value);
          }}
        >
          <option value="">Todos os bancos</option>
          {data?.accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        <Button type="button" onClick={() => void match()}>Conciliar</Button>
        <Button type="button" variant="outline" onClick={() => void ignoreSelected()}>
          Excluir em lote
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section
          data-tour="finance-mov-bank-lines"
          className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-4"
        >
          <h2 className="mb-3 font-semibold text-[var(--atria-primary)]">Lançamentos Banco</h2>
          {(data?.lines.length ?? 0) === 0 ? (
            <p className="py-16 text-center text-sm text-[var(--atria-primary)]/50">
              Nenhum extrato bancário
              <br />
              Importe um arquivo OFX
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data?.lines.map((line) => (
                <li key={line.id} className="flex items-start gap-2 rounded-lg border border-[var(--atria-primary)]/10 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedLines.includes(line.id)}
                    onChange={(event) => {
                      setSelectedLines((current) =>
                        event.target.checked
                          ? [...current, line.id]
                          : current.filter((id) => id !== line.id),
                      );
                    }}
                  />
                  <label className="flex flex-1 cursor-pointer items-start gap-2">
                    <input
                      type="radio"
                      name="statement-line"
                      checked={selectedLine === line.id}
                      onChange={() => setSelectedLine(line.id)}
                    />
                    <span className="flex-1">
                      <span className="block font-medium">{line.description}</span>
                      <span className="text-xs text-[var(--atria-primary)]/50">
                        {line.postedAt.slice(0, 10).split("-").reverse().join("/")} · {line.bankName}
                      </span>
                    </span>
                    <span className={line.type === "income" ? "text-emerald-600" : "text-red-600"}>
                      {line.type === "income" ? "+" : "−"} {formatCurrency(line.amount)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          data-tour="finance-mov-atria-lines"
          className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-4"
        >
          <h2 className="mb-3 font-semibold text-[var(--atria-primary)]">Lançamentos Atria</h2>
          {(data?.transactions.length ?? 0) === 0 ? (
            <p className="py-16 text-center text-sm text-[var(--atria-primary)]/50">
              Nenhum lançamento pendente de conciliação.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data?.transactions.map((tx) => (
                <li key={tx.id}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--atria-primary)]/10 p-3 text-sm">
                    <input
                      type="radio"
                      name="atria-transaction"
                      checked={selectedTransaction === tx.id}
                      onChange={() => setSelectedTransaction(tx.id)}
                    />
                    <span className="flex-1">
                      <span className="block font-medium">{tx.description}</span>
                      <span className="text-xs text-[var(--atria-primary)]/50">
                        {tx.date.slice(0, 10).split("-").reverse().join("/")} · {tx.categoryName}
                      </span>
                    </span>
                    <span className={tx.type === "income" ? "text-emerald-600" : "text-red-600"}>
                      {tx.type === "income" ? "+" : "−"} {formatCurrency(tx.amount)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

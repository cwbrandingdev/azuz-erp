"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FinanceSubnav } from "@/components/financial/finance-subnav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadWorkbook, escapeHtml, printReport } from "@/lib/finance-export";
import { formatCurrency } from "@/lib/financial-utils";
import { financeService } from "@/services";
import type { BankAccount, CashFlowStatement, ChartAccount } from "@/services/types";

function isoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function monthRange() {
  const now = new Date();
  return {
    from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

export default function FluxoDeCaixaPage() {
  const initial = monthRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [data, setData] = useState<CashFlowStatement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    financeService.getChartOfAccounts().then(setAccounts).catch(() => undefined);
    financeService.getBankAccounts().then(setBanks).catch(() => undefined);
  }, []);

  async function load(next = { from, to, type, categoryId, bankAccountId, status, search }) {
    setLoading(true);
    try {
      const statement = await financeService.getCashFlowStatement({
        from: next.from,
        to: next.to,
        type: next.type ? (next.type as "income" | "expense") : undefined,
        categoryId: next.categoryId || undefined,
        bankAccountId: next.bankAccountId || undefined,
        status: next.status
          ? (next.status as "paid" | "pending" | "overdue")
          : undefined,
        search: next.search || undefined,
      });
      setData(statement);
    } catch {
      toast.error("Não foi possível carregar o fluxo de caixa.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportExcel() {
    if (!data) return;
    const rows: (string | number)[][] = [
      ["Bloco", "Data", "Descrição", "Tipo", "Plano", "Banco", "Status", "Valor"],
    ];
    for (const block of data.blocks) {
      for (const entry of block.entries) {
        rows.push([
          block.title,
          entry.date.slice(0, 10),
          entry.description,
          entry.type === "income" ? "Entrada" : "Saída",
          entry.categoryCode ? `${entry.categoryCode} ${entry.categoryName}` : entry.categoryName,
          entry.bankName ?? "",
          entry.status,
          entry.type === "income" ? entry.amount : -entry.amount,
        ]);
      }
      rows.push([block.title, "", "Saldo do bloco", "", "", "", "", block.balance]);
    }
    void downloadWorkbook("fluxo-de-caixa.xlsx", [{ name: "Fluxo de Caixa", rows }]);
  }

  function exportPdf() {
    if (!data) return;
    const html = data.blocks
      .map((block) => {
        const body = block.entries
          .map(
            (entry) => `<tr>
              <td>${escapeHtml(entry.date.slice(0, 10))}</td>
              <td>${escapeHtml(entry.description)}</td>
              <td>${escapeHtml(entry.categoryName)}</td>
              <td class="num ${entry.type === "income" ? "positive" : "negative"}">${formatCurrency(entry.type === "income" ? entry.amount : -entry.amount)}</td>
            </tr>`,
          )
          .join("");
        return `<h2>${escapeHtml(block.title)}</h2>
          <table><thead><tr><th>Data</th><th>Descrição</th><th>Plano</th><th class="num">Valor</th></tr></thead><tbody>${body || "<tr><td colspan='4'>Nenhum lançamento neste bloco.</td></tr>"}</tbody></table>
          <p>Entradas ${formatCurrency(block.income)} · Saídas ${formatCurrency(block.expense)} · Saldo ${formatCurrency(block.balance)}</p>`;
      })
      .join("");
    printReport("Fluxo de Caixa", html);
  }

  return (
    <div className="flex flex-col gap-6">
      <FinanceSubnav />
      <div>
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">Fluxo de Caixa</h1>
      </div>
      <section
        data-tour="finance-fc-filters"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-4"
      >
        <label className="flex flex-col gap-1 text-xs">DATA INICIAL<Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="flex flex-col gap-1 text-xs">DATA FINAL<Input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <label className="flex flex-col gap-1 text-xs">TIPO
          <select className="h-8 rounded-lg border px-2 text-sm" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Todos</option>
            <option value="income">Entradas</option>
            <option value="expense">Saídas</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">PLANO
          <select className="h-8 max-w-52 rounded-lg border px-2 text-sm" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Todos</option>
            {accounts.filter((account) => account.code && !account.isGroup).map((account) => (
              <option key={account.id} value={account.id}>
                {account.code && !account.name.toLowerCase().startsWith(account.code.toLowerCase()) ? `${account.code} ` : ""}{account.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">BANCO
          <select className="h-8 rounded-lg border px-2 text-sm" value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)}>
            <option value="">Todos</option>
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>{bank.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">STATUS
          <select className="h-8 rounded-lg border px-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos</option>
            <option value="paid">Pago</option>
            <option value="pending">Pendente</option>
            <option value="overdue">Atrasado</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">BUSCAR
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Descrição..." />
        </label>
        <Button type="button" onClick={() => void load()} disabled={loading}>Buscar</Button>
        <Button type="button" variant="outline" onClick={exportExcel}>Excel</Button>
        <Button type="button" variant="outline" onClick={exportPdf}>PDF</Button>
      </section>

      <div
        data-tour="finance-fc-blocks"
        className="flex min-h-24 flex-col gap-4"
      >
      {(data?.blocks ?? []).map((block) => (
        <section key={block.key} className="overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white">
          <div className="bg-[var(--atria-primary)] px-4 py-3 text-sm font-semibold text-white">
            {block.title}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--atria-primary)]/50">
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Descrição</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Plano</th>
                  <th className="px-4 py-2">Banco</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {block.entries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-[var(--atria-primary)]/50">
                      Nenhum lançamento neste bloco.
                    </td>
                  </tr>
                )}
                {block.entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-[var(--atria-primary)]/5">
                    <td className="px-4 py-2">{entry.date.slice(0, 10).split("-").reverse().join("/")}</td>
                    <td className="px-4 py-2">{entry.description}</td>
                    <td className="px-4 py-2">{entry.type === "income" ? "Entrada" : "Saída"}</td>
                    <td className="px-4 py-2">{entry.categoryCode ? `${entry.categoryCode} ` : ""}{entry.categoryName}</td>
                    <td className="px-4 py-2">{entry.bankName ?? "—"}</td>
                    <td className="px-4 py-2">{entry.status}</td>
                    <td className={`px-4 py-2 text-right ${entry.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrency(entry.type === "income" ? entry.amount : -entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-[var(--atria-primary)]/10 p-4 text-center">
            <div>
              <p className="text-xs text-emerald-600">Entradas</p>
              <p className="font-semibold text-emerald-600">{formatCurrency(block.income)}</p>
            </div>
            <div>
              <p className="text-xs text-red-600">Saídas</p>
              <p className="font-semibold text-red-600">{formatCurrency(block.expense)}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600">Saldo</p>
              <p className="font-semibold text-emerald-600">{formatCurrency(block.balance)}</p>
            </div>
          </div>
        </section>
      ))}
      </div>

      <section
        data-tour="finance-fc-net"
        className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5"
      >
        <p className="text-xs font-semibold text-[var(--atria-primary)]/50">VARIAÇÃO LÍQUIDA DO CAIXA</p>
        <p className="text-2xl font-bold text-[var(--atria-primary)]">
          {formatCurrency(data?.netVariation ?? 0)}
        </p>
      </section>
    </div>
  );
}

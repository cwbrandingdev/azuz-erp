"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FinanceSubnav } from "@/components/financial/finance-subnav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadWorkbook, escapeHtml, printReport } from "@/lib/finance-export";
import { formatCurrency } from "@/lib/financial-utils";
import { financeService } from "@/services";
import type { ProjectedCashFlow } from "@/services/types";

export default function FluxoProjetadoPage() {
  const [to, setTo] = useState("");
  const [type, setType] = useState("");
  const [data, setData] = useState<ProjectedCashFlow | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(nextTo = to, nextType = type) {
    setLoading(true);
    try {
      const projected = await financeService.getProjectedCashFlow({
        to: nextTo || undefined,
        type: nextType ? (nextType as "income" | "expense") : undefined,
      });
      setData(projected);
    } catch {
      toast.error("Não foi possível carregar o fluxo projetado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportExcel() {
    if (!data) return;
    const rows: (string | number)[][] = [
      ["Saldo atual realizado", data.currentBalance],
      ["Data", "Descrição", "Entradas", "Saídas", "Saldo acumulado"],
    ];
    for (const day of data.days) {
      for (const item of day.items) {
        rows.push([
          day.date,
          item.description,
          item.type === "income" ? item.amount : 0,
          item.type === "expense" ? item.amount : 0,
          day.balance,
        ]);
      }
    }
    void downloadWorkbook("fluxo-projetado.xlsx", [{ name: "Projetado", rows }]);
  }

  function exportPdf() {
    if (!data) return;
    const body = data.days
      .map(
        (day) => `<tr>
          <td>${escapeHtml(day.date)}</td>
          <td class="num positive">${formatCurrency(day.income)}</td>
          <td class="num negative">${formatCurrency(day.expense)}</td>
          <td class="num">${formatCurrency(day.balance)}</td>
        </tr>`,
      )
      .join("");
    printReport(
      "Fluxo de Caixa Projetado",
      `<p>Saldo atual realizado: ${formatCurrency(data.currentBalance)}</p>
       <table><thead><tr><th>Data</th><th class="num">Entradas</th><th class="num">Saídas</th><th class="num">Saldo</th></tr></thead><tbody>${body || "<tr><td colspan='4'>Nenhuma projeção encontrada.</td></tr>"}</tbody></table>`,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FinanceSubnav />
      <h1 className="text-2xl font-bold text-[var(--atria-primary)]">FC Projetado</h1>
      <section className="rounded-2xl border border-emerald-200 bg-white p-5">
        <p className="text-xs font-semibold text-emerald-700">SALDO ATUAL (REALIZADO)</p>
        <p className="mt-2 text-3xl font-bold text-emerald-600">
          {formatCurrency(data?.currentBalance ?? 0)}
        </p>
        <p className="text-sm text-[var(--atria-primary)]/50">Soma de transações pagas até hoje</p>
      </section>
      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-4">
        <label className="flex flex-col gap-1 text-xs">DATA FINAL
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs">TIPO
          <select className="h-8 rounded-lg border px-2 text-sm" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Todos</option>
            <option value="income">Entradas</option>
            <option value="expense">Saídas</option>
          </select>
        </label>
        <Button type="button" onClick={() => void load()} disabled={loading}>Buscar</Button>
        <Button type="button" variant="outline" onClick={() => { setTo(""); setType(""); void load("", ""); }}>Limpar</Button>
        <Button type="button" variant="outline" onClick={exportExcel}>Excel</Button>
        <Button type="button" variant="outline" onClick={exportPdf}>PDF</Button>
      </section>
      <section className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5">
        <h2 className="font-semibold text-[var(--atria-primary)]">Fluxo de Caixa Projetado</h2>
        <p className="text-sm text-[var(--atria-primary)]/50">
          De amanhã em diante, sem limite — apenas pendentes, com saldo acumulado.
        </p>
        {(data?.days.length ?? 0) === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--atria-primary)]/50">
            Nenhuma projeção encontrada.
            <br />
            Não há pagamentos pendentes a partir de amanhã.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--atria-primary)]/50">
                  <th className="py-2">Data</th>
                  <th className="py-2">Descrição</th>
                  <th className="py-2 text-right">Entradas</th>
                  <th className="py-2 text-right">Saídas</th>
                  <th className="py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data?.days.map((day) => (
                  <tr key={day.date} className="border-t border-[var(--atria-primary)]/5 align-top">
                    <td className="py-2">{day.date.split("-").reverse().join("/")}</td>
                    <td className="py-2">
                      {day.items.map((item) => item.description).join(", ")}
                    </td>
                    <td className="py-2 text-right text-emerald-600">{formatCurrency(day.income)}</td>
                    <td className="py-2 text-right text-red-600">{formatCurrency(day.expense)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(day.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

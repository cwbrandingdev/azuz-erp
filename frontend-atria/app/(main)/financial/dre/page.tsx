"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FinanceSubnav } from "@/components/financial/finance-subnav";
import { Button } from "@/components/ui/button";
import { downloadWorkbook, escapeHtml, printReport } from "@/lib/finance-export";
import { formatCurrency } from "@/lib/financial-utils";
import { financeService } from "@/services";
import type { AnnualDre } from "@/services/types";

const SHORT_MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function cellClass(value: number) {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-red-600";
  return "text-[var(--atria-primary)]/70";
}

export default function DrePage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<AnnualDre | null>(null);

  useEffect(() => {
    financeService.getAnnualDre(year).then(setData).catch(() => {
      toast.error("Não foi possível carregar a demonstração do resultado.");
    });
  }, [year]);

  function exportExcel() {
    if (!data) return;
    const header = ["Conta", ...SHORT_MONTHS, "Total"];
    const rows: (string | number)[][] = [header];
    for (const section of data.sections) {
      rows.push([section.title, ...section.totals, section.yearTotal]);
      for (const row of section.rows) {
        rows.push([
          `${row.code ? `${row.code} ` : ""}${row.name}`,
          ...row.months,
          row.total,
        ]);
      }
    }
    rows.push(["Resultado líquido do mês", ...data.managerialResult, ""]);
    rows.push(["Resultado final do mês", ...data.finalResult, ""]);
    rows.push(["Saldo disponível acumulado", ...data.availableBalance, ""]);
    void downloadWorkbook(`dre-${data.year}.xlsx`, [{ name: "DRE", rows }]);
  }

  function exportPdf() {
    if (!data) return;
    const head = SHORT_MONTHS.map((month) => `<th class="num">${month}</th>`).join("");
    const sections = data.sections
      .map((section) => {
        const rows = section.rows
          .map(
            (row) => `<tr><td>${escapeHtml(row.code ? `${row.code} ${row.name}` : row.name)}</td>${row.months
              .map((value) => `<td class="num ${value < 0 ? "negative" : "positive"}">${formatCurrency(value)}</td>`)
              .join("")}</tr>`,
          )
          .join("");
        return `<h2>${escapeHtml(section.title)}</h2><table><thead><tr><th>Plano</th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
      })
      .join("");
    printReport(`Demonstração do Resultado ${data.year}`, sections);
  }

  return (
    <div className="flex flex-col gap-6">
      <FinanceSubnav />
      <div
        data-tour="finance-dre-header"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">Demonstração do Resultado</h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Visão por mês e plano de contas. Competência pela data do lançamento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">
            Ano:{" "}
            <select
              className="h-8 rounded-lg border px-2"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {[0, 1, 2, 3].map((offset) => {
                const value = new Date().getFullYear() - offset;
                return (
                  <option key={value} value={value}>
                    {value}
                  </option>
                );
              })}
            </select>
          </label>
          <Button type="button" variant="outline" onClick={exportPdf}>PDF</Button>
          <Button type="button" variant="outline" onClick={exportExcel}>Excel</Button>
        </div>
      </div>

      <div data-tour="finance-dre-table" className="flex flex-col gap-4">
      {data?.sections.map((section) => (
        <section key={section.title} className="overflow-x-auto rounded-2xl border border-[var(--atria-primary)]/10 bg-white">
          <h2 className="px-4 py-3 text-sm font-semibold text-[var(--atria-primary)]">{section.title}</h2>
          <table className="w-full min-w-[980px] text-xs">
            <thead>
              <tr className="text-left text-[var(--atria-primary)]/50">
                <th className="px-3 py-2">Plano de conta</th>
                {SHORT_MONTHS.map((month) => (
                  <th key={month} className="px-2 py-2 text-right">{month}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row) => (
                <tr key={row.categoryId} className="border-t border-[var(--atria-primary)]/5">
                  <td className="px-3 py-2">
                    {row.code &&
                    !row.name.toLowerCase().startsWith(`${row.code.toLowerCase()} `)
                      ? `${row.code} `
                      : ""}
                    {row.name}
                  </td>
                  {row.months.map((value, index) => (
                    <td key={index} className={`px-2 py-2 text-right ${cellClass(value)}`}>
                      {formatCurrency(value)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t font-semibold">
                <td className="px-3 py-2">TOTAL DO MÊS</td>
                {section.totals.map((value, index) => (
                  <td key={index} className={`px-2 py-2 text-right ${cellClass(value)}`}>
                    {formatCurrency(value)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      ))}

      {data && (
        <section className="overflow-x-auto rounded-2xl border border-[var(--atria-primary)]/10 bg-white">
          <h2 className="px-4 py-3 text-sm font-semibold">Resultado gerencial</h2>
          <ResultRow label="RESULTADO LÍQUIDO DO MÊS" values={data.managerialResult} />
          <h2 className="px-4 py-3 text-sm font-semibold">Resultado final do mês</h2>
          <ResultRow label="RESULTADO FINAL DO MÊS" values={data.finalResult} />
          <h2 className="px-4 py-3 text-sm font-semibold">Saldo disponível</h2>
          <ResultRow label="ACUMULADO DO ANO" values={data.availableBalance} />
        </section>
      )}
      </div>
    </div>
  );
}

function ResultRow({ label, values }: { label: string; values: number[] }) {
  return (
    <table className="w-full min-w-[980px] text-xs">
      <tbody>
        <tr>
          <td className="px-3 py-2 font-medium">{label}</td>
          {values.map((value, index) => (
            <td key={index} className={`px-2 py-2 text-right ${cellClass(value)}`}>
              {formatCurrency(value)}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

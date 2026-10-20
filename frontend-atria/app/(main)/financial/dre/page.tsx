"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { toast } from "sonner";
import { FinanceSubnav } from "@/components/financial/finance-subnav";
import { Button } from "@/components/ui/button";
import { downloadWorkbook, escapeHtml, printReport } from "@/lib/finance-export";
import {
  formatCurrency,
  compareChartAccounts,
} from "@/lib/financial-utils";
import { financeService } from "@/services";
import type { AnnualDre } from "@/services/types";

type DreRow = AnnualDre["sections"][number]["rows"][number];

const SHORT_MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const LABEL_WIDTH = "15rem";
/** Minimum width per month column before horizontal scroll kicks in */
const MONTH_MIN_WIDTH = "7.25rem";
const TABLE_MIN_WIDTH = `calc(${LABEL_WIDTH} + 12 * ${MONTH_MIN_WIDTH})`;
const MONTH_CELL =
  "px-2 py-2.5 text-right whitespace-nowrap tabular-nums";
const LABEL_CELL =
  "sticky left-0 z-10 w-[15rem] min-w-[15rem] max-w-[15rem] bg-white px-3 py-2.5 text-left shadow-[1px_0_0_rgba(15,23,42,0.06)]";
const HEADER_MONTH = `${MONTH_CELL} font-medium`;
const CORNER_CELL =
  "sticky left-0 top-0 z-30 w-[15rem] min-w-[15rem] max-w-[15rem] bg-white px-3 py-2.5 text-left shadow-[1px_0_0_rgba(15,23,42,0.06)]";

function cellClass(value: number) {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-red-600";
  return "text-[var(--atria-primary)]/70";
}

function formatRowLabel(row: DreRow) {
  if (
    row.code &&
    !row.name.toLowerCase().startsWith(`${row.code.toLowerCase()} `)
  ) {
    return `${row.code} ${row.name}`;
  }
  return row.name;
}

function visibleRows(rows: DreRow[]) {
  return rows
    .filter(
      (row) => row.total !== 0 || row.months.some((value) => value !== 0),
    )
    .sort(compareChartAccounts);
}

function HorizontalScrollRail({
  scrollWidth,
  onScroll,
  railRef,
}: {
  scrollWidth: number;
  onScroll: (left: number) => void;
  railRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={railRef}
      onScroll={(event) => onScroll(event.currentTarget.scrollLeft)}
      className="shrink-0 overflow-x-auto overflow-y-hidden border-[var(--atria-primary)]/10 bg-white"
      aria-hidden
    >
      <div style={{ width: scrollWidth, height: 1 }} />
    </div>
  );
}

export default function DrePage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<AnnualDre | null>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);
  const syncingScroll = useRef(false);

  useEffect(() => {
    financeService.getAnnualDre(year).then(setData).catch(() => {
      toast.error("Não foi possível carregar a demonstração do resultado.");
    });
  }, [year]);

  const measureHorizontalOverflow = useCallback(() => {
    const main = mainScrollRef.current;
    if (!main) return;
    const width = main.scrollWidth;
    setScrollWidth(width);
    setHasHorizontalOverflow(width > main.clientWidth + 1);
  }, []);

  useEffect(() => {
    measureHorizontalOverflow();
    const main = mainScrollRef.current;
    if (!main) return;
    const observer = new ResizeObserver(measureHorizontalOverflow);
    observer.observe(main);
    return () => observer.disconnect();
  }, [data, measureHorizontalOverflow]);

  const syncHorizontalScroll = useCallback(
    (source: "top" | "main" | "bottom", left: number) => {
      if (syncingScroll.current) return;
      syncingScroll.current = true;
      if (source !== "top" && topScrollRef.current) {
        topScrollRef.current.scrollLeft = left;
      }
      if (source !== "main" && mainScrollRef.current) {
        mainScrollRef.current.scrollLeft = left;
      }
      if (source !== "bottom" && bottomScrollRef.current) {
        bottomScrollRef.current.scrollLeft = left;
      }
      requestAnimationFrame(() => {
        syncingScroll.current = false;
      });
    },
    [],
  );

  function exportExcel() {
    if (!data) return;
    const header = ["Conta", ...SHORT_MONTHS, "Total"];
    const rows: (string | number)[][] = [header];
    for (const section of data.sections) {
      rows.push([section.title, ...section.totals, section.yearTotal]);
      for (const row of visibleRows(section.rows)) {
        rows.push([
          formatRowLabel(row),
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
        const rows = visibleRows(section.rows)
          .map(
            (row) => `<tr><td>${escapeHtml(formatRowLabel(row))}</td>${row.months
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
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">Resultado do ano</h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Receita, custos e lucro mês a mês. Relatório conhecido como DRE.
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

      <div
        data-tour="finance-dre-table"
        className="flex max-h-[calc(100vh-11rem)] flex-col overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white"
      >
        {hasHorizontalOverflow && (
          <HorizontalScrollRail
            railRef={topScrollRef}
            scrollWidth={scrollWidth}
            onScroll={(left) => syncHorizontalScroll("top", left)}
          />
        )}
        <div
          ref={mainScrollRef}
          onScroll={(event) => {
            syncHorizontalScroll("main", event.currentTarget.scrollLeft);
          }}
          onWheel={(event) => {
            if (!hasHorizontalOverflow || event.deltaX === 0) return;
            const main = mainScrollRef.current;
            if (!main) return;
            main.scrollLeft += event.deltaX;
            syncHorizontalScroll("main", main.scrollLeft);
          }}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-auto bg-white"
        >
        <table
          className="w-full table-fixed border-collapse text-sm"
          style={{ minWidth: TABLE_MIN_WIDTH }}
        >
          <colgroup>
            <col style={{ width: LABEL_WIDTH }} />
            {SHORT_MONTHS.map((month) => (
              <col key={month} style={{ minWidth: MONTH_MIN_WIDTH }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-white shadow-[0_1px_0_rgba(15,23,42,0.06)]">
            <tr className="text-left text-[var(--atria-primary)]/50">
              <th className={CORNER_CELL}>Plano de conta</th>
              {SHORT_MONTHS.map((month) => (
                <th key={month} className={HEADER_MONTH}>{month}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.sections.map((section) => {
              const rows = visibleRows(section.rows);
              return (
                <Fragment key={section.title}>
                  <tr className="bg-violet-50/60">
                    <td
                      colSpan={SHORT_MONTHS.length + 1}
                      className="sticky left-0 px-3 py-2.5 text-base font-semibold text-[var(--atria-primary)]"
                    >
                      {section.title}
                    </td>
                  </tr>
                  {rows.map((row) => (
                    <tr
                      key={row.categoryId}
                      className="border-t border-[var(--atria-primary)]/5"
                    >
                      <td className={`${LABEL_CELL} truncate`} title={formatRowLabel(row)}>
                        {formatRowLabel(row)}
                      </td>
                      {row.months.map((value, index) => (
                        <td key={index} className={`${MONTH_CELL} ${cellClass(value)}`}>
                          {formatCurrency(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t font-semibold">
                    <td className={LABEL_CELL}>TOTAL DO MÊS</td>
                    {section.totals.map((value, index) => (
                      <td key={index} className={`${MONTH_CELL} ${cellClass(value)}`}>
                        {formatCurrency(value)}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              );
            })}

            {data && (
              <>
                <tr className="bg-slate-50">
                  <td
                    colSpan={SHORT_MONTHS.length + 1}
                    className="sticky left-0 px-3 py-2 text-sm font-semibold"
                  >
                    Resultado gerencial
                  </td>
                </tr>
                <ResultValues label="RESULTADO LÍQUIDO DO MÊS" values={data.managerialResult} />
                <tr className="bg-slate-50">
                  <td
                    colSpan={SHORT_MONTHS.length + 1}
                    className="sticky left-0 px-3 py-2 text-sm font-semibold"
                  >
                    Resultado final do mês
                  </td>
                </tr>
                <ResultValues label="RESULTADO FINAL DO MÊS" values={data.finalResult} />
                <tr className="bg-slate-50">
                  <td
                    colSpan={SHORT_MONTHS.length + 1}
                    className="sticky left-0 px-3 py-2 text-sm font-semibold"
                  >
                    Saldo disponível
                  </td>
                </tr>
                <ResultValues label="ACUMULADO DO ANO" values={data.availableBalance} />
              </>
            )}
          </tbody>
        </table>
        </div>
        {hasHorizontalOverflow && (
          <HorizontalScrollRail
            railRef={bottomScrollRef}
            scrollWidth={scrollWidth}
            onScroll={(left) => syncHorizontalScroll("bottom", left)}
          />
        )}
      </div>
    </div>
  );
}

function ResultValues({ label, values }: { label: string; values: number[] }) {
  return (
    <tr className="border-t border-[var(--atria-primary)]/5">
      <td className={`${LABEL_CELL} font-medium`}>{label}</td>
      {values.map((value, index) => (
        <td key={index} className={`${MONTH_CELL} ${cellClass(value)}`}>
          {formatCurrency(value)}
        </td>
      ))}
    </tr>
  );
}

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildMonthPills,
  formatPeriodLabel,
  getCurrentPeriod,
  MONTH_NAMES_SHORT,
  shiftPeriod,
  type FinancePeriod,
} from "@/lib/financial-utils";
import { cn } from "@/lib/utils";

interface MonthSwitcherProps {
  period: FinancePeriod;
  onChange: (period: FinancePeriod) => void;
  compact?: boolean;
}

const YEAR_OPTIONS = Array.from({ length: 7 }, (_, index) => {
  const year = getCurrentPeriod().year - 3 + index;
  return year;
});

export function MonthSwitcher({ period, onChange, compact }: MonthSwitcherProps) {
  const pills = buildMonthPills(period, 2);
  const isCurrentMonth =
    period.month === getCurrentPeriod().month &&
    period.year === getCurrentPeriod().year;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-lg border-violet-200 text-violet-700 hover:bg-violet-50"
          onClick={() => onChange(shiftPeriod(period, -1))}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-[140px] rounded-lg border border-violet-200/60 bg-violet-50/70 px-2 py-1 text-center">
          <p className="text-xs font-bold capitalize text-violet-900">
            {formatPeriodLabel(period)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-lg border-violet-200 text-violet-700 hover:bg-violet-50"
          onClick={() => onChange(shiftPeriod(period, 1))}
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-4" />
        </Button>
        {!isCurrentMonth && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={() => onChange(getCurrentPeriod())}
          >
            Hoje
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--atria-primary)]/10 bg-gradient-to-br from-white via-white to-[#f7fafa] p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
              onClick={() => onChange(shiftPeriod(period, -1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <div className="min-w-[180px] rounded-xl border border-violet-200/60 bg-violet-50/60 px-4 py-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500">
                {isCurrentMonth ? "Mês atual" : "Período"}
              </p>
              <p className="text-sm font-bold capitalize text-violet-900">
                {formatPeriodLabel(period)}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
              onClick={() => onChange(shiftPeriod(period, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {!isCurrentMonth && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => onChange(getCurrentPeriod())}
              >
                Ir para hoje
              </Button>
            )}

            <label className="flex items-center gap-2 text-sm text-[var(--atria-primary)]/60">
              <span className="font-medium">Ano</span>
              <select
                value={period.year}
                onChange={(e) =>
                  onChange({ ...period, year: Number(e.target.value) })
                }
                className="h-9 rounded-xl border border-[var(--atria-primary)]/15 bg-white px-3 text-sm font-semibold text-[var(--atria-primary)] shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                {YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pills.map((pill) => {
            const label = MONTH_NAMES_SHORT[pill.month - 1];
            const key = `${pill.year}-${pill.month}`;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ month: pill.month, year: pill.year })}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                  pill.isCenter
                    ? "border-violet-300 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-[0_8px_24px_rgba(139,92,246,0.35)]"
                    : "border-[var(--atria-primary)]/10 bg-white text-[var(--atria-primary)]/70 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700",
                )}
              >
                <span>{label}</span>
                {pill.isCurrent && !pill.isCenter && (
                  <span className="ml-1.5 text-[10px] font-semibold uppercase text-emerald-600">
                    atual
                  </span>
                )}
                {pill.isCenter && pill.isCurrent && (
                  <span className="ml-1.5 text-[10px] font-semibold uppercase text-white/80">
                    atual
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

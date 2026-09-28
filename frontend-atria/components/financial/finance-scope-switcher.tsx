"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatScopeLabel,
  getCurrentScope,
  MONTH_NAMES_SHORT,
  shiftScopeYear,
  type FinanceScope,
} from "@/lib/financial-utils";
import { cn } from "@/lib/utils";

interface FinanceScopeSwitcherProps {
  scope: FinanceScope;
  onChange: (scope: FinanceScope) => void;
  compact?: boolean;
}

export function FinanceScopeSwitcher({
  scope,
  onChange,
  compact,
}: FinanceScopeSwitcherProps) {
  const current = getCurrentScope();
  const isCurrentMonth =
    scope.year === current.year && scope.month === current.month;

  return (
    <div
      data-tour="finance-period"
      className={cn(
        "flex flex-wrap items-center gap-2",
        compact ? "" : "rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-3",
      )}
    >
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-lg border-violet-200 text-violet-700 hover:bg-violet-50"
          onClick={() => onChange(shiftScopeYear(scope, -1))}
          aria-label="Ano anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-[92px] rounded-lg border border-violet-200/60 bg-violet-50/70 px-2 py-1 text-center">
          <p className="text-xs font-bold text-violet-900">
            {formatScopeLabel(scope)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-lg border-violet-200 text-violet-700 hover:bg-violet-50"
          onClick={() => onChange(shiftScopeYear(scope, 1))}
          aria-label="Próximo ano"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => onChange({ year: scope.year, month: null })}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            scope.month === null
              ? "border-violet-300 bg-violet-600 text-white"
              : "border-[var(--atria-primary)]/10 bg-white text-[var(--atria-primary)]/70 hover:bg-violet-50",
          )}
        >
          Ano todo
        </button>
        {MONTH_NAMES_SHORT.map((label, index) => {
          const month = index + 1;
          const active = scope.month === month;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange({ year: scope.year, month })}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-violet-300 bg-violet-600 text-white"
                  : "border-[var(--atria-primary)]/10 bg-white text-[var(--atria-primary)]/70 hover:bg-violet-50",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {!isCurrentMonth && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={() => onChange(getCurrentScope())}
        >
          Mês atual
        </Button>
      )}
    </div>
  );
}

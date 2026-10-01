"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import type { FinanceCategory, TransactionFilters } from "@/services/types";

interface FiltersToolbarProps {
  filters: TransactionFilters;
  categories: FinanceCategory[];
  onChange: (filters: TransactionFilters) => void;
  onClear: () => void;
}

export function FiltersToolbar({
  filters,
  categories,
  onChange,
  onClear,
}: FiltersToolbarProps) {
  const hasActiveFilters =
    filters.search ||
    filters.categoryIds.length > 0 ||
    filters.status ||
    filters.type;

  const accountOptions = categories
    .filter((category) => !filters.type || category.type === filters.type)
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "income" ? -1 : 1;
      }
      return left.name.localeCompare(right.name, "pt-BR", {
        sensitivity: "base",
      });
    })
    .map((category) => ({
      value: category.id,
      label: category.name,
      group: category.type === "income" ? "Receitas" : "Despesas",
    }));

  function handleTypeChange(type: TransactionFilters["type"]) {
    const nextCategoryIds = type
      ? filters.categoryIds.filter((id) =>
          categories.some(
            (category) => category.id === id && category.type === type,
          ),
        )
      : filters.categoryIds;

    onChange({
      ...filters,
      type,
      categoryIds: nextCategoryIds,
    });
  }

  return (
    <div className="sticky top-0 z-20 -mx-1 rounded-2xl border border-[var(--atria-primary)]/10 bg-white/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--atria-primary)]/40" />
          <Input
            value={filters.search}
            onChange={(e) =>
              onChange({ ...filters, search: e.target.value })
            }
            placeholder="Buscar por descrição..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[16rem] flex-1 items-center gap-1 sm:max-w-md">
            <SearchableMultiSelect
              id="filter-category"
              className="min-w-0 flex-1"
              values={filters.categoryIds}
              onValuesChange={(categoryIds) =>
                onChange({
                  ...filters,
                  categoryIds,
                })
              }
              options={accountOptions}
              placeholder="Todas as contas"
              searchPlaceholder="Buscar conta..."
              emptyLabel="Nenhuma conta encontrada"
            />
            {filters.categoryIds.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...filters, categoryIds: [] })}
                className="h-10 shrink-0 px-2 text-[var(--atria-primary)]/70"
                aria-label="Limpar contas selecionadas"
              >
                <X className="size-4" />
                Limpar
              </Button>
            )}
          </div>

          <select
            value={filters.status}
            onChange={(e) =>
              onChange({
                ...filters,
                status: e.target.value as TransactionFilters["status"],
              })
            }
            className="h-10 rounded-lg border border-amber-200 bg-amber-50/60 px-3 text-sm font-medium text-amber-800"
          >
            <option value="">Todos os status</option>
            <option value="paid">Recebido / pago</option>
            <option value="pending">Em aberto</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) =>
              handleTypeChange(e.target.value as TransactionFilters["type"])
            }
            className="h-10 rounded-lg border border-violet-200 bg-violet-50/60 px-3 text-sm font-medium text-violet-800"
          >
            <option value="">Todos os tipos</option>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </select>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClear}
              className="h-10 rounded-lg border-[var(--atria-primary)]/20"
            >
              <X className="size-4" />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

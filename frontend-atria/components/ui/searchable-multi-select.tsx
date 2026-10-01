"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";

interface SearchableMultiSelectProps {
  id?: string;
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  loadingLabel?: string;
}

export function SearchableMultiSelect({
  id,
  values,
  onValuesChange,
  options,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyLabel = "Nenhuma opção encontrada",
  disabled = false,
  className,
  loading = false,
  loadingLabel = "Carregando...",
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOptions = useMemo(
    () => options.filter((option) => values.includes(option.value)),
    [options, values],
  );

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(query),
    );
  }, [options, search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleValue(value: string) {
    onValuesChange(
      values.includes(value)
        ? values.filter((current) => current !== value)
        : [...values, value],
    );
  }

  function removeValue(value: string) {
    onValuesChange(values.filter((current) => current !== value));
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-left text-sm",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {loading ? (
            <span className="text-[var(--atria-primary)]/50">{loadingLabel}</span>
          ) : selectedOptions.length === 0 ? (
            <span className="text-[var(--atria-primary)]/45">{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--atria-primary)]/8 px-2.5 py-0.5 text-xs font-medium text-[var(--atria-primary)]"
              >
                <span className="truncate">{option.label}</span>
                <button
                  type="button"
                  className="rounded-full hover:bg-[var(--atria-primary)]/10"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeValue(option.value);
                  }}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))
          )}
        </div>
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-[var(--atria-primary)]/50" />
        ) : (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-[var(--atria-primary)]/50 transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-[var(--atria-primary)]/10 bg-white shadow-lg">
          <div className="border-b border-[var(--atria-primary)]/8 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--atria-primary)]/40" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 pl-9"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--atria-primary)]/45">
                {emptyLabel}
              </p>
            ) : (
              filteredOptions.map((option, index) => {
                const selected = values.includes(option.value);
                const previous = filteredOptions[index - 1];
                const showGroup =
                  Boolean(option.group) && option.group !== previous?.group;

                return (
                  <div key={option.value}>
                    {showGroup ? (
                      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--atria-primary)]/45">
                        {option.group}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={option.disabled}
                      onClick={() => toggleValue(option.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        selected
                          ? "bg-[var(--atria-primary)]/8 text-[var(--atria-primary)]"
                          : "text-[var(--atria-primary)]/80 hover:bg-[var(--atria-primary)]/5",
                        option.disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4 items-center justify-center rounded border",
                          selected
                            ? "border-[var(--atria-primary)] bg-[var(--atria-primary)] text-white"
                            : "border-[var(--atria-primary)]/25",
                        )}
                      >
                        {selected ? <Check className="size-3" /> : null}
                      </span>
                      <span className="truncate">{option.label}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

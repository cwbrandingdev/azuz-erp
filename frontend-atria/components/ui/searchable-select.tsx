"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
  /** Extra text included when filtering (e.g. account id). */
  searchText?: string;
  group?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
  loading?: boolean;
  loadingLabel?: string;
}

export function SearchableSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyLabel = "Nenhuma opção encontrada",
  disabled = false,
  className,
  allowEmpty = false,
  emptyOptionLabel = "Nenhum",
  loading = false,
  loadingLabel = "Carregando...",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const selectedLabel = useMemo(() => {
    if (loading) return loadingLabel;
    if (!value) return allowEmpty ? emptyOptionLabel : placeholder;
    return selectedOption?.label ?? placeholder;
  }, [
    allowEmpty,
    emptyOptionLabel,
    loading,
    loadingLabel,
    placeholder,
    selectedOption?.label,
    value,
  ]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => {
      const haystack = [
        option.label,
        option.description,
        option.searchText,
        option.value,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
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

  if (loading && options.length === 0) {
    return (
      <Skeleton
        className={cn("h-10 w-full rounded-lg", className)}
        aria-label={loadingLabel}
      />
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-10 w-full min-h-10 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-sm",
          selectedOption?.description && "h-auto min-h-11 py-2",
          (disabled || loading) && "cursor-not-allowed opacity-50",
        )}
      >
        <span
          className={cn(
            "flex min-w-0 flex-col",
            (!value || loading) && "text-muted-foreground",
          )}
        >
          <span className="truncate font-medium">{selectedLabel}</span>
          {selectedOption?.description ? (
            <span className="truncate text-[10px] font-normal opacity-60">
              {selectedOption.description}
            </span>
          ) : null}
        </span>
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin opacity-60" />
        ) : (
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        )}
      </button>

      {open && !loading && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-input bg-popover shadow-md">
          <div className="border-b border-input p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 pl-8"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto p-1">
            {allowEmpty && (
              <li>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                    !value && "bg-muted",
                  )}
                  onClick={() => {
                    onValueChange("");
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {emptyOptionLabel}
                  {!value && <Check className="size-4" />}
                </button>
              </li>
            )}
            {filteredOptions.length === 0 ? (
              <li className="px-2 py-3 text-center text-sm text-muted-foreground">
                {emptyLabel}
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const previous = filteredOptions[index - 1];
                const showGroup =
                  Boolean(option.group) && option.group !== previous?.group;

                return (
                  <li key={option.value}>
                    {showGroup ? (
                      <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {option.group}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={option.disabled}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                        value === option.value && "bg-muted",
                        option.disabled && "cursor-not-allowed opacity-50",
                      )}
                      onClick={() => {
                        onValueChange(option.value);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{option.label}</span>
                        {option.description ? (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                      {value === option.value && (
                        <Check className="size-4 shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

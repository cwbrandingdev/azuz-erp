"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCnaeSearch } from "@/hooks/use-company-search";
import { cn } from "@/lib/utils";

interface CnaeSearchSelectProps {
  id?: string;
  value: string;
  label?: string;
  onValueChange: (value: string, label: string) => void;
  disabled?: boolean;
  className?: string;
}

function formatCnaeCodeDisplay(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length === 7) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}-${digits[4]}/${digits.slice(5, 7)}`;
  }
  return id;
}

function formatCnaeLabel(id: string, description: string) {
  return `${formatCnaeCodeDisplay(id)} — ${description}`;
}

export function CnaeSearchSelect({
  id,
  value,
  label,
  onValueChange,
  disabled = false,
  className,
}: CnaeSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const cnaeQuery = useCnaeSearch(debouncedSearch, open);
  const options = cnaeQuery.data ?? [];

  const selectedLabel = useMemo(() => {
    if (!value) return "Busque pelo código ou nome do CNAE";
    if (label) return formatCnaeLabel(value, label);
    return value;
  }, [label, value]);

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

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 text-left text-sm",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className={cn(!value && "text-muted-foreground")}>
          {selectedLabel}
        </span>
        <ChevronDown className="size-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-input bg-popover shadow-md">
          <div className="border-b border-input p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ex.: 5611201 ou restaurante"
                className="h-9 pl-8"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto p-1">
            {cnaeQuery.isFetching ? (
              <li className="flex items-center justify-center gap-2 px-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Buscando CNAEs...
              </li>
            ) : options.length === 0 ? (
              <li className="px-2 py-3 text-center text-sm text-muted-foreground">
                Nenhum CNAE encontrado
              </li>
            ) : (
              options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                      value === option.id && "bg-muted",
                    )}
                    onClick={() => {
                      onValueChange(option.id, option.description);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <span>{formatCnaeLabel(option.id, option.description)}</span>
                    {value === option.id && <Check className="size-4" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

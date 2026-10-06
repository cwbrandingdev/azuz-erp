"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  formatLeadOrcamento,
  parseLeadOrcamento,
} from "@/lib/leads-kanban-utils";

interface LeadOrcamentoInputProps {
  id?: string;
  value: number | null | undefined;
  disabled?: boolean;
  className?: string;
  onCommit: (value: number | null) => void;
}

export function LeadOrcamentoInput({
  id,
  value,
  disabled = false,
  className,
  onCommit,
}: LeadOrcamentoInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => formatLeadOrcamento(value));

  useEffect(() => {
    if (!focused) {
      setDraft(formatLeadOrcamento(value));
    }
  }, [focused, value]);

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft("");
      setFocused(false);
      if (value != null) onCommit(null);
      return;
    }

    const next = parseLeadOrcamento(draft);
    if (next == null) {
      setDraft(formatLeadOrcamento(value));
      setFocused(false);
      return;
    }

    setDraft(formatLeadOrcamento(next));
    setFocused(false);
    if (next !== (value ?? null)) {
      onCommit(next);
    }
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={focused ? draft : formatLeadOrcamento(value)}
      placeholder="R$ 0,00"
      className={className}
      onFocus={() => {
        setFocused(true);
        setDraft(value == null ? "" : formatLeadOrcamento(value));
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      aria-label="Orçamento"
    />
  );
}

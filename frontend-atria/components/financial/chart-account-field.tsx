"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { inputClassName } from "@/components/ui/input-styles";
import type { ChartAccount } from "@/services/types";

function accountLabel(account: { code: string | null; name: string }) {
  if (!account.code) return account.name;
  const prefix = `${account.code} `;
  if (account.name.toLowerCase().startsWith(prefix.toLowerCase())) {
    return account.name;
  }
  return `${account.code} ${account.name}`;
}

interface ChartAccountFieldProps {
  accounts: ChartAccount[];
  type: "income" | "expense";
  value: string;
  onChange: (accountId: string) => void;
}

export function ChartAccountField({
  accounts,
  type,
  value,
  onChange,
}: ChartAccountFieldProps) {
  const [search, setSearch] = useState("");

  const options = useMemo(() => {
    const query = search.trim().toLowerCase();
    return accounts
      .filter((account) => account.code && !account.isGroup && account.type === type)
      .filter((account) => {
        if (!query) return true;
        return `${account.code ?? ""} ${account.name}`.toLowerCase().includes(query);
      })
      .sort((left, right) =>
        `${left.code ?? left.name}`.localeCompare(`${right.code ?? right.name}`, "pt-BR"),
      );
  }, [accounts, search, type]);

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Pesquisar..."
        aria-label="Pesquisar plano de contas"
      />
      <select
        className={inputClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Selecione...</option>
        {options.map((account) => (
          <option key={account.id} value={account.id}>
            {accountLabel(account)}
          </option>
        ))}
      </select>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FinanceSubnav } from "@/components/financial/finance-subnav";
import { financeService } from "@/services";
import type { ChartAccount } from "@/services/types";

const DRE_LABELS: Record<string, string> = {
  GROSS_REVENUE: "Receita bruta",
  DEDUCTION: "Dedução",
  VARIABLE_COST: "Custo variável",
  FIXED_EXPENSE: "Despesa fixa",
  FINANCIAL_RESULT: "Resultado financeiro",
  PROFIT_DISTRIBUTION: "Distribuição de lucro",
  TRANSFER: "Transferência",
  OTHER: "Outras",
};

const BLOCK_LABELS: Record<string, string> = {
  OPERATIONAL: "Fluxo operacional",
  FINANCIAL_MOVEMENTS: "Movimentações financeiras e dos sócios",
  OWN_ACCOUNT_TRANSFER: "Transferências entre contas",
};

export default function PlanoDeContasPage() {
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);

  useEffect(() => {
    financeService.getChartOfAccounts().then(setAccounts).catch(() => {
      toast.error("Não foi possível carregar o plano de contas.");
    });
  }, []);

  const groups = accounts.filter((account) => account.isGroup);
  const leaves = accounts.filter((account) => !account.isGroup);

  return (
    <div className="flex flex-col gap-6">
      <FinanceSubnav />
      <div data-tour="finance-coa-header">
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">Plano de Contas</h1>
        <p className="text-sm text-[var(--atria-primary)]/50">
          Contas já usadas nos lançamentos continuam aqui, classificadas no grupo correspondente.
        </p>
      </div>
      <div data-tour="finance-coa-groups" className="flex flex-col gap-4">
        {groups.map((group) => {
          const children = leaves.filter((account) => account.parentId === group.id);
          const nested = leaves.filter(
            (account) =>
              account.parentId &&
              children.some((child) => child.id === account.parentId),
          );
          const visible = [...children, ...nested];
          return (
            <section key={group.id} className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--atria-primary)]/10 px-4 py-3">
                <h2 className="font-semibold text-[var(--atria-primary)]">
                  {group.code} {group.name}
                </h2>
                <span className="text-xs text-[var(--atria-primary)]/50">
                  {DRE_LABELS[group.dreGroup ?? ""] ?? "—"} · {BLOCK_LABELS[group.cashFlowBlock] ?? group.cashFlowBlock}
                </span>
              </header>
              <ul>
                {visible.map((account) => (
                  <li
                    key={account.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--atria-primary)]/5 px-4 py-2 text-sm"
                  >
                    <span>
                    {account.code &&
                    !account.name.toLowerCase().startsWith(`${account.code.toLowerCase()} `)
                      ? `${account.code} `
                      : ""}
                    {account.name}
                    </span>
                    <span className="text-xs text-[var(--atria-primary)]/50">
                      {account.type === "income" ? "Entrada" : "Saída"} · {DRE_LABELS[account.dreGroup ?? ""] ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {leaves.some((account) => !account.parentId) && (
          <section className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-4">
            <h2 className="font-semibold">Contas sem grupo</h2>
            <ul className="mt-2">
              {leaves
                .filter((account) => !account.parentId)
                .map((account) => (
                  <li key={account.id} className="py-1 text-sm">
                    {account.name}
                  </li>
                ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

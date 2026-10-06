"use client";

import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { FinanceSubnav } from "@/components/financial/finance-subnav";
import { useChartOfAccounts } from "@/hooks/use-finance";
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

function accountLabel(account: ChartAccount) {
  if (
    account.code &&
    !account.name.toLowerCase().startsWith(`${account.code.toLowerCase()} `)
  ) {
    return `${account.code} ${account.name}`;
  }
  return account.name;
}

function sortAccounts(accounts: ChartAccount[]) {
  return [...accounts].sort((left, right) =>
    `${left.code ?? ""}${left.name}`.localeCompare(
      `${right.code ?? ""}${right.name}`,
      "pt-BR",
    ),
  );
}

export default function PlanoDeContasPage() {
  const accountsQuery = useChartOfAccounts();
  const accounts = accountsQuery.data ?? [];

  useEffect(() => {
    if (accountsQuery.isError) {
      toast.error("Não foi possível carregar o plano de contas.");
    }
  }, [accountsQuery.isError]);

  const { groups, orphans } = useMemo(() => {
    const ids = new Set(accounts.map((account) => account.id));
    const childrenByParent = new Map<string, ChartAccount[]>();

    for (const account of accounts) {
      if (!account.parentId || !ids.has(account.parentId)) continue;
      const siblings = childrenByParent.get(account.parentId) ?? [];
      siblings.push(account);
      childrenByParent.set(account.parentId, siblings);
    }

    function descendants(parentId: string): ChartAccount[] {
      const children = sortAccounts(childrenByParent.get(parentId) ?? []);
      return children.flatMap((child) => [child, ...descendants(child.id)]);
    }

    const listed = new Set<string>();
    const groupSections = sortAccounts(
      accounts.filter(
        (account) =>
          account.isGroup &&
          (!account.parentId || !ids.has(account.parentId)),
      ),
    ).map((group) => {
      listed.add(group.id);
      const children = descendants(group.id);
      for (const child of children) listed.add(child.id);
      return { group, children };
    });

    return {
      groups: groupSections,
      orphans: sortAccounts(
        accounts.filter((account) => !listed.has(account.id)),
      ),
    };
  }, [accounts]);

  return (
    <div className="flex flex-col gap-6">
      <FinanceSubnav />
      <div data-tour="finance-coa-header">
        <h1 className="text-2xl font-bold text-[var(--atria-primary)]">Categorias</h1>
        <p className="text-sm text-[var(--atria-primary)]/50">
          Tipos de receita e despesa usados nos lançamentos. Em contabilidade isso é o plano de contas.
        </p>
      </div>
      <div data-tour="finance-coa-groups" className="flex flex-col gap-4">
        {groups.map(({ group, children }) => (
          <section key={group.id} className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--atria-primary)]/10 px-4 py-3">
              <h2 className="font-semibold text-[var(--atria-primary)]">
                {accountLabel(group)}
              </h2>
              <span className="text-xs text-[var(--atria-primary)]/50">
                {DRE_LABELS[group.dreGroup ?? ""] ?? "—"} · {BLOCK_LABELS[group.cashFlowBlock] ?? group.cashFlowBlock}
              </span>
            </header>
            <ul>
              {children.length === 0 ? (
                <li className="px-4 py-3 text-sm text-[var(--atria-primary)]/50">
                  Nenhuma conta neste grupo
                </li>
              ) : (
                children.map((account) => (
                  <li
                    key={account.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--atria-primary)]/5 px-4 py-2 text-sm"
                  >
                    <span>{accountLabel(account)}</span>
                    <span className="text-xs text-[var(--atria-primary)]/50">
                      {account.type === "income" ? "Entrada" : "Saída"} · {DRE_LABELS[account.dreGroup ?? ""] ?? "—"}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>
        ))}
        {orphans.length > 0 && (
          <section className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-4">
            <h2 className="font-semibold">Contas sem grupo</h2>
            <ul className="mt-2">
              {orphans.map((account) => (
                <li key={account.id} className="py-1 text-sm">
                  {accountLabel(account)}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

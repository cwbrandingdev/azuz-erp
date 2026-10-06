"use client";

import { ContractFormDialog } from "@/components/contracts/contract-form-dialog";
import { ContractsTable } from "@/components/contracts/contracts-table";
import { useContracts } from "@/hooks/use-contracts";
import { useInvalidateContracts } from "@/hooks/use-query-invalidation";

export default function ContractsPage() {
  const contractsQuery = useContracts();
  const invalidateContracts = useInvalidateContracts();
  const contracts = contractsQuery.data;

  if (contractsQuery.isPending && !contracts) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--atria-primary)]">
            Contratos
          </h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Propostas, contratos e automação financeira de recebíveis
          </p>
        </div>
        <ContractFormDialog onSuccess={() => void invalidateContracts()} />
      </div>

      <ContractsTable
        contracts={contracts ?? []}
        onRefresh={() => void invalidateContracts()}
        loading={contractsQuery.isFetching && !contracts}
      />
    </div>
  );
}

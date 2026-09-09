"use client";

import { useCallback, useEffect, useState } from "react";
import { ContractFormDialog } from "@/components/contracts/contract-form-dialog";
import { ContractsTable } from "@/components/contracts/contracts-table";
import { contractsService } from "@/services";
import type { Contract } from "@/services/types";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contractsService.getContracts();
      setContracts(data);
    } catch {
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContracts();
  }, [loadContracts]);

  if (loading && contracts.length === 0) {
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
        <ContractFormDialog onSuccess={() => void loadContracts()} />
      </div>

      <ContractsTable
        contracts={contracts}
        onRefresh={() => void loadContracts()}
        loading={loading}
      />
    </div>
  );
}

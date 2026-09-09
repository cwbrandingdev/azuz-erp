"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { ProposalsTable } from "@/components/proposals/proposals-table";
import { Button } from "@/components/ui/button";
import { proposalsService } from "@/services";
import type { Proposal } from "@/services/types";

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProposals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await proposalsService.getProposals();
      setProposals(data);
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  if (loading && proposals.length === 0) {
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
            Propostas
          </h1>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Propostas comerciais com link público compartilhável
          </p>
        </div>
        <Button type="button" render={<Link href="/proposals/new" />}>
          <Plus className="size-4" />
          Nova proposta
        </Button>
      </div>

      <ProposalsTable
        proposals={proposals}
        loading={loading}
        onRefresh={() => void loadProposals()}
      />
    </div>
  );
}

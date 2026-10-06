"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { ProposalsTable } from "@/components/proposals/proposals-table";
import { Button } from "@/components/ui/button";
import { useProposals } from "@/hooks/use-proposals";
import { useInvalidateProposals } from "@/hooks/use-query-invalidation";

export default function ProposalsPage() {
  const proposalsQuery = useProposals();
  const invalidateProposals = useInvalidateProposals();
  const proposals = proposalsQuery.data;

  if (proposalsQuery.isPending && !proposals) {
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
        proposals={proposals ?? []}
        loading={proposalsQuery.isFetching && !proposals}
        onRefresh={() => void invalidateProposals()}
      />
    </div>
  );
}

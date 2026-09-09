"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProposalForm } from "@/components/proposals/proposal-form";
import { proposalsService } from "@/services";
import type { Proposal } from "@/services/types";

export default function EditProposalPage() {
  const params = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const data = await proposalsService.getProposal(params.id);
        if (active) setProposal(data);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (params.id) void load();
    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
        <p className="font-semibold text-red-800">Proposta não encontrada</p>
      </div>
    );
  }

  return <ProposalForm proposal={proposal} />;
}

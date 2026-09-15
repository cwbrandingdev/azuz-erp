"use client";

import { useEffect, useState } from "react";
import { AlertCircle, FileWarning } from "lucide-react";
import { PublicProposalHeader } from "@/components/proposals/public/public-proposal-header";
import { PublicProposalView } from "@/components/proposals/public/public-proposal-view";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, proposalsService } from "@/services";
import type { Proposal } from "@/services/types";

interface PublicProposalPageClientProps {
  slug: string;
}

function PublicProposalSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-16 bg-black" />
      <div className="space-y-4 bg-black px-6 py-24">
        <Skeleton className="h-4 w-40 bg-white/20" />
        <Skeleton className="h-12 w-2/3 bg-white/20" />
        <Skeleton className="h-6 w-48 bg-white/20" />
      </div>
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-16">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="aspect-[4/3] w-full" />
          <Skeleton className="aspect-[4/3] w-full" />
          <Skeleton className="aspect-[4/3] w-full" />
        </div>
      </div>
    </div>
  );
}

export function PublicProposalPageClient({
  slug,
}: PublicProposalPageClientProps) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"not_found" | "expired" | "generic" | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await proposalsService.getPublicProposal(slug);
        if (!active) return;
        if (data.expired || data.status === "expired") {
          setProposal(data);
          setError("expired");
        } else {
          setProposal(data);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("not_found");
        } else {
          setError("generic");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) return <PublicProposalSkeleton />;

  if (error === "not_found" || !proposal) {
    return (
      <div className="min-h-screen bg-white">
        <PublicProposalHeader />
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
          <Card className="w-full rounded-2xl border border-neutral-200 p-10">
            <FileWarning className="mx-auto size-10 text-neutral-400" />
            <h1 className="mt-4 text-2xl font-semibold text-neutral-900">
              Proposta não encontrada
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Este link pode estar inválido ou a proposta ainda não foi
              publicada.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (error === "expired") {
    return (
      <div className="min-h-screen bg-white">
        <PublicProposalHeader />
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
          <Card className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-10">
            <AlertCircle className="mx-auto size-10 text-amber-600" />
            <h1 className="mt-4 text-2xl font-semibold text-amber-950">
              Proposta expirada
            </h1>
            <p className="mt-2 text-sm text-amber-900/70">
              A validade desta proposta encerrou. Entre em contato com a agência
              para uma nova versão.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (error === "generic") {
    return (
      <div className="min-h-screen bg-white">
        <PublicProposalHeader />
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
          <Card className="w-full rounded-2xl border border-red-200 bg-red-50 p-10">
            <AlertCircle className="mx-auto size-10 text-red-600" />
            <h1 className="mt-4 text-2xl font-semibold text-red-950">
              Não foi possível carregar
            </h1>
            <p className="mt-2 text-sm text-red-900/70">
              Tente novamente em instantes.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicProposalHeader />
      <PublicProposalView proposal={proposal} />
    </div>
  );
}

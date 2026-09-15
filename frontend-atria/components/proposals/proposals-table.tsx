"use client";

import Link from "next/link";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatProposalCurrency,
  formatProposalDate,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_STYLES,
} from "@/lib/proposal-utils";
import { toast } from "@/lib/toast";
import { proposalsService } from "@/services";
import type { Proposal } from "@/services/types";

interface ProposalsTableProps {
  proposals: Proposal[];
  loading?: boolean;
  onRefresh: () => void;
}

export function ProposalsTable({
  proposals,
  loading,
  onRefresh,
}: ProposalsTableProps) {
  async function handleDelete(proposal: Proposal) {
    const confirmed = window.confirm(
      `Excluir a proposta "${proposal.title}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      await proposalsService.deleteProposal(proposal.id);
      toast.success("Proposta excluída");
      onRefresh();
    } catch {
      /* toast handled by api */
    }
  }

  if (!loading && proposals.length === 0) {
    return (
      <Card className="rounded-2xl border border-dashed border-[var(--atria-primary)]/20 bg-white px-6 py-12 text-center">
        <p className="font-semibold text-[var(--atria-primary)]">
          Nenhuma proposta ainda
        </p>
        <p className="mt-1 text-sm text-[var(--atria-primary)]/50">
          Crie a primeira proposta comercial.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--atria-primary)]/5 text-left text-[var(--atria-primary)]/60">
            <tr>
              <th className="px-4 py-3 font-medium">Proposta</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Validade</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((proposal) => (
              <tr
                key={proposal.id}
                className="border-t border-[var(--atria-primary)]/8"
              >
                <td className="px-4 py-3 font-medium text-[var(--atria-primary)]">
                  {proposal.title}
                </td>
                <td className="px-4 py-3 text-[var(--atria-primary)]/70">
                  {proposal.companyName}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PROPOSAL_STATUS_STYLES[proposal.status]}`}
                  >
                    {PROPOSAL_STATUS_LABELS[proposal.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--atria-primary)]/70">
                  {formatProposalDate(proposal.validUntil)}
                </td>
                <td className="px-4 py-3 text-[var(--atria-primary)]">
                  {formatProposalCurrency(proposal.totalValue)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {proposal.status === "published" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Abrir link público"
                        render={
                          <a
                            href={`/p/${proposal.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                      >
                        <ExternalLink className="size-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Editar"
                      render={<Link href={`/proposals/${proposal.id}/edit`} />}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Excluir"
                      onClick={() => void handleDelete(proposal)}
                    >
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

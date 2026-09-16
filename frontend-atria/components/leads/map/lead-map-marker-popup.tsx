"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatInstagramHandle,
  formatLeadPhone,
  formatLeadRating,
  getLeadCnaeLabel,
  getLeadCompanyNames,
} from "@/lib/lead-map-utils";
import type { Lead } from "@/services/types";

interface LeadMapMarkerPopupProps {
  lead: Lead;
  adding?: boolean;
  onAddToLeads?: (lead: Lead) => void;
}

export function LeadMapMarkerPopup({
  lead,
  adding,
  onAddToLeads,
}: LeadMapMarkerPopupProps) {
  const names = getLeadCompanyNames(lead);
  const cnae = getLeadCnaeLabel(lead);
  const phone = formatLeadPhone(lead.phone);
  const instagram = formatInstagramHandle(lead.instagram);
  const canAdd = Boolean(onAddToLeads) && !lead.kanbanTracked;

  return (
    <div className="min-w-[220px] max-w-[280px] space-y-3 p-1">
      <div className="space-y-1">
        <p className="text-sm font-semibold leading-snug text-[var(--atria-primary)]">
          {names.displayName}
        </p>
        {names.legalName && (
          <p className="text-xs text-[var(--atria-primary)]/60">
            {names.legalName}
          </p>
        )}
      </div>

      <dl className="space-y-1.5 text-xs text-[var(--atria-primary)]/80">
        <div>
          <dt className="font-medium text-[var(--atria-primary)]/50">CNAE</dt>
          <dd>{cnae ?? "Não informado"}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--atria-primary)]/50">Telefone</dt>
          <dd>{phone}</dd>
        </div>
        {formatLeadRating(lead.rating, lead.reviewsCount) && (
          <div>
            <dt className="font-medium text-[var(--atria-primary)]/50">
              Avaliação
            </dt>
            <dd>{formatLeadRating(lead.rating, lead.reviewsCount)}</dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-[var(--atria-primary)]/50">Instagram</dt>
          <dd>
            {lead.instagram ? (
              <a
                href={lead.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {instagram}
              </a>
            ) : (
              "Não informado"
            )}
          </dd>
        </div>
      </dl>

      {onAddToLeads && (
        <Button
          type="button"
          size="sm"
          className="h-8 w-full"
          disabled={!canAdd || adding}
          onClick={() => onAddToLeads(lead)}
        >
          {adding ? (
            <>
              <Loader2 className="mr-2 size-3.5 animate-spin" />
              Adicionando...
            </>
          ) : lead.kanbanTracked ? (
            "Já nos leads"
          ) : (
            "Adicionar aos Leads"
          )}
        </Button>
      )}
    </div>
  );
}

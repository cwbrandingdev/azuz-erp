"use client";

import { ExternalLink, Kanban, Loader2, Phone } from "lucide-react";
import { WhatsAppNavIcon } from "@/components/layout/whatsapp-nav-icon";
import { LeadCallButton } from "@/components/leads/lead-call-button";
import { NativeTelButton } from "@/components/leads/native-tel-button";
import { Button } from "@/components/ui/button";
import { CopyableText } from "@/components/ui/copyable-text";
import { useOptionalDialer } from "@/contexts/dialer-context";
import {
  extractCnpjFromLead,
  getLeadCnpjLabel,
  toCnpjaOfficeUrl,
} from "@/lib/lead-cnpj";
import { formatLeadOpenedAt } from "@/lib/lead-opened-at";
import {
  formatInstagramHandle,
  formatLeadRating,
  leadInstagramUrl,
} from "@/lib/lead-map-utils";
import { getLeadStatusLabel } from "@/lib/leads-kanban-utils";
import { isDialablePhone, toWhatsAppUrl } from "@/lib/lead-phone";
import { toNativeDialString } from "@/lib/native-dialer";
import type { Lead } from "@/services/types";

interface ProspectingLeadCardProps {
  lead: Lead;
  addingKanbanId?: string | null;
  showOpenedAt?: boolean;
  onAddToKanban: (lead: Lead) => void;
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--atria-primary)]/45">
        {label}
      </p>
      <div className="mt-0.5 text-[var(--atria-primary)]/80">{children}</div>
    </div>
  );
}

export function ProspectingLeadCard({
  lead,
  addingKanbanId,
  showOpenedAt = false,
  onAddToKanban,
}: ProspectingLeadCardProps) {
  const dialer = useOptionalDialer();
  const onKanban = Boolean(lead.kanbanTracked);
  const isAdding = addingKanbanId === lead.id;
  const ratingLabel = formatLeadRating(lead.rating, lead.reviewsCount);
  const openedLabel = showOpenedAt ? formatLeadOpenedAt(lead) : null;
  const cnpjDigits = extractCnpjFromLead(lead);
  const cnpjLabel = getLeadCnpjLabel(lead);
  const cnpjaUrl = cnpjDigits ? toCnpjaOfficeUrl(cnpjDigits) : null;
  const statusLabel = onKanban
    ? (lead.statusLabel ?? getLeadStatusLabel(lead.status))
    : "Fora do kanban";
  const addressText = [lead.address, lead.neighborhood, lead.city]
    .filter(Boolean)
    .join(" · ");
  const phoneCopyValue = lead.phone
    ? (toNativeDialString(lead.phone) ?? lead.phone)
    : null;
  const instagramUrl = leadInstagramUrl(lead);
  const instagramHandle = formatInstagramHandle(instagramUrl);
  const hasDialerCall = Boolean(dialer && isDialablePhone(lead.phone));
  const canNativeCall = Boolean(lead.phone && isDialablePhone(lead.phone));

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[var(--atria-primary)]/10 bg-white/80 p-4 shadow-sm">
      <div className="space-y-2 text-sm">
        <FieldBlock label="Nome">
          <CopyableText
            value={lead.name}
            copyLabel="Nome"
            textClassName="text-base font-semibold text-[var(--atria-primary)]"
          />
        </FieldBlock>

        {cnpjLabel || cnpjDigits ? (
          <FieldBlock label="CNPJ">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <CopyableText
                value={cnpjDigits ?? cnpjLabel}
                display={cnpjLabel ?? cnpjDigits}
                copyLabel="CNPJ"
                textClassName="font-mono"
              />
              {cnpjaUrl ? (
                <a
                  href={cnpjaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--atria-primary)] underline-offset-2 hover:underline"
                >
                  Ver no CNPJá
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              ) : null}
            </div>
          </FieldBlock>
        ) : null}

        <FieldBlock label="Contato">
          {lead.phone || lead.email ? (
            <div className="flex flex-col gap-1">
              {lead.phone ? (
                <CopyableText
                  value={phoneCopyValue}
                  display={lead.phone}
                  copyLabel="Telefone"
                />
              ) : null}
              {lead.email ? (
                <CopyableText value={lead.email} copyLabel="E-mail" />
              ) : null}
            </div>
          ) : (
            <p>Não informado</p>
          )}
        </FieldBlock>

        <FieldBlock label="Instagram">
          {instagramUrl && instagramHandle ? (
            <CopyableText
              value={instagramUrl}
              display={instagramHandle}
              href={instagramUrl}
              copyLabel="Instagram"
            />
          ) : (
            <p>Não informado</p>
          )}
        </FieldBlock>

        <FieldBlock label="Endereço">
          {addressText ? (
            <CopyableText
              value={addressText}
              copyLabel="Endereço"
              textClassName="whitespace-normal"
            />
          ) : (
            <p>Não informado</p>
          )}
        </FieldBlock>

        {ratingLabel ? (
          <FieldBlock label="Avaliação">
            <CopyableText value={ratingLabel} copyLabel="Avaliação" />
          </FieldBlock>
        ) : null}

        {openedLabel ? (
          <FieldBlock label="Data de abertura">
            <CopyableText value={openedLabel} copyLabel="Data de abertura" />
          </FieldBlock>
        ) : null}

        <FieldBlock label="Status">
          <CopyableText
            value={statusLabel}
            copyLabel="Status"
            textClassName={
              onKanban
                ? "font-medium text-[var(--atria-primary)]"
                : "text-[var(--atria-primary)]/55"
            }
          />
        </FieldBlock>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-1">
        <Button
          type="button"
          variant={onKanban ? "secondary" : "default"}
          className="w-full gap-2"
          disabled={onKanban || isAdding}
          onClick={() => onAddToKanban(lead)}
        >
          {isAdding ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Kanban className="size-4" />
          )}
          {onKanban ? "Já no kanban" : "Adicionar ao kanban"}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          {lead.phone ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              render={
                <a
                  href={toWhatsAppUrl(lead.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                />
              }
            >
              <WhatsAppNavIcon className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              className="w-full"
              aria-label="WhatsApp indisponível"
            >
              <WhatsAppNavIcon className="size-4" />
            </Button>
          )}

          {hasDialerCall ? (
            <LeadCallButton lead={lead} compact className="w-full" />
          ) : canNativeCall ? (
            <NativeTelButton
              phone={lead.phone}
              variant="outline"
              size="sm"
              className="w-full"
              title="Ligar"
              aria-label="Ligar"
            >
              <Phone className="size-3.5" />
            </NativeTelButton>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              className="w-full"
              aria-label="Telefone indisponível"
            >
              <Phone className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

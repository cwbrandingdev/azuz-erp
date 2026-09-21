"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Kanban,
  Loader2,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadCallButton } from "@/components/leads/lead-call-button";
import { exportLeadsToExcel } from "@/lib/leads-export";
import { LeadQualificationDialog } from "@/components/leads/lead-qualification-dialog";
import { useOptionalDialer } from "@/contexts/dialer-context";
import {
  getLeadStatusLabel,
  LEAD_STATUS_LABELS,
} from "@/lib/leads-kanban-utils";
import { isDialablePhone, toWhatsAppUrl } from "@/lib/lead-phone";
import { toast } from "@/lib/toast";
import { LeadLocationText } from "@/components/leads/lead-location-text";
import {
  formatInstagramHandle,
  formatLeadRating,
} from "@/lib/lead-map-utils";
import {
  commercialFitBadgeVariant,
  commercialFitLabel,
  readCommercialFit,
} from "@/lib/lead-qualification-utils";
import type { Lead, LeadStatus } from "@/services/types";

const STATUS_VARIANTS: Record<
  LeadStatus,
  "default" | "secondary" | "success" | "destructive" | "warning" | "outline"
> = {
  PRE_VENDA: "warning",
  APRESENTACAO: "secondary",
  REUNIAO_AGENDADA: "default",
  VENDA_FINALIZADA: "success",
  AGUARDANDO_ENTREGA: "warning",
  POS_VENDA: "success",
  NAO_TEM_INTERESSE: "destructive",
  AGUARDANDO_RESPOSTA: "outline",
};

async function copyPhone(phone: string) {
  await navigator.clipboard.writeText(phone);
  toast.success("Telefone copiado");
}

interface LeadsTableProps {
  leads: Lead[];
  loading?: boolean;
  qualifyingId?: string | null;
  addingKanbanId?: string | null;
  organizationLabel?: string;
  onQualify: (lead: Lead) => void;
  onAddToKanban: (lead: Lead) => void;
}

const LEADS_PAGE_SIZE = 30;

export function LeadsTable({
  leads,
  loading,
  qualifyingId,
  addingKanbanId,
  organizationLabel = "a empresa atual",
  onQualify,
  onAddToKanban,
}: LeadsTableProps) {
  const dialer = useOptionalDialer();
  const [exporting, setExporting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [qualificationDialogLeadId, setQualificationDialogLeadId] = useState<
    string | null
  >(null);

  const qualificationDialogLead = useMemo(() => {
    if (!qualificationDialogLeadId) {
      return null;
    }
    return (
      leads.find((item) => item.id === qualificationDialogLeadId) ?? null
    );
  }, [leads, qualificationDialogLeadId]);

  function handleQualifyClick(lead: Lead) {
    if (qualifyingId === lead.id) {
      return;
    }
    if (lead.aiScore != null) {
      setQualificationDialogLeadId(lead.id);
      return;
    }
    onQualify(lead);
  }

  const totalPages = Math.max(1, Math.ceil(leads.length / LEADS_PAGE_SIZE));

  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * LEADS_PAGE_SIZE;
    return leads.slice(start, start + LEADS_PAGE_SIZE);
  }, [leads, page]);

  const rangeStart = leads.length === 0 ? 0 : (page - 1) * LEADS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * LEADS_PAGE_SIZE, leads.length);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [leads]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  async function handleExport() {
    if (leads.length === 0) return;
    setExporting(true);
    try {
      await exportLeadsToExcel(leads);
      toast.success("Excel exportado com sucesso");
    } catch {
      toast.error("Não foi possível exportar o Excel.");
    } finally {
      setExporting(false);
    }
  }

  async function handleCopy(lead: Lead) {
    if (!lead.phone) return;
    try {
      await copyPhone(lead.phone);
      setCopiedId(lead.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === lead.id ? null : current));
      }, 1800);
    } catch {
      toast.error("Não foi possível copiar o telefone.");
    }
  }

  const dialableLeads = useMemo(
    () => leads.filter((lead) => isDialablePhone(lead.phone)),
    [leads],
  );
  const dialableOnPage = paginatedLeads.filter((lead) =>
    isDialablePhone(lead.phone),
  );
  const allPageSelected =
    dialableOnPage.length > 0 &&
    dialableOnPage.every((lead) => selectedIds.has(lead.id));
  const selectedLeads = leads.filter((lead) => selectedIds.has(lead.id));

  function toggleSelected(lead: Lead) {
    if (!isDialablePhone(lead.phone)) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(lead.id)) next.delete(lead.id);
      else next.add(lead.id);
      return next;
    });
  }

  function togglePageSelection() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allPageSelected) {
        for (const lead of dialableOnPage) next.delete(lead.id);
      } else {
        for (const lead of dialableOnPage) next.add(lead.id);
      }
      return next;
    });
  }

  function handleDialSelected() {
    if (!dialer) return;
    const targets = (selectedLeads.length > 0 ? selectedLeads : dialableLeads)
      .filter((lead) => isDialablePhone(lead.phone))
      .map((lead) => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone as string,
      }));
    dialer.enqueue(targets);
  }

  if (!loading && leads.length === 0) {
    return (
      <Card className="rounded-2xl border border-dashed border-[var(--atria-primary)]/20 bg-white px-6 py-12 text-center">
        <p className="font-semibold text-[var(--atria-primary)]">
          Nenhum lead encontrado
        </p>
        <p className="mt-1 text-sm text-[var(--atria-primary)]/50">
          Busque por cidade, categoria e bairro para prospectar no Maps.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--atria-primary)]">
            {leads.length} lead{leads.length === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-[var(--atria-primary)]/50">
            Resultados de prospecção para {organizationLabel}
            {leads.length > LEADS_PAGE_SIZE
              ? ` · exibindo ${rangeStart}–${rangeEnd} de ${leads.length}`
              : null}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {dialer && dialableLeads.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDialSelected}
              className="w-full gap-2 sm:w-auto"
            >
              <Phone className="size-4" />
              {selectedLeads.length > 0
                ? `Discar ${selectedLeads.length}`
                : `Discar ${dialableLeads.length} com telefone`}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={exporting || leads.length === 0}
            onClick={() => void handleExport()}
            className="w-full gap-2 border-[#D4BA97] bg-[#D4BA97]/20 text-[#004A4A] hover:bg-[#D4BA97]/35 sm:w-auto"
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {exporting ? "Exportando..." : "Exportar Excel"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {paginatedLeads.map((lead) => {
          const isQualifying = qualifyingId === lead.id;
          const isAdding = addingKanbanId === lead.id;
          const isCopied = copiedId === lead.id;
          const onKanban = Boolean(lead.kanbanTracked);

          return (
            <Card
              key={lead.id}
              className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  {dialer && isDialablePhone(lead.phone) && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelected(lead)}
                      className="mt-1 size-4 rounded border-[var(--atria-primary)]/30"
                      aria-label={`Selecionar ${lead.name}`}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--atria-primary)]">
                      {lead.name}
                    </p>
                  {lead.category && (
                    <p className="mt-0.5 text-xs text-[var(--atria-primary)]/50">
                      {lead.category}
                    </p>
                  )}
                  {formatLeadRating(lead.rating, lead.reviewsCount) && (
                    <p className="mt-0.5 text-xs text-[var(--atria-primary)]/50">
                      {formatLeadRating(lead.rating, lead.reviewsCount)}
                    </p>
                  )}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANTS[lead.status]}>
                  {lead.statusLabel ?? getLeadStatusLabel(lead.status)}
                </Badge>
              </div>

              <div className="mt-3 min-w-0 space-y-1.5 text-sm text-[var(--atria-primary)]/70">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">
                    {lead.phone ?? "Sem telefone"}
                  </span>
                  {lead.phone && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      onClick={() => void handleCopy(lead)}
                      title="Copiar telefone"
                    >
                      {isCopied ? (
                        <Check className="size-4 text-green-600" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  )}
                </div>
                {lead.website && (
                  <a
                    href={
                      lead.website.startsWith("http")
                        ? lead.website
                        : `https://${lead.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-xs text-[var(--atria-primary)]/50 underline-offset-2 hover:underline"
                  >
                    {lead.website}
                  </a>
                )}
                {lead.instagram && (
                  <a
                    href={lead.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-xs text-[var(--atria-primary)]/50 underline-offset-2 hover:underline"
                  >
                    {formatInstagramHandle(lead.instagram)}
                  </a>
                )}
                {(lead.neighborhood || lead.city || lead.address) && (
                  <LeadLocationText
                    lead={lead}
                    primaryClassName="text-xs text-[var(--atria-primary)]/50"
                    showAddress={Boolean(lead.address)}
                  />
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={isQualifying}
                  onClick={() => handleQualifyClick(lead)}
                >
                  {isQualifying ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {lead.aiScore != null
                    ? `Ver qualificação (${lead.aiScore})`
                    : "Qualificar"}
                </Button>
                <Button
                  type="button"
                  variant={onKanban ? "secondary" : "outline"}
                  size="sm"
                  className="w-full"
                  disabled={onKanban || isAdding}
                  onClick={() => onAddToKanban(lead)}
                >
                  {isAdding ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Kanban className="size-4" />
                  )}
                  {onKanban ? "Adicionado ao kanban" : "Adicionar ao kanban"}
                </Button>
                <LeadCallButton lead={lead} className="w-full" />
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
                      />
                    }
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled
                    className="w-full"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="hidden overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--atria-primary)]/5 hover:bg-[var(--atria-primary)]/5">
                {dialer ? (
                  <TableHead className="w-10 text-[var(--atria-primary)]/60">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePageSelection}
                      className="size-4 rounded border-[var(--atria-primary)]/30"
                      aria-label="Selecionar todos com telefone nesta página"
                    />
                  </TableHead>
                ) : null}
                <TableHead className="min-w-[180px] text-[var(--atria-primary)]/60">
                  Empresa
                </TableHead>
                <TableHead className="min-w-[150px] text-[var(--atria-primary)]/60">
                  Contato
                </TableHead>
                <TableHead className="w-[180px] max-w-[180px] text-[var(--atria-primary)]/60">
                  Local
                </TableHead>
                <TableHead className="hidden text-[var(--atria-primary)]/60 lg:table-cell">
                  Categoria
                </TableHead>
                <TableHead className="hidden text-[var(--atria-primary)]/60 md:table-cell">
                  Avaliação
                </TableHead>
                <TableHead className="text-[var(--atria-primary)]/60">
                  Status
                </TableHead>
                <TableHead className="hidden text-[var(--atria-primary)]/60 xl:table-cell">
                  Score
                </TableHead>
                <TableHead className="min-w-[280px] text-right text-[var(--atria-primary)]/60">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.map((lead) => {
                const isQualifying = qualifyingId === lead.id;
                const isAdding = addingKanbanId === lead.id;
                const isCopied = copiedId === lead.id;
                const onKanban = Boolean(lead.kanbanTracked);

                return (
                  <TableRow key={lead.id}>
                    {dialer ? (
                      <TableCell className="w-10">
                        {isDialablePhone(lead.phone) ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(lead.id)}
                            onChange={() => toggleSelected(lead)}
                            className="size-4 rounded border-[var(--atria-primary)]/30"
                            aria-label={`Selecionar ${lead.name}`}
                          />
                        ) : null}
                      </TableCell>
                    ) : null}
                    <TableCell className="max-w-[220px]">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[var(--atria-primary)]">
                          {lead.name}
                        </div>
                        {lead.website && (
                          <a
                            href={
                              lead.website.startsWith("http")
                                ? lead.website
                                : `https://${lead.website}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 block truncate text-xs text-[var(--atria-primary)]/50 underline-offset-2 hover:underline"
                          >
                            {lead.website}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[160px] text-[var(--atria-primary)]/70">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="min-w-0 flex-1 truncate">
                            {lead.phone ?? "—"}
                          </span>
                          {lead.phone && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="shrink-0"
                              onClick={() => void handleCopy(lead)}
                              title="Copiar telefone"
                            >
                              {isCopied ? (
                                <Check className="size-3.5 text-green-600" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                        {lead.email && (
                          <span className="min-w-0 truncate text-xs text-[var(--atria-primary)]/45">
                            {lead.email}
                          </span>
                        )}
                        {lead.instagram && (
                          <a
                            href={lead.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-0 truncate text-xs text-[var(--atria-primary)]/45 underline-offset-2 hover:underline"
                          >
                            {formatInstagramHandle(lead.instagram)}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="w-[180px] max-w-[180px] text-[var(--atria-primary)]/70">
                      <LeadLocationText lead={lead} className="w-full" />
                    </TableCell>
                    <TableCell className="hidden max-w-[140px] text-[var(--atria-primary)]/70 lg:table-cell">
                      <span className="block min-w-0 truncate">
                        {lead.category ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-[var(--atria-primary)]/70 md:table-cell">
                      {formatLeadRating(lead.rating, lead.reviewsCount) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[lead.status]}>
                        {lead.statusLabel ??
                          LEAD_STATUS_LABELS[lead.status] ??
                          lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-[var(--atria-primary)]/70 xl:table-cell">
                      {lead.aiScore != null ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{lead.aiScore}</span>
                          {(() => {
                            const fit = readCommercialFit(lead.rawData);
                            const label = commercialFitLabel(fit?.verdict);
                            if (!label) return null;
                            return (
                              <Badge
                                variant={commercialFitBadgeVariant(fit?.verdict)}
                                className="w-fit text-[10px]"
                              >
                                {label}
                              </Badge>
                            );
                          })()}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isQualifying}
                          onClick={() => handleQualifyClick(lead)}
                        >
                          {isQualifying ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Sparkles className="size-4" />
                          )}
                          <span className="hidden sm:inline">
                            {lead.aiScore != null
                              ? `Ver (${lead.aiScore})`
                              : "Qualificar"}
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant={onKanban ? "secondary" : "outline"}
                          size="sm"
                          disabled={onKanban || isAdding}
                          onClick={() => onAddToKanban(lead)}
                        >
                          {isAdding ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Kanban className="size-4" />
                          )}
                          <span className="hidden xl:inline">
                            {onKanban
                              ? "Adicionado ao kanban"
                              : "Adicionar ao kanban"}
                          </span>
                        </Button>
                        <LeadCallButton lead={lead} compact />
                        {lead.phone ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            render={
                              <a
                                href={toWhatsAppUrl(lead.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            }
                          >
                            <MessageCircle className="size-4" />
                            <span className="hidden xl:inline">WhatsApp</span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled
                          >
                            <MessageCircle className="size-4" />
                            <span className="hidden xl:inline">WhatsApp</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--atria-primary)]/60">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="gap-1"
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="gap-1"
            >
              Próxima
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <LeadQualificationDialog
        lead={qualificationDialogLead}
        open={qualificationDialogLeadId != null}
        onOpenChange={(open) => {
          if (!open) {
            setQualificationDialogLeadId(null);
          }
        }}
        requalifying={
          qualificationDialogLead != null &&
          qualifyingId === qualificationDialogLead.id
        }
        onRequalify={
          qualificationDialogLead
            ? () => onQualify(qualificationDialogLead)
            : undefined
        }
      />
    </div>
  );
}

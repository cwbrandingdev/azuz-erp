"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle, Phone, Save, Send } from "lucide-react";
import { LeadCallButton } from "@/components/leads/lead-call-button";
import { LeadWhatsAppPanel } from "@/components/leads/lead-whatsapp-panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getInitials } from "@/lib/kanban-utils";
import {
  getLeadStatusColor,
  getLeadStatusLabel,
} from "@/lib/leads-kanban-utils";
import { resolveMediaUrl } from "@/lib/media-url";
import { toast } from "@/lib/toast";
import { clientPortalService, leadsService, voiceService } from "@/services";
import type { Lead, LeadCall, LeadComment } from "@/services/types";

function formatCommentDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CALL_OUTCOME_LABEL: Record<string, string> = {
  INITIATED: "Iniciada",
  NO_ANSWER: "Não atendeu",
  BUSY: "Ocupado",
  FAILED: "Falhou",
  COMPLETED: "Atendeu",
  NO_INTEREST: "Sem interesse",
  INTERESTED: "Interessado",
  WHATSAPP: "WhatsApp",
  MEETING: "Reunião",
  SKIPPED: "Pulado",
};

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalClientView?: boolean;
  onUpdated?: (lead: Lead) => void;
}

const EMPTY_EDIT = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  website: "",
  instagram: "",
  category: "",
  city: "",
  neighborhood: "",
  address: "",
  source: "",
};

function formFromLead(lead: Lead) {
  return {
    name: lead.name ?? "",
    contactName: lead.contactName ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    website: lead.website ?? "",
    instagram: lead.instagram ?? "",
    category: lead.category ?? "",
    city: lead.city ?? "",
    neighborhood: lead.neighborhood ?? "",
    address: lead.address ?? "",
    source: lead.source && lead.source.toLowerCase() !== "manual" ? lead.source : "",
  };
}

export function LeadDetailDialog({
  lead,
  open,
  onOpenChange,
  portalClientView = false,
  onUpdated,
}: LeadDetailDialogProps) {
  const [comments, setComments] = useState<LeadComment[]>([]);
  const [calls, setCalls] = useState<LeadCall[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_EDIT);

  useEffect(() => {
    if (!open || !lead) return;
    setForm(formFromLead(lead));

    let cancelled = false;
    setLoadingComments(true);
    setContent("");

    const commentsRequest = portalClientView
      ? clientPortalService.getPortalLeadComments(lead.id)
      : leadsService.getLeadComments(lead.id);

    commentsRequest
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingComments(false);
      });

    if (!portalClientView) {
      setLoadingCalls(true);
      voiceService
        .listLeadCalls(lead.id)
        .then((data) => {
          if (!cancelled) setCalls(data);
        })
        .catch(() => {
          if (!cancelled) setCalls([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingCalls(false);
        });
    } else {
      setCalls([]);
    }

    return () => {
      cancelled = true;
    };
  }, [open, lead, portalClientView]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!lead) return;

    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Escreva um comentário.");
      return;
    }

    const optimisticId = `temp-${Date.now()}`;
    const optimistic: LeadComment = {
      id: optimisticId,
      content: trimmed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: "me",
        name: "Você",
        avatarUrl: null,
      },
    };

    setComments((current) => [...current, optimistic]);
    setContent("");
    setSubmitting(true);

    try {
      const created = portalClientView
        ? await clientPortalService.createPortalLeadComment(lead.id, trimmed)
        : await leadsService.createLeadComment(lead.id, trimmed);
      setComments((current) =>
        current.map((comment) =>
          comment.id === optimisticId ? created : comment,
        ),
      );
    } catch {
      setComments((current) =>
        current.filter((comment) => comment.id !== optimisticId),
      );
      setContent(trimmed);
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(field: keyof typeof EMPTY_EDIT, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!lead || portalClientView) return;

    const name = form.name.trim();
    if (!name) {
      toast.error("Informe o nome da empresa ou contato.");
      return;
    }

    setSaving(true);
    try {
      const updated = await leadsService.updateLead(lead.id, {
        name,
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        instagram: form.instagram.trim(),
        category: form.category.trim(),
        city: form.city.trim(),
        neighborhood: form.neighborhood.trim(),
        address: form.address.trim(),
        source: form.source.trim(),
      });
      onUpdated?.(updated);
      toast.success("Lead atualizado.");
    } catch {
      /* toast handled by api */
    } finally {
      setSaving(false);
    }
  }

  if (!lead) return null;

  const statusColor = lead.statusColor ?? getLeadStatusColor(lead.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-[var(--atria-primary)]/10 px-6 py-4">
          <DialogTitle className="text-[var(--atria-primary)]">
            {form.name.trim() || lead.name}
          </DialogTitle>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge
              variant="outline"
              style={{ borderColor: `${statusColor}66`, color: statusColor }}
            >
              {getLeadStatusLabel(lead.status)}
            </Badge>
            {(form.category || lead.category) && (
              <Badge variant="secondary">
                {form.category || lead.category}
              </Badge>
            )}
            {form.source && (
              <Badge variant="outline">{form.source}</Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {portalClientView ? (
            <div className="space-y-2 text-sm text-[var(--atria-primary)]/70">
              {lead.contactName && <p>Fala com: {lead.contactName}</p>}
              <p>{lead.phone ?? "Sem telefone"}</p>
              {lead.email && <p>{lead.email}</p>}
              {(lead.neighborhood || lead.city || lead.address) && (
                <p>
                  {[lead.address, lead.neighborhood, lead.city]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
          ) : (
            <form
              onSubmit={(event) => void handleSave(event)}
              className="space-y-3 rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.02] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--atria-primary)]">
                  Dados do lead
                </h3>
                <LeadCallButton lead={{ ...lead, ...form, phone: form.phone || lead.phone }} />
              </div>
              <Field>
                <FieldLabel htmlFor="lead-edit-name">Empresa / Nome</FieldLabel>
                <Input
                  id="lead-edit-name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lead-edit-contact">
                  Com quem estamos falando
                </FieldLabel>
                <Input
                  id="lead-edit-contact"
                  value={form.contactName}
                  onChange={(event) =>
                    updateField("contactName", event.target.value)
                  }
                  placeholder="Ex.: Maria Silva"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="lead-edit-phone">Telefone</FieldLabel>
                  <Input
                    id="lead-edit-phone"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lead-edit-email">E-mail</FieldLabel>
                  <Input
                    id="lead-edit-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="lead-edit-website">Website</FieldLabel>
                  <Input
                    id="lead-edit-website"
                    value={form.website}
                    onChange={(event) =>
                      updateField("website", event.target.value)
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lead-edit-instagram">Instagram</FieldLabel>
                  <Input
                    id="lead-edit-instagram"
                    value={form.instagram}
                    onChange={(event) =>
                      updateField("instagram", event.target.value)
                    }
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="lead-edit-category">Categoria</FieldLabel>
                  <Input
                    id="lead-edit-category"
                    value={form.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lead-edit-source">Origem</FieldLabel>
                  <Input
                    id="lead-edit-source"
                    value={form.source}
                    onChange={(event) =>
                      updateField("source", event.target.value)
                    }
                    placeholder="Ex.: indicação, Instagram"
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="lead-edit-city">Cidade</FieldLabel>
                  <Input
                    id="lead-edit-city"
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lead-edit-neighborhood">Bairro</FieldLabel>
                  <Input
                    id="lead-edit-neighborhood"
                    value={form.neighborhood}
                    onChange={(event) =>
                      updateField("neighborhood", event.target.value)
                    }
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="lead-edit-address">Endereço</FieldLabel>
                <Input
                  id="lead-edit-address"
                  value={form.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                />
              </Field>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="gap-2 bg-[var(--atria-primary)] text-white"
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Salvar alterações
                </Button>
              </div>
            </form>
          )}

          {!portalClientView && (
            <LeadWhatsAppPanel
              leadId={lead.id}
              phone={form.phone || lead.phone}
            />
          )}

          {!portalClientView && (
            <section className="rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.02] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Phone className="size-4 text-[var(--atria-primary)]/60" />
                <h3 className="text-sm font-semibold text-[var(--atria-primary)]">
                  Ligações
                </h3>
              </div>
              {loadingCalls ? (
                <div className="flex min-h-16 items-center justify-center">
                  <Loader2 className="size-4 animate-spin text-[var(--atria-primary)]" />
                </div>
              ) : calls.length === 0 ? (
                <p className="text-xs text-[var(--atria-primary)]/45">
                  Nenhuma ligação registrada ainda.
                </p>
              ) : (
                <ul className="space-y-2">
                  {calls.map((call) => (
                    <li
                      key={call.id}
                      className="flex items-start justify-between gap-3 text-xs text-[var(--atria-primary)]/70"
                    >
                      <div>
                        <p className="font-medium text-[var(--atria-primary)]">
                          {CALL_OUTCOME_LABEL[call.outcome] ?? call.outcome}
                        </p>
                        <p>
                          {call.user?.name ?? "Você"} ·{" "}
                          {formatCommentDate(call.startedAt)}
                          {call.durationSeconds
                            ? ` · ${call.durationSeconds}s`
                            : ""}
                        </p>
                        {call.notes && (
                          <p className="mt-0.5 text-[var(--atria-primary)]/50">
                            {call.notes}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.02] p-4">
            <div className="mb-3 flex items-center gap-2">
              <MessageCircle className="size-4 text-[var(--atria-primary)]/60" />
              <h3 className="text-sm font-semibold text-[var(--atria-primary)]">
                Comentários
              </h3>
            </div>

            {loadingComments ? (
              <div className="flex min-h-24 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-[var(--atria-primary)]" />
              </div>
            ) : comments.length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--atria-primary)]/45">
                Nenhum comentário ainda.
              </p>
            ) : (
              <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
                {comments.map((comment) => {
                  const src = resolveMediaUrl(comment.user.avatarUrl);
                  return (
                    <div key={comment.id} className="flex gap-2.5">
                      <Avatar className="size-8 shrink-0">
                        {src && (
                          <AvatarImage src={src} alt={comment.user.name} />
                        )}
                        <AvatarFallback className="bg-[var(--atria-accent)] text-[10px] font-semibold text-[var(--atria-primary)]">
                          {getInitials(comment.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-[var(--atria-primary)]/8">
                        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-xs font-semibold text-[var(--atria-primary)]">
                            {comment.user.name}
                          </p>
                          <p className="text-[10px] text-[var(--atria-primary)]/45">
                            {formatCommentDate(comment.createdAt)}
                          </p>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-[var(--atria-primary)]/80">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-2">
              <Field>
                <FieldLabel htmlFor="lead-comment" className="sr-only">
                  Novo comentário
                </FieldLabel>
                <textarea
                  id="lead-comment"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Escreva um comentário..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                />
              </Field>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !content.trim()}
                  className="gap-2"
                >
                  {submitting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  Comentar
                </Button>
              </div>
            </form>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "@/lib/toast";
import { leadsService } from "@/services";
import { createJhonatanAppointment } from "@/services/jhonatan-calendar.service";
import type { Lead } from "@/services/types";
import { toSaoPauloIso } from "./calendar-time";

interface JhonatanBookingDialogProps {
  open: boolean;
  initialStart: string;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function JhonatanBookingDialog({
  open,
  initialStart,
  onOpenChange,
  onCreated,
}: JhonatanBookingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? (
          <BookingForm
            key={initialStart}
            initialStart={initialStart}
            onClose={() => onOpenChange(false)}
            onCreated={onCreated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BookingForm({
  initialStart,
  onClose,
  onCreated,
}: {
  initialStart: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [leadId, setLeadId] = useState("");
  const [contactName, setContactName] = useState("");
  const [briefing, setBriefing] = useState("");
  const [startAt, setStartAt] = useState(initialStart);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    leadsService
      .listLeads()
      .then((items) => {
        if (!cancelled) setLeads(items);
      })
      .catch(() => {
        if (!cancelled) setLeads([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingLeads(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContact = contactName.trim();
    const trimmedBriefing = briefing.trim();
    if (!trimmedTitle || !startAt) {
      toast.error("Preencha o título e o horário.");
      return;
    }
    if (!leadId && !trimmedContact) {
      toast.error("Escolha um lead ou informe o nome do contato.");
      return;
    }

    setSaving(true);
    try {
      await createJhonatanAppointment({
        title: trimmedTitle,
        startAt: toSaoPauloIso(startAt),
        ...(leadId ? { leadId } : { contactName: trimmedContact }),
        ...(trimmedBriefing ? { briefing: trimmedBriefing } : {}),
      });
      toast.success("Reunião marcada na agenda do Jhonatan.");
      onCreated();
      onClose();
    } catch {
      // apiRequest already shows the error toast.
    } finally {
      setSaving(false);
    }
  }

  const leadOptions = leads.map((lead) => ({
    value: lead.id,
    label: lead.contactName?.trim()
      ? `${lead.name} · ${lead.contactName.trim()}`
      : lead.name,
  }));

  return (
    <>
      <DialogHeader>
        <DialogTitle className="pr-6 text-[var(--atria-primary)]">
          Marcar reunião
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <FieldGroup>
            <Field>
              <FieldLabel htmlFor="jhonatan-title">Título</FieldLabel>
              <Input
                id="jhonatan-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Reunião com o Jhonatan"
                maxLength={255}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="jhonatan-lead">Lead</FieldLabel>
              <SearchableSelect
                id="jhonatan-lead"
                value={leadId}
                onValueChange={setLeadId}
                options={leadOptions}
                placeholder="Sem lead"
                searchPlaceholder="Buscar lead..."
                emptyLabel="Nenhum lead encontrado"
                allowEmpty
                emptyOptionLabel="Sem lead"
                loading={loadingLeads}
              />
            </Field>
            {leadId ? null : (
              <Field>
                <FieldLabel htmlFor="jhonatan-contact">
                  Nome do contato
                </FieldLabel>
                <Input
                  id="jhonatan-contact"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  maxLength={255}
                  required
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="jhonatan-briefing">
                Briefing da empresa
              </FieldLabel>
              <textarea
                id="jhonatan-briefing"
                value={briefing}
                onChange={(event) => setBriefing(event.target.value)}
                rows={5}
                maxLength={5000}
                placeholder="Contexto da empresa para o Jhonatan: o que fazem, o que foi conversado e o objetivo da reunião."
                className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="jhonatan-start">Data e hora</FieldLabel>
              <Input
                id="jhonatan-start"
                type="datetime-local"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
                required
              />
            </Field>
            <p className="text-xs text-[var(--atria-primary)]/55">
              A reunião dura 1 hora. Se o horário já estiver ocupado, a
              marcação não é salva.
            </p>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Marcar
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}

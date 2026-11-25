"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, Plus, Trash2, Video } from "lucide-react";
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
import { QuickDateTimePicker } from "@/components/ui/quick-datetime-picker";
import { formatEventDateTime } from "@/lib/calendar-utils";
import { toast } from "@/lib/toast";
import { leadsService } from "@/services";
import type { Lead, LeadMeeting } from "@/services/types";

const MAX_GUEST_EMAILS = 10;

interface LeadMeetingDialogProps {
  lead: Lead;
  meeting?: LeadMeeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (lead: Lead) => void;
}

export function LeadMeetingDialog({
  lead,
  meeting,
  open,
  onOpenChange,
  onCreated,
}: LeadMeetingDialogProps) {
  const [title, setTitle] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmails, setGuestEmails] = useState<string[]>([""]);
  const [startAt, setStartAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<LeadMeeting | null>(null);
  const [googleConnected, setGoogleConnected] = useState(true);
  const wasOpen = useRef(false);

  const filledEmails = guestEmails
    .map((email) => email.trim())
    .filter(Boolean);

  function updateEmail(index: number, value: string) {
    setGuestEmails((current) =>
      current.map((email, i) => (i === index ? value : email)),
    );
  }

  function addEmail() {
    setGuestEmails((current) => [...current, ""]);
  }

  function removeEmail(index: number) {
    setGuestEmails((current) => current.filter((_, i) => i !== index));
  }

  useEffect(() => {
    if (open && !wasOpen.current) {
      if (meeting) {
        setTitle(meeting.title);
        setGuestName(meeting.guestName);
        setGuestEmails(
          meeting.guestEmails.length > 0 ? meeting.guestEmails : [""],
        );
        setStartAt(toDateTimeLocal(meeting.startAt));
      } else {
        setTitle("");
        setGuestName(lead.contactName?.trim() || "");
        setGuestEmails([lead.email?.trim() || ""]);
        setStartAt(defaultMeetingStart());
      }
      setCreated(null);
      setGoogleConnected(true);
    }
    wasOpen.current = open;
  }, [open, meeting, lead.contactName, lead.email]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedGuest = guestName.trim();
    if (!trimmedTitle || !trimmedGuest || !startAt) {
      toast.error("Preencha o nome, a data e o participante.");
      return;
    }

    setSaving(true);
    try {
      if (meeting) {
        const result = await leadsService.updateLeadMeeting(
          lead.id,
          meeting.id,
          {
            title: trimmedTitle,
            guestName: trimmedGuest,
            guestEmails: filledEmails,
            startAt: toSaoPauloIso(startAt),
          },
        );
        onCreated(result.lead);
        if (result.googleSynced) {
          toast.success("Reunião atualizada.");
        } else {
          toast.warning(
            "Reunião atualizada só no sistema. O evento no Google Agenda não foi encontrado.",
          );
        }
        handleOpenChange(false);
        return;
      }

      const result = await leadsService.createLeadMeeting(lead.id, {
        title: trimmedTitle,
        guestName: trimmedGuest,
        guestEmails: filledEmails,
        startAt: toSaoPauloIso(startAt),
      });
      setCreated(result.lead.meeting ?? null);
      setGoogleConnected(result.googleConnected);
      onCreated(result.lead);
      if (result.lead.meeting?.meetUrl) {
        toast.success("Reunião criada no Google Meet.");
      } else {
        toast.success("Reunião criada.");
      }
    } catch {
      // apiRequest already shows the error toast.
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6 text-[var(--atria-primary)]">
            {meeting ? "Editar reunião" : "Criar reunião"}
          </DialogTitle>
        </DialogHeader>

        {created ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--atria-primary)]">
              {created.title} com {created.guestName}
            </p>
            <p className="text-xs text-[var(--atria-primary)]/65">
              {formatEventDateTime(created.startAt)}
            </p>
            {created.meetUrl ? (
              <div className="flex flex-col gap-2">
                <a
                  href={created.meetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm text-[var(--atria-accent)] underline"
                >
                  {created.meetUrl}
                </a>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCopy(created.meetUrl!)}
                >
                  <Copy className="size-3.5" />
                  Copiar link
                </Button>
              </div>
            ) : (
              <p className="text-xs text-[var(--atria-primary)]/65">
                {googleConnected
                  ? "A reunião foi criada, sem link do Meet."
                  : "A reunião foi criada. O link do Google Meet é gerado quando o Google Calendar está conectado."}
              </p>
            )}
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`meeting-title-${lead.id}`}>
                  Nome da reunião
                </FieldLabel>
                <Input
                  id={`meeting-title-${lead.id}`}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={`Reunião com ${lead.name}`}
                  maxLength={255}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`meeting-guest-${lead.id}`}>
                  Nome do participante
                </FieldLabel>
                <Input
                  id={`meeting-guest-${lead.id}`}
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  maxLength={255}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>E-mails dos participantes</FieldLabel>
                <div className="space-y-2">
                  {guestEmails.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="email"
                        value={email}
                        onChange={(event) =>
                          updateEmail(index, event.target.value)
                        }
                        placeholder="cliente@empresa.com"
                        maxLength={255}
                        aria-label={`E-mail ${index + 1}`}
                      />
                      {guestEmails.length > 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeEmail(index)}
                          aria-label="Remover e-mail"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  {guestEmails.length < MAX_GUEST_EMAILS ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEmail}
                    >
                      <Plus className="size-3.5" />
                      Adicionar e-mail
                    </Button>
                  ) : null}
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor={`meeting-start-${lead.id}`}>
                  Data e hora
                </FieldLabel>
                <QuickDateTimePicker
                  id={`meeting-start-${lead.id}`}
                  value={startAt}
                  onChange={setStartAt}
                />
              </Field>
              <p className="text-xs text-[var(--atria-primary)]/55">
                A reunião dura 1 hora
                {filledEmails.length > 0
                  ? ` e o convite vai para ${filledEmails.join(", ")}. Só quem usa esses e-mails entra direto; os demais precisam pedir para entrar`
                  : ""}
                .
              </p>
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Video className="size-3.5" />
                )}
                {meeting ? "Salvar alterações" : "Criar reunião"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function defaultMeetingStart() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toSaoPauloIso(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  if (!match) return value;
  return `${match[1]}T${match[2]}:00-03:00`;
}

function toDateTimeLocal(iso: string) {
  const formatted = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return formatted.replace(" ", "T");
}

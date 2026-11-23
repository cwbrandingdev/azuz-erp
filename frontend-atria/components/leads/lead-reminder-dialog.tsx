"use client";

import { useEffect, useRef, useState } from "react";
import { BellPlus, Loader2 } from "lucide-react";
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
import { toast } from "@/lib/toast";
import { leadsService } from "@/services";
import type { Lead } from "@/services/types";

interface LeadReminderDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function LeadReminderDialog({
  lead,
  open,
  onOpenChange,
  onCreated,
}: LeadReminderDialogProps) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setTitle("");
      setDueAt(defaultReminderTime());
    }
    wasOpen.current = open;
  }, [open]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !dueAt) {
      toast.error("Preencha o título e a data do lembrete.");
      return;
    }

    setSaving(true);
    try {
      await leadsService.createLeadReminder(lead.id, {
        title: trimmedTitle,
        dueDate: toSaoPauloIso(dueAt),
      });
      toast.success("Lembrete criado. Você será avisado na hora marcada.");
      onCreated?.();
      onOpenChange(false);
    } catch {
      // apiRequest já mostra o toast de erro.
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6 text-[var(--atria-primary)]">
            Novo lembrete
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`reminder-title-${lead.id}`}>
                O que lembrar
              </FieldLabel>
              <Input
                id={`reminder-title-${lead.id}`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={`Ligar para ${lead.name}`}
                maxLength={255}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`reminder-due-${lead.id}`}>
                Data e hora
              </FieldLabel>
              <Input
                id={`reminder-due-${lead.id}`}
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                required
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <BellPlus className="size-3.5" />
              )}
              Criar lembrete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaultReminderTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toSaoPauloIso(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  if (!match) return value;
  return `${match[1]}T${match[2]}:00-03:00`;
}

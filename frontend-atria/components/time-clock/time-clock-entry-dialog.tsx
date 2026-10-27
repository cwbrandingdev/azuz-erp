"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTimeClockMutations } from "@/hooks/use-time-clock";
import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "@/lib/datetime-local";
import { TIME_CLOCK_TYPE_LABELS } from "@/lib/time-clock-format";
import { toast } from "@/lib/toast";
import type { TimeClockEntry, TimeClockEntryType } from "@/services/types";

const SELECT_CLASS_NAME =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

interface TeamMemberOption {
  id: string;
  name: string;
}

interface TimeClockEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TeamMemberOption[];
  /** When set, the dialog corrects this entry instead of creating one. */
  entry?: TimeClockEntry | null;
}

export function TimeClockEntryDialog({
  open,
  onOpenChange,
  members,
  entry,
}: TimeClockEntryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Remounting resets the form whenever another entry is opened. */}
        <EntryForm
          key={entry?.id ?? "new"}
          members={members}
          entry={entry ?? null}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EntryForm({
  members,
  entry,
  onDone,
}: {
  members: TeamMemberOption[];
  entry: TimeClockEntry | null;
  onDone: () => void;
}) {
  const { createManual, update } = useTimeClockMutations();
  const [userId, setUserId] = useState(entry?.userId ?? "");
  const [type, setType] = useState<TimeClockEntryType>(entry?.type ?? "IN");
  const [punchedAt, setPunchedAt] = useState(
    toDateTimeLocalValue(entry?.punchedAt),
  );
  const [note, setNote] = useState("");

  const isEditing = entry !== null;
  const isSaving = createManual.isPending || update.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const punchedAtIso = fromDateTimeLocalValue(punchedAt);
    if (!punchedAtIso) {
      toast.error("Informe a data e a hora da marcação.");
      return;
    }
    if (!note.trim()) {
      toast.error("Informe o motivo da alteração.");
      return;
    }

    try {
      if (isEditing) {
        await update.mutateAsync({
          id: entry.id,
          data: { type, punchedAt: punchedAtIso, note: note.trim() },
        });
      } else {
        await createManual.mutateAsync({
          userId,
          type,
          punchedAt: punchedAtIso,
          note: note.trim(),
        });
      }
      toast.success(isEditing ? "Marcação corrigida." : "Marcação adicionada.");
      onDone();
    } catch {
      // API errors are already surfaced as toasts by apiRequest.
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <DialogHeader>
        <DialogTitle className="text-[var(--atria-primary)]">
          {isEditing ? "Corrigir marcação" : "Adicionar marcação"}
        </DialogTitle>
        <DialogDescription>
          A alteração fica registrada com o seu nome e o motivo informado.
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className="py-4">
        {!isEditing ? (
          <Field>
            <FieldLabel htmlFor="time-clock-user">Colaborador</FieldLabel>
            <select
              id="time-clock-user"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              className={SELECT_CLASS_NAME}
              required
            >
              <option value="">Selecione o colaborador</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor="time-clock-type">Tipo</FieldLabel>
          <select
            id="time-clock-type"
            value={type}
            onChange={(event) =>
              setType(event.target.value as TimeClockEntryType)
            }
            className={SELECT_CLASS_NAME}
          >
            {Object.entries(TIME_CLOCK_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field>
          <FieldLabel htmlFor="time-clock-punched-at">Data e hora</FieldLabel>
          <Input
            id="time-clock-punched-at"
            type="datetime-local"
            value={punchedAt}
            onChange={(event) => setPunchedAt(event.target.value)}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="time-clock-note">Motivo</FieldLabel>
          <Input
            id="time-clock-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ex: Esqueceu de bater a saída"
            maxLength={500}
            required
          />
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSaving || (!isEditing && !userId)}
          className="bg-[var(--atria-primary)] text-white"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}

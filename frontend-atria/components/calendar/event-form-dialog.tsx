"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AssigneeOrGroupSelect } from "@/components/users/assignee-or-group-select";
import {
  getEventDeliveryAt,
  getEventPublicationAt,
  isValidReferenceUrl,
} from "@/lib/calendar-utils";
import { invalidateTasksCache } from "@/lib/task-cache";
import { toast } from "@/lib/toast";
import {
  calendarService,
  clientsService,
  userGroupsService,
  ApiError,
} from "@/services";
import type {
  CalendarEvent,
  Client,
  TeamMember,
  UserGroup,
} from "@/services/types";
import { useQueryClient } from "@tanstack/react-query";

interface EventFormDialogProps {
  defaultDate?: Date;
  defaultClientId?: string | null;
  event?: CalendarEvent | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function EventFormDialog({
  defaultDate,
  defaultClientId = null,
  event = null,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  trigger,
}: EventFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(event);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const dateStr = (defaultDate ?? new Date()).toISOString().split("T")[0];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(dateStr);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [category, setCategory] = useState<
    "meeting" | "deadline" | "publish" | "other"
  >("meeting");
  const [assigneeId, setAssigneeId] = useState("");
  const [assignedGroupId, setAssignedGroupId] = useState("");
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setOptionsLoading(true);
    Promise.all([
      calendarService.getTeamMembers().catch(() => [] as TeamMember[]),
      clientsService.getClients().catch(() => [] as Client[]),
      userGroupsService.getUserGroups().catch(() => [] as UserGroup[]),
    ])
      .then(([team, clientList, nextGroups]) => {
        if (cancelled) return;
        setMembers(team);
        setClients(clientList);
        setGroups(nextGroups);
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (event) {
      const start = new Date(getEventPublicationAt(event));
      const end = new Date(getEventDeliveryAt(event));
      setTitle(event.title);
      setDescription(event.description ?? "");
      setDate(start.toISOString().split("T")[0]);
      setStartTime(start.toTimeString().slice(0, 5));
      setEndTime(end.toTimeString().slice(0, 5));
      setCategory(event.category);
      setAssignedGroupId(
        event.assignedGroupId ?? event.assignedGroup?.id ?? "",
      );
      setAssigneeId(
        event.assignedGroupId || event.assignedGroup?.id
          ? ""
          : (event.assignee?.id ?? ""),
      );
      setClientId(event.clientId ?? "");
      setReferenceUrl(event.referenceUrl ?? "");
      setIsPending(event.isPending);
      return;
    }

    setTitle("");
    setDescription("");
    setDate((defaultDate ?? new Date()).toISOString().split("T")[0]);
    setStartTime("09:00");
    setEndTime("10:00");
    setCategory("meeting");
    setAssigneeId("");
    setAssignedGroupId("");
    setClientId(defaultClientId ?? "");
    setReferenceUrl("");
    setIsPending(false);
    setError(null);
  }, [open, event, defaultDate, defaultClientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (referenceUrl.trim() && !isValidReferenceUrl(referenceUrl.trim())) {
      setError("Informe um link válido começando com http:// ou https://");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startAt = new Date(`${date}T${startTime}:00`).toISOString();
      const endAt = new Date(`${date}T${endTime}:00`).toISOString();
      const payload = {
        title,
        description: description || undefined,
        startAt,
        endAt,
        category,
        isPending,
        assigneeId: assignedGroupId ? undefined : assigneeId || undefined,
        assignedGroupId: assignedGroupId || undefined,
        clientId: clientId || undefined,
        referenceUrl: referenceUrl.trim() || undefined,
      };

      if (isEdit && event) {
        await calendarService.updateEvent(event.id, {
          title,
          description: description || undefined,
          startAt,
          endAt,
          category,
          isPending,
          assigneeId: assignedGroupId ? null : assigneeId || null,
          assignedGroupId: assignedGroupId || null,
          clientId: clientId ? clientId : null,
          referenceUrl: referenceUrl.trim() ? referenceUrl.trim() : null,
        });
        toast.success("Evento atualizado com sucesso!");
      } else {
        await calendarService.createEvent(payload);
        toast.success("Evento criado com sucesso!");
      }

      setOpen(false);
      await invalidateTasksCache(queryClient);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `Não foi possível ${isEdit ? "atualizar" : "criar"} o evento.`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-[var(--atria-primary)]">
              {isEdit ? "Editar Evento" : "Novo Evento"}
            </DialogTitle>
          </DialogHeader>

          <FieldGroup className="py-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <Field>
              <FieldLabel htmlFor="evt-title">Título</FieldLabel>
              <Input
                id="evt-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="evt-desc">Descrição</FieldLabel>
              <Input
                id="evt-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel htmlFor="evt-date">Data de Publicação</FieldLabel>
                <Input
                  id="evt-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="evt-start">Publicação</FieldLabel>
                <Input
                  id="evt-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="evt-end">Entrega</FieldLabel>
                <Input
                  id="evt-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="evt-client">Cliente</FieldLabel>
                <select
                  id="evt-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">Sem cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.companyName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field>
                <FieldLabel htmlFor="evt-cat">Categoria</FieldLabel>
                <select
                  id="evt-cat"
                  value={category}
                  onChange={(e) =>
                    setCategory(
                      e.target.value as
                        | "meeting"
                        | "deadline"
                        | "publish"
                        | "other",
                    )
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="meeting">Reunião</option>
                  <option value="deadline">Prazo</option>
                  <option value="publish">Publicação</option>
                  <option value="other">Outro</option>
                </select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="evt-reference">
                Link de Referência
              </FieldLabel>
              <Input
                id="evt-reference"
                type="url"
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="https://figma.com/... ou meet.google.com/..."
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="evt-assignee">Responsável</FieldLabel>
              <AssigneeOrGroupSelect
                id="evt-assignee"
                members={members}
                groups={groups}
                assigneeId={assigneeId}
                assignedGroupId={assignedGroupId}
                onChange={(next) => {
                  setAssigneeId(next.assigneeId);
                  setAssignedGroupId(next.assignedGroupId);
                }}
                loading={optionsLoading}
                allowEmpty
                emptyOptionLabel="Nenhum"
                placeholder="Selecione uma pessoa ou grupo"
              />
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPending}
                onChange={(e) => setIsPending(e.target.checked)}
                className="rounded"
              />
              Marcar como pendente
            </label>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90"
            >
              {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

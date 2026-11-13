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
import { ReferenceUrlField } from "@/components/ui/reference-url-field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCreateTaskMutation } from "@/hooks/use-task-mutations";
import { fromDateTimeLocalValue } from "@/lib/datetime-local";
import {
  DEFAULT_TASK_CONTENT_TYPE,
  defaultProductionPhaseForContentType,
  isSocialContentType,
} from "@/lib/task-content-type";
import { TaskContentTypePicker } from "@/components/kanban/task-content-type-picker";
import { toast } from "@/lib/toast";
import {
  ApiError,
  calendarService,
  clientsService,
} from "@/services";
import type {
  Client,
  KanbanTask,
  KanbanTaskContentType,
  TeamMember,
} from "@/services/types";

interface CreateTaskDialogProps {
  onSuccess: (task: KanbanTask) => void;
}

export function CreateTaskDialog({ onSuccess }: CreateTaskDialogProps) {
  const createTaskMutation = useCreateTaskMutation();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState<KanbanTaskContentType>(
    DEFAULT_TASK_CONTENT_TYPE,
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [clientId, setClientId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setOptionsLoading(true);
    Promise.all([
      calendarService.getTeamMembers().catch(() => [] as TeamMember[]),
      clientsService
        .getClients({ activeOnly: true })
        .catch(() => [] as Client[]),
    ])
      .then(([nextMembers, nextClients]) => {
        if (cancelled) return;
        setMembers(nextMembers);
        setClients(nextClients);
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setContentType(DEFAULT_TASK_CONTENT_TYPE);
    setAssigneeIds([]);
    setClientId("");
    setDeliveryDate("");
    setPublicationDate("");
    setReferenceUrl("");
    setError(null);
  }

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const social = isSocialContentType(contentType);
      const created = await createTaskMutation.mutateAsync({
        title,
        description: description || undefined,
        contentType,
        productionPhase:
          defaultProductionPhaseForContentType(contentType) ?? undefined,
        assigneeIds,
        clientId: clientId || undefined,
        deliveryDate: fromDateTimeLocalValue(deliveryDate),
        publicationDate: social
          ? fromDateTimeLocalValue(publicationDate)
          : undefined,
        referenceUrl: referenceUrl.trim() || undefined,
      });

      resetForm();
      setOpen(false);
      onSuccess(created);
      toast.success("Tarefa criada com sucesso");
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError("Não foi possível criar a tarefa.");
      }
    }
  }

  const loading = createTaskMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) resetForm();
      }}
    >
      <DialogTrigger
        render={
          <Button className="bg-[var(--atria-primary)] text-white hover:bg-[var(--atria-primary)]/90" />
        }
      >
        <Plus className="size-4" />
        Nova Tarefa
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-[var(--atria-primary)]">
              Nova Tarefa
            </DialogTitle>
          </DialogHeader>

          <FieldGroup className="py-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <Field>
              <FieldLabel htmlFor="task-title">Título</FieldLabel>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="task-desc">Descrição</FieldLabel>
              <Input
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel>Tipo de entrega</FieldLabel>
              <TaskContentTypePicker
                value={contentType}
                onChange={setContentType}
              />
            </Field>

            <ReferenceUrlField
              id="task-reference"
              value={referenceUrl}
              onChange={setReferenceUrl}
            />

            <Field>
              <FieldLabel htmlFor="task-client">Cliente</FieldLabel>
              <SearchableSelect
                id="task-client"
                value={clientId}
                onValueChange={setClientId}
                loading={optionsLoading}
                allowEmpty
                emptyOptionLabel="Sem cliente"
                placeholder="Selecione um cliente"
                searchPlaceholder="Buscar cliente..."
                emptyLabel="Nenhum cliente encontrado"
                options={clients.map((client) => ({
                  value: client.id,
                  label: client.companyName,
                }))}
              />
            </Field>

            <div
              className={
                isSocialContentType(contentType)
                  ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
                  : "grid grid-cols-1 gap-3"
              }
            >
              <Field>
                <FieldLabel htmlFor="task-delivery">Data de Entrega</FieldLabel>
                <Input
                  id="task-delivery"
                  type="datetime-local"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </Field>

              {isSocialContentType(contentType) ? (
                <Field>
                  <FieldLabel htmlFor="task-publication">
                    Data de Publicação
                  </FieldLabel>
                  <Input
                    id="task-publication"
                    type="datetime-local"
                    value={publicationDate}
                    onChange={(e) => setPublicationDate(e.target.value)}
                  />
                </Field>
              ) : null}
            </div>

            <Field>
              <FieldLabel>Responsáveis</FieldLabel>
              <div className="max-h-32 space-y-2 overflow-y-auto rounded-lg border border-input p-2">
                {optionsLoading && members.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-muted-foreground">
                    Carregando equipe...
                  </p>
                ) : null}
                {members.map((member) => (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={assigneeIds.includes(member.id)}
                      onChange={() => toggleAssignee(member.id)}
                    />
                    {member.name}
                  </label>
                ))}
              </div>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim()}
              className="bg-[var(--atria-primary)] text-white"
            >
              {loading ? "Salvando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

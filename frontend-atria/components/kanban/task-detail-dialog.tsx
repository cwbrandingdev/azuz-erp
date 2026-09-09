"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Upload, MessageSquareWarning } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DeliverableMediaGrid } from "@/components/deliverables/deliverable-media-grid";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ReferenceUrlField } from "@/components/ui/reference-url-field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  SlaStatusBadge,
  formatSlaDue,
} from "@/components/sla/sla-status-badge";
import {
  getInitials,
  DEFAULT_TASK_STATUS,
  STATUS_LABELS,
} from "@/lib/kanban-utils";
import {
  DEFAULT_TASK_CONTENT_TYPE,
} from "@/lib/task-content-type";
import { TaskContentTypePicker } from "@/components/kanban/task-content-type-picker";
import {
  TaskStatusBadge,
  TaskStatusSelect,
} from "@/components/kanban/task-status-select";
import { resolveMediaUrl } from "@/lib/media-url";
import { toast } from "@/lib/toast";
import { useConfirm } from "@/contexts/confirm-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useUpdateTaskMutation } from "@/hooks/use-task-mutations";
import {
  calendarService,
  clientsService,
  deliverablesService,
  kanbanService,
  userGroupsService,
  ApiError,
} from "@/services";
import type {
  Client,
  DeliverableApprovalStatus,
  DeliverableFullView,
  DeliverableItem,
  InternalReviewStatus,
  KanbanColumn,
  KanbanTask,
  KanbanTaskContentType,
  KanbanTaskStatus,
  KanbanTaskAsset,
  TaskHistoryEntry,
  TeamMember,
  UserGroup,
} from "@/services/types";
import { Label } from "recharts";

type DetailTab = "details" | "deliverables" | "review" | "history";

const INTERNAL_LABELS: Record<InternalReviewStatus, string> = {
  not_required: "Sem revisão interna",
  pending: "Aguardando aprovação Jhonatan",
  approved: "Aguardando aprovação do cliente",
  rejected: "Necessita de ajustes",
};

const APPROVAL_BADGES: Record<
  DeliverableApprovalStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Rascunho",
    className: "bg-zinc-100 text-zinc-700",
  },
  pending_approval: {
    label: "Aguardando Jhonatan",
    className: "bg-amber-100 text-amber-800",
  },
  waiting_client_approval: {
    label: "Em revisão do cliente",
    className: "bg-sky-100 text-sky-800",
  },
  approved: {
    label: "Aprovado pelo cliente",
    className: "bg-emerald-100 text-emerald-800",
  },
  requires_adjustment: {
    label: "Necessita de ajustes",
    className: "bg-amber-100 text-amber-900",
  },
};

interface TaskDetailDialogProps {
  task: KanbanTask | null;
  columns: KanbanColumn[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function TaskDetailDialog({
  task,
  columns,
  open,
  onOpenChange,
  onUpdate,
}: TaskDetailDialogProps) {
  const confirm = useConfirm();
  const updateTaskMutation = useUpdateTaskMutation();
  const { canEditKanbanTask, canPerformInternalApproval } = usePermissions();
  const canEdit = task ? canEditKanbanTask(task) : false;
  const showInternalApproval = canPerformInternalApproval();
  const [tab, setTab] = useState<DetailTab>("deliverables");
  const [loading, setLoading] = useState(false);
  const [assetUploading, setAssetUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [assets, setAssets] = useState<KanbanTaskAsset[]>([]);
  const [deliverableItems, setDeliverableItems] = useState<DeliverableItem[]>(
    [],
  );
  const [deliverableView, setDeliverableView] =
    useState<DeliverableFullView | null>(null);
  const [internalReviewNote, setInternalReviewNote] = useState("");
  const [assetCaption, setAssetCaption] = useState("");
  const [postCaption, setPostCaption] = useState("");
  const [savingPostCaption, setSavingPostCaption] = useState(false);
  const [approvingInternal, setApprovingInternal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<KanbanTaskStatus>(DEFAULT_TASK_STATUS);
  const [contentType, setContentType] = useState<KanbanTaskContentType>(
    DEFAULT_TASK_CONTENT_TYPE,
  );
  const [columnId, setColumnId] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [assignedGroupId, setAssignedGroupId] = useState("");
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [internalReviewStatus, setInternalReviewStatus] =
    useState<InternalReviewStatus>("not_required");
  const [isBypassingInternalReview, setIsBypassingInternalReview] =
    useState(false);

  useEffect(() => {
    if (!open || !task) return;

    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setContentType(task.contentType ?? DEFAULT_TASK_CONTENT_TYPE);
    setColumnId(task.columnId);
    setAssigneeIds(task.assignees.map((a) => a.id));
    setAssignedGroupId(task.assignedGroupId ?? "");
    setClientId(task.clientId ?? "");
    setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
    setReferenceUrl(task.referenceUrl ?? "");
    setInternalReviewStatus(task.internalReviewStatus);
    setInternalReviewNote(task.internalReviewNote ?? "");
    setIsBypassingInternalReview(Boolean(task.isBypassingInternalReview));
    setPostCaption(task.postCaption ?? "");
    setAssets(task.assets ?? []);
    setDeliverableItems([]);
    setDeliverableView(null);
    setTab("deliverables");
    setError(null);

    calendarService
      .getTeamMembers()
      .then(setMembers)
      .catch(() => setMembers([]));
    clientsService
      .getClients()
      .then(setClients)
      .catch(() => setClients([]));
    userGroupsService
      .getUserGroups()
      .then(setGroups)
      .catch(() => setGroups([]));
    void loadHistory(task.id);
    void loadDeliverableMedia(task.id);
  }, [open, task]);

  useEffect(() => {
    if (!open || !task || tab !== "deliverables") return;
    void loadDeliverableMedia(task.id);
  }, [open, task, tab]);

  async function loadHistory(taskId: string) {
    try {
      const data = await kanbanService.getHistory(taskId);
      setHistory(data);
    } catch {
      setHistory([]);
    }
  }

  async function loadDeliverableMedia(taskId: string) {
    try {
      const view = await deliverablesService.getFullView(taskId);
      setDeliverableView(view);
      setDeliverableItems(view.media.all);
      if (view.workflow) {
        setIsBypassingInternalReview(view.workflow.isBypassingInternalReview);
        if (view.workflow.internalReviewStatus) {
          setInternalReviewStatus(
            view.workflow.internalReviewStatus as InternalReviewStatus,
          );
        }
        if (view.workflow.kanbanStatus) {
          setStatus(view.workflow.kanbanStatus as KanbanTaskStatus);
        }
        if (view.workflow.rejectionReason ?? view.workflow.internalReviewNote) {
          setInternalReviewNote(
            view.workflow.rejectionReason ??
              view.workflow.internalReviewNote ??
              "",
          );
        }
      }
    } catch {
      setDeliverableView(null);
      setDeliverableItems([]);
    }
  }

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleStatusChange(nextStatus: KanbanTaskStatus) {
    setStatus(nextStatus);
    const matchingColumn = columns.find(
      (column) => column.statusKey === nextStatus,
    );
    if (matchingColumn) setColumnId(matchingColumn.id);
  }

  async function handleSavePostCaption() {
    if (!task || !canEdit) return;

    setSavingPostCaption(true);
    setError(null);
    try {
      await updateTaskMutation.mutateAsync({
        taskId: task.id,
        data: { postCaption: postCaption.trim() || "" },
      });
      onUpdate();
      toast.success("Legenda do post salva");
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError("Não foi possível salvar a legenda do post.");
      }
    } finally {
      setSavingPostCaption(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !canEdit) return;

    setLoading(true);
    setError(null);

    try {
      await updateTaskMutation.mutateAsync({
        taskId: task.id,
        data: {
          title,
          description,
          status,
          contentType,
          columnId,
          assigneeIds,
          assignedGroupId: assignedGroupId || null,
          clientId: clientId || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          referenceUrl: referenceUrl.trim() ? referenceUrl.trim() : null,
        },
      });
      onUpdate();
      onOpenChange(false);
      toast.success("Tarefa atualizada");
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError("Não foi possível atualizar a tarefa.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    const confirmed = await confirm({
      description: "Excluir esta tarefa?",
      destructive: true,
      confirmLabel: "Excluir",
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      await kanbanService.deleteTask(task.id);
      onUpdate();
      onOpenChange(false);
      toast.info("Tarefa removida");
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError("Não foi possível excluir a tarefa.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveInternal() {
    if (!task || !showInternalApproval) return;
    if (assets.length === 0 && deliverableItems.length === 0) {
      setError("Anexe pelo menos uma entrega antes da aprovação interna.");
      return;
    }

    setApprovingInternal(true);
    setError(null);
    try {
      const view = await deliverablesService.approveInternal(
        deliverableView?.id ?? task.id,
      );
      setDeliverableView(view);
      setDeliverableItems(view.media.all);
      setInternalReviewStatus("approved");
      setStatus("jhonatan_aprovou");
      const clientColumn = columns.find(
        (column) => column.statusKey === "jhonatan_aprovou",
      );
      if (clientColumn) setColumnId(clientColumn.id);
      onUpdate();
      await loadHistory(task.id);
      toast.success("Aprovado por Jhonatan — enviado para revisão do cliente");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível aprovar a entrega internamente.",
      );
    } finally {
      setApprovingInternal(false);
    }
  }

  async function handleInternalReject() {
    if (!task || !showInternalApproval) return;

    if (!internalReviewNote.trim()) {
      toast.error("Informe o motivo da rejeição interna.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updated = await kanbanService.updateInternalReview(
        task.id,
        "rejected",
        internalReviewNote.trim(),
      );
      setInternalReviewStatus(updated.internalReviewStatus);
      setInternalReviewNote(updated.internalReviewNote ?? "");
      setStatus(updated.status);
      setIsBypassingInternalReview(Boolean(updated.isBypassingInternalReview));
      onUpdate();
      await Promise.all([loadHistory(task.id), loadDeliverableMedia(task.id)]);
      toast.info("Entrega reprovada internamente");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível reprovar a entrega.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAssetsUpload(files: FileList | File[]) {
    if (!task || !canEdit) return;
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setAssetUploading(true);
    setError(null);
    const uploaded: KanbanTaskAsset[] = [];
    try {
      for (const file of fileList) {
        const asset = await kanbanService.uploadTaskAsset(
          task.id,
          file,
          assetCaption,
        );
        uploaded.push(asset as KanbanTaskAsset);
      }

      setAssets((prev) => [...prev, ...uploaded]);
      setAssetCaption("");
      onUpdate();
      await Promise.all([loadHistory(task.id), loadDeliverableMedia(task.id)]);
      const count = uploaded.length;
      toast.success(
        isBypassingInternalReview
          ? count === 1
            ? "Entrega reenviada direto para o cliente"
            : `${count} entregas reenviadas direto para o cliente`
          : count === 1
            ? "Entrega enviada"
            : `${count} entregas enviadas`,
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : uploaded.length > 0
            ? `${uploaded.length} arquivo(s) enviado(s), mas a operação falhou antes de concluir.`
            : "Não foi possível enviar os arquivos.",
      );
      if (uploaded.length > 0) {
        setAssets((prev) => [...prev, ...uploaded]);
        onUpdate();
        await Promise.all([
          loadHistory(task.id),
          loadDeliverableMedia(task.id),
        ]);
      }
    } finally {
      setAssetUploading(false);
    }
  }

  async function handleAssetDelete(assetId: string) {
    if (!task) return;
    const confirmed = await confirm({
      description: "Remover este arquivo da tarefa?",
      destructive: true,
      confirmLabel: "Remover",
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      await kanbanService.deleteTaskAsset(task.id, assetId);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      onUpdate();
      await Promise.all([loadHistory(task.id), loadDeliverableMedia(task.id)]);
      toast.info("Arquivo removido");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível remover o arquivo.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeliverableItemDelete(item: DeliverableItem) {
    if (!task || !item.sourceAssetId) return;
    await handleAssetDelete(item.sourceAssetId);
  }

  if (!task) return null;

  const columnTitle =
    columns.find((c) => c.id === task.columnId)?.title ?? task.column?.title;
  const rejectionReason =
    deliverableView?.workflow?.rejectionReason?.trim() ||
    deliverableView?.workflow?.internalReviewNote?.trim() ||
    internalReviewNote.trim() ||
    null;
  const showRejectionReason =
    Boolean(rejectionReason) &&
    (status === "jhonatan_reprova" ||
      internalReviewStatus === "rejected" ||
      deliverableView?.approval.status === "requires_adjustment");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] flex-col overflow-hidden sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="text-[var(--atria-primary)]">
            Detalhes da Tarefa
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/3 p-3 text-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <TaskStatusBadge status={status} />
            {isBypassingInternalReview && (
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
                Bypass Jhonatan ativo
              </span>
            )}
            {task.slaStatus && <SlaStatusBadge status={task.slaStatus} />}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[var(--atria-primary)]/10 pb-3">
          {(
            [
              ["details", "Detalhes"],
              ["deliverables", "Entregas"],
              ["history", "Histórico"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-[var(--atria-accent)] text-[var(--atria-primary)]"
                  : "text-[var(--atria-primary)]/60 hover:bg-[var(--atria-primary)]/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {tab === "details" && (
            <form id="task-detail-form" onSubmit={handleSave}>
              {!canEdit && (
                <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Você pode visualizar esta tarefa, mas só pode editar tarefas
                  atribuídas a você.
                </p>
              )}
              <fieldset disabled={!canEdit} className="contents">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="detail-title">Título</FieldLabel>
                    <Input
                      id="detail-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="detail-desc">Descrição</FieldLabel>
                    <textarea
                      id="detail-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                    />
                  </Field>

                  <ReferenceUrlField
                    id="detail-reference"
                    value={referenceUrl}
                    onChange={setReferenceUrl}
                  />

                  <Field>
                    <FieldLabel>Tipo de conteúdo</FieldLabel>
                    <TaskContentTypePicker
                      value={contentType}
                      onChange={setContentType}
                      disabled={!canEdit}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="detail-status">Status</FieldLabel>
                    <TaskStatusSelect
                      id="detail-status"
                      value={status}
                      onChange={handleStatusChange}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="detail-due">Prazo</FieldLabel>
                    <Input
                      id="detail-due"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="detail-client">Cliente</FieldLabel>
                    {canEdit ? (
                      <select
                        id="detail-client"
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
                    ) : (
                      <p className="rounded-lg border border-input px-3 py-2 text-sm text-[var(--atria-primary)]/80">
                        {task.client?.companyName ?? "Sem cliente"}
                      </p>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="detail-group">
                      Grupo / Equipe
                    </FieldLabel>
                    <SearchableSelect
                      id="detail-group"
                      value={assignedGroupId}
                      onValueChange={setAssignedGroupId}
                      allowEmpty
                      emptyOptionLabel="Sem grupo"
                      placeholder="Selecione um grupo"
                      searchPlaceholder="Buscar grupo..."
                      emptyLabel="Nenhum grupo encontrado"
                      options={groups.map((group) => ({
                        value: group.id,
                        label: group.name,
                      }))}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Responsáveis</FieldLabel>
                    <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-input p-2">
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
              </fieldset>
            </form>
          )}

          {tab === "deliverables" && (
            <div className="flex flex-col gap-5 px-1">
              {!canEdit && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Você pode visualizar as entregas desta tarefa, mas só pode
                  enviar arquivos em tarefas atribuídas a você.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.02] px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--atria-primary)]">
                    Painel de Entrega
                  </p>
                  <p className="text-xs text-[var(--atria-primary)]/55">
                    {isBypassingInternalReview
                      ? "Reenvio automático para o cliente (bypass Jhonatan)."
                      : "Após anexar a mídia, aprove diretamente com Jhonatan."}
                  </p>
                </div>
                {deliverableView && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${APPROVAL_BADGES[deliverableView.approval.status].className}`}
                  >
                    {APPROVAL_BADGES[deliverableView.approval.status].label}
                  </span>
                )}
              </div>

              {showRejectionReason && (
                <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-amber-800" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-amber-900">
                        Motivo da reprovação
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-amber-950/90">
                        {rejectionReason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="post-caption">Legenda do post</FieldLabel>
                <textarea
                  id="post-caption"
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  rows={5}
                  disabled={!canEdit}
                  placeholder="Escreva a legenda que será publicada com este conteúdo..."
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                />
                <p className="mt-1.5 text-xs text-[var(--atria-primary)]/50">
                  Esta legenda será exibida para o cliente na aprovação do
                  conteúdo.
                </p>
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 bg-green-800 text-white"
                    disabled={savingPostCaption}
                    onClick={() => void handleSavePostCaption()}
                  >
                    {savingPostCaption ? "Salvando..." : "Salvar legenda"}
                  </Button>
                )}
              </Field>

              {canEdit && (
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Field>
                    <FieldLabel htmlFor="asset-caption">
                      Legenda do arquivo (opcional)
                    </FieldLabel>
                    <Input
                      id="asset-caption"
                      value={assetCaption}
                      onChange={(e) => setAssetCaption(e.target.value)}
                      placeholder="Identifique este arquivo na entrega..."
                    />
                  </Field>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files?.length) void handleAssetsUpload(files);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={assetUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto"
                    >
                      <Upload className="size-4" />
                      {assetUploading ? "Enviando..." : "Enviar entregas"}
                    </Button>
                  </div>
                </div>
              )}

              <DeliverableMediaGrid
                items={deliverableItems}
                onItemsChange={setDeliverableItems}
                onRevisionSubmitted={() => loadDeliverableMedia(task.id)}
                onDeleteItem={canEdit ? handleDeliverableItemDelete : undefined}
                emptyMessage="Nenhuma entrega anexada ainda."
              />
            </div>
          )}

          {tab === "review" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[var(--atria-primary)]/60">
                Fluxo: Entrega → Aprovar (Jhonatan) na aba Entregas → revisão do
                cliente → OK. Reprovações do cliente voltam para Necessita de
                ajustes com reenvio direto.
              </p>
              <p className="text-sm font-medium text-[var(--atria-primary)]">
                Status atual: {INTERNAL_LABELS[internalReviewStatus]}
              </p>
              {assets.length === 0 && deliverableItems.length === 0 && (
                <p className="text-sm text-amber-700">
                  Anexe entregas na aba Entregas antes da aprovação interna.
                </p>
              )}
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-[var(--atria-primary)]/50">
                  Nenhuma atividade registrada.
                </p>
              ) : (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex gap-3 rounded-xl border border-[var(--atria-primary)]/10 p-3"
                  >
                    <Avatar className="size-8 shrink-0">
                      {entry.user.avatarUrl && (
                        <AvatarImage
                          src={
                            resolveMediaUrl(entry.user.avatarUrl) ?? undefined
                          }
                        />
                      )}
                      <AvatarFallback className="bg-[var(--atria-accent)] text-[10px] text-[var(--atria-primary)]">
                        {getInitials(entry.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-[var(--atria-primary)]">
                        <span className="font-medium">{entry.user.name}</span>{" "}
                        {entry.action}
                      </p>
                      <p className="text-[10px] text-[var(--atria-primary)]/40">
                        {new Date(entry.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {canEdit ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={loading}
            >
              <Trash2 className="size-4" />
              Excluir
            </Button>
          ) : (
            <span />
          )}

          {tab === "details" && canEdit && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="task-detail-form"
                disabled={loading}
                className="bg-[var(--atria-primary)] text-white"
              >
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

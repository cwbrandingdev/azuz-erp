"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  MessageSquareWarning,
  Paperclip,
  Upload,
} from "lucide-react";
import { DeliverableMediaGrid } from "@/components/deliverables/deliverable-media-grid";
import {
  FileUploadProgressList,
  createFileUploadItems,
  type FileUploadProgressItem,
} from "@/components/deliverables/file-upload-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientName } from "@/components/ui/client-name";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { useConfirm } from "@/contexts/confirm-context";
import { useInternalApprovalMutations } from "@/hooks/use-internal-approvals";
import { STATUS_LABELS } from "@/lib/kanban-utils";
import { toast } from "@/lib/toast";
import { ApiError, deliverablesService } from "@/services";
import type {
  DeliverableFullView,
  DeliverableItem,
  InternalApprovalItem,
  KanbanTaskStatus,
} from "@/services/types";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function kanbanLabel(status: string) {
  return STATUS_LABELS[status as KanbanTaskStatus] ?? status;
}

interface InternalApprovalDetailPanelProps {
  item: InternalApprovalItem;
}

export function InternalApprovalDetailPanel({
  item,
}: InternalApprovalDetailPanelProps) {
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { approve, submitDelivery, requestAdjustment } =
    useInternalApprovalMutations();
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [deliverableView, setDeliverableView] =
    useState<DeliverableFullView | null>(null);
  const [deliverableItems, setDeliverableItems] = useState<DeliverableItem[]>(
    [],
  );
  const [uploadProgress, setUploadProgress] = useState<
    FileUploadProgressItem[]
  >([]);

  const hasDelivery =
    item.assetCount > 0 ||
    item.revisionSummary.total > 0 ||
    deliverableItems.length > 0;
  const busy =
    approve.isPending ||
    submitDelivery.isPending ||
    requestAdjustment.isPending;

  useEffect(() => {
    let cancelled = false;

    async function loadMedia() {
      setLoadingMedia(true);
      setError(null);
      try {
        const view = await deliverablesService.getFullView(item.kanbanTaskId);
        if (cancelled) return;
        setDeliverableView(view);
        setDeliverableItems(view.media.all);
      } catch {
        if (!cancelled) {
          setDeliverableView(null);
          setDeliverableItems([]);
        }
      } finally {
        if (!cancelled) setLoadingMedia(false);
      }
    }

    void loadMedia();
    return () => {
      cancelled = true;
    };
  }, [item.kanbanTaskId, item.id]);

  async function reloadMedia() {
    try {
      const view = await deliverablesService.getFullView(item.kanbanTaskId);
      setDeliverableView(view);
      setDeliverableItems(view.media.all);
    } catch {
      setDeliverableView(null);
      setDeliverableItems([]);
    }
  }

  async function handleApprove() {
    if (!hasDelivery) {
      toast.error("Anexe pelo menos uma entrega antes de aprovar.");
      return;
    }

    const confirmed = await confirm({
      description:
        "Aprovar internamente e enviar esta entrega para revisão do cliente?",
      confirmLabel: "Aprovar internamente",
    });
    if (!confirmed) return;

    setError(null);
    try {
      await approve.mutateAsync({ id: item.id });
      toast.success("Aprovado internamente — enviado para revisão do cliente");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível aprovar internamente.",
      );
    }
  }

  async function handleUpload(files: FileList | File[]) {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setError(null);
    const items = createFileUploadItems(fileList);
    setUploadProgress(items);
    let uploadedCount = 0;
    try {
      for (let index = 0; index < fileList.length; index += 1) {
        const file = fileList[index];
        const itemId = items[index]?.id;
        if (!file || !itemId) continue;
        setUploadProgress((prev) =>
          prev.map((entry) =>
            entry.id === itemId
              ? { ...entry, status: "uploading", progress: 0 }
              : entry,
          ),
        );
        await submitDelivery.mutateAsync({
          id: item.id,
          file,
          onProgress: (percent) => {
            setUploadProgress((prev) =>
              prev.map((entry) =>
                entry.id === itemId
                  ? {
                      ...entry,
                      status: percent >= 100 ? "processing" : "uploading",
                      progress: percent,
                    }
                  : entry,
              ),
            );
          },
        });
        setUploadProgress((prev) =>
          prev.map((entry) =>
            entry.id === itemId
              ? { ...entry, status: "done", progress: 100 }
              : entry,
          ),
        );
        uploadedCount += 1;
      }
      toast.success(
        uploadedCount === 1
          ? "Entrega enviada para revisão interna"
          : `${uploadedCount} entregas enviadas para revisão interna`,
      );
      await reloadMedia();
      setUploadProgress([]);
    } catch (err) {
      setUploadProgress((prev) =>
        prev.map((entry) =>
          entry.status === "uploading" || entry.status === "processing"
            ? { ...entry, status: "error" }
            : entry,
        ),
      );
      setError(
        err instanceof ApiError
          ? err.message
          : uploadedCount > 0
            ? `${uploadedCount} arquivo(s) enviado(s), mas a operação falhou antes de concluir.`
            : "Não foi possível enviar as entregas.",
      );
      if (uploadedCount > 0) {
        await reloadMedia();
      }
    }
  }

  async function handleRequestAdjustment() {
    if (!adjustmentNote.trim()) {
      toast.error("Informe o que precisa ser ajustado.");
      return;
    }

    setError(null);
    try {
      await requestAdjustment.mutateAsync({
        id: item.id,
        note: adjustmentNote.trim(),
      });
      setAdjustmentOpen(false);
      setAdjustmentNote("");
      toast.info("Solicitação de ajustes enviada ao designer");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível pedir ajustes.",
      );
    }
  }

  const assigneeNames = item.assignees.map((person) => person.name).join(", ");

  return (
    <div className="flex min-h-0 flex-col gap-5 rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {item.client ? (
            <ClientName className="text-xs text-[var(--atria-primary)]/70">
              {item.client.companyName}
            </ClientName>
          ) : (
            <p className="text-xs font-medium text-[var(--atria-primary)]/45">
              Sem cliente
            </p>
          )}
          <h2 className="text-xl font-semibold text-[var(--atria-primary)]">
            {item.title}
          </h2>
          {item.description ? (
            <p className="text-sm text-[var(--atria-primary)]/65">
              {item.description}
            </p>
          ) : null}
        </div>
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-800"
        >
          Aguardando revisão
        </Badge>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-medium text-[var(--atria-primary)]/45">
            Data de Publicação
          </dt>
          <dd className="font-medium text-[var(--atria-primary)]">
            {formatDate(item.publicationDate)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[var(--atria-primary)]/45">
            Data de Entrega
          </dt>
          <dd className="text-[var(--atria-primary)]/80">
            {formatDate(item.deliveryDate ?? item.dueDate)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[var(--atria-primary)]/45">
            Status no Kanban
          </dt>
          <dd className="text-[var(--atria-primary)]/80">
            {kanbanLabel(item.kanbanStatus)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[var(--atria-primary)]/45">
            Entregas
          </dt>
          <dd className="inline-flex items-center gap-1.5 text-[var(--atria-primary)]/80">
            <Paperclip className="size-3.5" />
            {item.assetCount || item.revisionSummary.total}
          </dd>
        </div>
      </dl>

      <p className="text-sm text-[var(--atria-primary)]/55">
        {assigneeNames
          ? `Responsáveis: ${assigneeNames}`
          : `Criado por ${item.createdBy.name}`}
      </p>

      <div className="rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.02] p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--atria-primary)]/45">
          Legenda do post
        </p>
        {item.postCaption?.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--atria-primary)]/80">
            {item.postCaption.trim()}
          </p>
        ) : (
          <p className="text-sm text-[var(--atria-primary)]/45">
            Nenhuma legenda definida pelo responsável.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <p className="mb-3 text-sm font-medium text-[var(--atria-primary)]">
          Conteúdo para revisão
        </p>
        <div className="flex flex-col gap-4">
          <FileUploadProgressList items={uploadProgress} />
          {loadingMedia ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-[var(--atria-primary)]/15">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--atria-primary)] border-t-transparent" />
            </div>
          ) : (
            <DeliverableMediaGrid
              items={deliverableItems}
              onItemsChange={setDeliverableItems}
              onRevisionSubmitted={reloadMedia}
              showHeaderActions={deliverableItems.length > 0}
              allowReorder
              emptyMessage="Nenhuma mídia anexada. Use “Fazer Entrega” para enviar o conteúdo."
            />
          )}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-[var(--atria-primary)]/10 pt-4">
        <Button
          type="button"
          disabled={busy || !hasDelivery}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => void handleApprove()}
        >
          <CheckCircle2 className="size-4" />
          {approve.isPending ? "Aprovando..." : "Aprovar Internamente"}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          className="hidden"
          onChange={(event) => {
            const files = event.target.files;
            if (files?.length) void handleUpload(files);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          {submitDelivery.isPending ? "Enviando..." : "Fazer Entregas"}
        </Button>

        <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              >
                <MessageSquareWarning className="size-4" />
                Pedir Ajustes
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Pedir ajustes</DialogTitle>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor={`adjustment-${item.id}`}>
                O que precisa ser ajustado?
              </FieldLabel>
              <textarea
                id={`adjustment-${item.id}`}
                value={adjustmentNote}
                onChange={(event) => setAdjustmentNote(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="Descreva a solicitação para o designer..."
              />
            </Field>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline">Cancelar</Button>}
              />
              <Button
                type="button"
                disabled={requestAdjustment.isPending || !adjustmentNote.trim()}
                className="bg-amber-600 text-white hover:bg-amber-700"
                onClick={() => void handleRequestAdjustment()}
              >
                {requestAdjustment.isPending
                  ? "Enviando..."
                  : "Enviar solicitação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {deliverableView ? (
        <p className="text-xs text-[var(--atria-primary)]/40">
          Entrega vinculada · atualizado {formatDate(deliverableView.updatedAt)}
        </p>
      ) : null}
    </div>
  );
}

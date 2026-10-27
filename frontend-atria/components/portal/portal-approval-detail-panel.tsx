"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  MessageSquareWarning,
  Paperclip,
} from "lucide-react";
import { DeliverableMediaGrid } from "@/components/deliverables/deliverable-media-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { FORMAT_LABELS, PLATFORM_LABELS } from "@/lib/report-utils";
import { toast } from "@/lib/toast";
import type {
  DeliverableItem,
  PortalContentPipelineItem,
} from "@/services/types";
import type { PortalActionHandlers } from "./portal-actions";

const STATUS_BADGE_LABELS: Partial<Record<string, string>> = {
  pending_approval: "Aguardando sua revisão",
  rejected: "Ajustes solicitados",
  approved: "Aprovado",
  scheduled: "Agendado",
  published: "Publicado",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface PortalApprovalDetailPanelProps {
  post: PortalContentPipelineItem;
  onRefresh: () => void;
  actions: Pick<
    PortalActionHandlers,
    | "approvePost"
    | "rejectPost"
    | "getDeliverableFullView"
    | "reviseDeliverableItem"
    | "resolveAssetUrl"
  >;
}

export function PortalApprovalDetailPanel({
  post,
  onRefresh,
  actions,
}: PortalApprovalDetailPanelProps) {
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [deliverableItems, setDeliverableItems] = useState<DeliverableItem[]>(
    [],
  );
  const [postCopy, setPostCopy] = useState(post.copy ?? "");
  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const canDecide = post.status === "pending_approval";
  const mediaCount = deliverableItems.length || post.attachments?.length || 0;

  useEffect(() => {
    setPostCopy(post.copy ?? "");
  }, [post.copy, post.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadMedia() {
      setLoadingMedia(true);
      try {
        const view = await actions.getDeliverableFullView(post.id);
        if (cancelled) return;
        setDeliverableItems(view.media.all);
        if (view.copy) {
          setPostCopy(view.copy);
        }
      } catch {
        if (!cancelled) {
          const fallback: DeliverableItem[] = (post.attachments ?? []).map(
            (attachment, index) => ({
              id: `attachment-${index}`,
              deliverableId: post.id,
              mediaUrl: attachment.url,
              previewUrl: attachment.previewUrl ?? null,
              displayUrl: attachment.previewUrl || attachment.url,
              mediaType: attachment.mimeType?.startsWith("video/")
                ? "video"
                : "image",
              status: "pending",
              feedbackNotes: null,
              adjustmentNotes: null,
              fileName: attachment.name ?? `Arquivo ${index + 1}`,
              fileSize: null,
              sortOrder: index,
              createdAt: post.updatedAt,
              updatedAt: post.updatedAt,
            }),
          );
          setDeliverableItems(fallback);
        }
      } finally {
        if (!cancelled) setLoadingMedia(false);
      }
    }

    void loadMedia();
    return () => {
      cancelled = true;
    };
  }, [actions, post]);

  async function reloadMedia() {
    try {
      const view = await actions.getDeliverableFullView(post.id);
      setDeliverableItems(view.media.all);
      if (view.copy) {
        setPostCopy(view.copy);
      }
    } catch {
      setDeliverableItems([]);
    }
  }

  async function handleApprove() {
    setActing(true);
    try {
      await actions.approvePost(post.id);
      toast.success("Conteúdo aprovado com sucesso!");
      onRefresh();
    } catch {
      toast.error("Não foi possível aprovar o conteúdo.");
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("Informe o motivo da rejeição ou revisão.");
      return;
    }
    setRejecting(true);
    try {
      await actions.rejectPost(post.id, rejectReason.trim());
      toast.success("Feedback enviado à agência.");
      setRejectOpen(false);
      setRejectReason("");
      onRefresh();
    } catch {
      toast.error("Não foi possível enviar o feedback.");
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-5 rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-xl font-semibold text-[var(--atria-primary)]">
            {post.title}
          </h2>
          <p className="text-sm text-[var(--atria-primary)]/55">
            {PLATFORM_LABELS[post.platform]} · {FORMAT_LABELS[post.format]}
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-800"
        >
          {STATUS_BADGE_LABELS[post.status] ?? post.status}
        </Badge>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs font-medium text-[var(--atria-primary)]/45">
            Data prevista
          </dt>
          <dd className="font-medium text-[var(--atria-primary)]">
            {formatDate(post.scheduledDate)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[var(--atria-primary)]/45">
            Atualizado em
          </dt>
          <dd className="text-[var(--atria-primary)]/80">
            {formatDate(post.updatedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-[var(--atria-primary)]/45">
            Mídias
          </dt>
          <dd className="inline-flex items-center gap-1.5 text-[var(--atria-primary)]/80">
            <Paperclip className="size-3.5" />
            {mediaCount}
          </dd>
        </div>
      </dl>

      {postCopy ? (
        <div className="rounded-xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.02] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--atria-primary)]/45">
            Legenda do post
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--atria-primary)]/80">
            {postCopy}
          </p>
        </div>
      ) : null}

      {post.latestFeedback && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <MessageSquare className="size-3.5" />
            Seu feedback anterior
          </div>
          <p className="text-sm text-amber-900/90">{post.latestFeedback.comment}</p>
          <p className="mt-1 text-[10px] text-amber-700/70">
            {new Date(post.latestFeedback.createdAt).toLocaleString("pt-BR")}
          </p>
        </div>
      )}

      <div className="min-h-0 flex-1">
        <p className="mb-3 text-sm font-medium text-[var(--atria-primary)]">
          Conteúdo para revisão
        </p>
        {loadingMedia ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-[var(--atria-primary)]/15">
            <Loader2 className="size-8 animate-spin text-[var(--atria-primary)]" />
          </div>
        ) : (
          <DeliverableMediaGrid
            items={deliverableItems}
            onItemsChange={setDeliverableItems}
            onRevisionSubmitted={reloadMedia}
            onApproveItem={(itemId) =>
              actions.reviseDeliverableItem(itemId, { status: "approved" })
            }
            resolveMediaUrl={actions.resolveAssetUrl}
            showHeaderActions={deliverableItems.length > 0}
            allowItemAdjustment={false}
            emptyMessage="Nenhuma mídia anexada nesta entrega."
          />
        )}
      </div>

      {canDecide && (
        <div className="flex flex-wrap gap-2 border-t border-[var(--atria-primary)]/10 pt-4">
          <Button
            type="button"
            disabled={acting}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => void handleApprove()}
          >
            {acting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {acting ? "Aprovando..." : "Aprovar Entrega"}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={acting}
            className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
            onClick={() => setRejectOpen(true)}
          >
            <MessageSquareWarning className="size-4" />
            Solicitar Ajustes
          </Button>
        </div>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar ajustes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--atria-primary)]/60">{post.title}</p>
          <Field>
            <FieldLabel htmlFor="portal-reject-reason">
              O que precisa ser alterado? *
            </FieldLabel>
            <textarea
              id="portal-reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              placeholder="Descreva as alterações necessárias..."
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleReject()}
              disabled={rejecting || !rejectReason.trim()}
            >
              {rejecting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Enviar feedback"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  MessageSquareWarning,
} from "lucide-react";
import Link from "next/link";
import { ContentStatusBadge } from "@/components/content/content-status-badge";
import { RejectPostDialog } from "@/components/content/reject-post-dialog";
import { DeliverableMediaGrid } from "@/components/deliverables/deliverable-media-grid";
import {
  MediaLightbox,
  type LightboxMediaItem,
} from "@/components/deliverables/media-lightbox";
import { Button } from "@/components/ui/button";
import { ClientName } from "@/components/ui/client-name";
import { MediaPreview } from "@/components/ui/media-preview";
import { resolveMediaUrl } from "@/lib/media-url";
import {
  getPreviewMediaKind,
  mimeTypeForPreviewKind,
  toLightboxMediaType,
} from "@/lib/pdf-utils";
import { triggerBrowserDownload } from "@/lib/trigger-download";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { contentService, deliverablesService } from "@/services";
import type {
  ContentPost,
  DeliverableItem,
  PostHistory,
} from "@/services/types";

interface ContentReviewPanelProps {
  post: ContentPost;
  history: PostHistory;
  onRefresh: () => Promise<void>;
  showBackLink?: boolean;
}

const MEDIA_STATUS_STYLES = {
  pending: "bg-zinc-900 text-white",
  approved: "bg-emerald-600 text-white",
  requires_adjustment: "bg-amber-500 text-white",
} as const;

export function ContentReviewPanel({
  post,
  history,
  onRefresh,
  showBackLink = true,
}: ContentReviewPanelProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deliverableItems, setDeliverableItems] = useState<DeliverableItem[]>(
    [],
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDeliverables() {
      try {
        const view = await deliverablesService.getFullView(post.id);
        if (!cancelled) {
          setDeliverableItems(view.media.all);
        }
      } catch {
        if (!cancelled) {
          setDeliverableItems([]);
        }
      }
    }

    void loadDeliverables();
    return () => {
      cancelled = true;
    };
  }, [post.id, post.updatedAt]);

  const attachmentLightboxItems = useMemo<LightboxMediaItem[]>(
    () =>
      post.attachments.map((attachment, index) => {
        const url = resolveMediaUrl(attachment.url) ?? attachment.url;
        const kind = getPreviewMediaKind(
          url,
          attachment.mimeType,
          attachment.name,
        );
        return {
          id: `${attachment.url}-${index}`,
          url,
          mediaType: toLightboxMediaType(kind),
          mimeType: attachment.mimeType ?? mimeTypeForPreviewKind(kind),
          fileName: attachment.name,
          deliverableItemId: null,
        };
      }),
    [post.attachments],
  );

  const revisionSummary = useMemo(() => {
    const total = deliverableItems.length;
    return {
      total,
      pending: deliverableItems.filter((item) => item.status === "pending")
        .length,
      approved: deliverableItems.filter((item) => item.status === "approved")
        .length,
      requiresAdjustment: deliverableItems.filter(
        (item) => item.status === "requires_adjustment",
      ).length,
    };
  }, [deliverableItems]);

  const canReview =
    post.status === "pending_approval" ||
    post.status === "rejected" ||
    post.status === "approved";

  const showDeliverableGrid = deliverableItems.length > 0;
  const latestRejection = history.feedback
    .filter((entry) => entry.type === "rejection_reason")
    .at(-1);

  async function handleApprovePost() {
    setActionLoading(true);
    try {
      await contentService.approvePost(post.id);
      toast.success("Conteúdo aprovado.");
      await onRefresh();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(rejectionReason: string) {
    setActionLoading(true);
    try {
      await contentService.rejectPost(post.id, { rejectionReason });
      toast.success("Ajuste solicitado para o conteúdo.");
      await onRefresh();
    } finally {
      setActionLoading(false);
    }
  }

  async function reloadDeliverables() {
    try {
      const view = await deliverablesService.getFullView(post.id);
      setDeliverableItems(view.media.all);
    } catch {
      setDeliverableItems([]);
    }
  }

  async function handleDownloadAll() {
    if (deliverableItems.length > 0) {
      setDownloadingAll(true);
      try {
        await deliverablesService.downloadAllItems(
          deliverableItems.map((item) => item.id),
        );
        toast.success(
          deliverableItems.length === 1
            ? "Download iniciado."
            : "Arquivo ZIP com todas as mídias baixado.",
        );
      } catch {
        toast.error("Falha ao baixar um ou mais arquivos.");
      } finally {
        setDownloadingAll(false);
      }
      return;
    }

    attachmentLightboxItems.forEach((item) => {
      triggerBrowserDownload(item.url, item.fileName ?? "download");
    });
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[98vw] px-4 py-6 sm:px-6 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="mb-10 flex flex-col gap-6 border-b border-[var(--atria-primary)]/10 pb-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {showBackLink && (
              <Button
                variant="ghost"
                size="icon"
                render={<Link href="/creation" />}
                className="mt-1 shrink-0 text-[var(--atria-primary)]"
                aria-label="Voltar"
              >
                <ArrowLeft className="size-5" />
              </Button>
            )}
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--atria-primary)]/45">
                Entrega de Conteúdo
              </p>
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-[var(--atria-primary)] sm:text-4xl">
                {post.title}
              </h1>
              <p className="mt-2 text-base text-[var(--atria-primary)]/55">
                <ClientName>{post.client.companyName}</ClientName>
                {post.platform ? ` · ${post.platform}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ContentStatusBadge
              status={post.status}
              className="px-3 py-1 text-sm"
            />
            {(showDeliverableGrid || attachmentLightboxItems.length > 0) && (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={downloadingAll}
                onClick={() => void handleDownloadAll()}
              >
                {downloadingAll ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Baixar Todos
              </Button>
            )}
          </div>
        </div>

        {showDeliverableGrid && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Total",
                value: revisionSummary.total,
                className: "text-[var(--atria-primary)]",
              },
              {
                label: "Pendentes",
                value: revisionSummary.pending,
                className: "text-zinc-700",
              },
              {
                label: "Aprovados",
                value: revisionSummary.approved,
                className: "text-emerald-700",
              },
              {
                label: "Necessita Ajuste",
                value: revisionSummary.requiresAdjustment,
                className: "text-amber-700",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[var(--atria-primary)]/8 bg-white/60 px-4 py-3"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--atria-primary)]/40">
                  {stat.label}
                </p>
                <p
                  className={cn("mt-1 text-2xl font-semibold", stat.className)}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.header>

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_280px]">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="min-w-0"
        >
          {post.copy && (
            <p className="mb-8 max-w-3xl whitespace-pre-wrap text-base leading-relaxed text-[var(--atria-primary)]/75">
              {post.copy}
            </p>
          )}

          {showDeliverableGrid ? (
            <DeliverableMediaGrid
              items={deliverableItems}
              onItemsChange={setDeliverableItems}
              onRevisionSubmitted={reloadDeliverables}
              showHeaderActions={false}
              emptyMessage="Nenhuma mídia nesta entrega."
            />
          ) : attachmentLightboxItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {attachmentLightboxItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setLightboxIndex(index);
                    setLightboxOpen(true);
                  }}
                  className="group overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white/50 text-left transition hover:border-[var(--atria-primary)]/20"
                >
                  <MediaPreview
                    url={item.url}
                    mimeType={item.mimeType}
                    name={item.fileName ?? undefined}
                    className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-medium text-[var(--atria-primary)]">
                      {item.fileName ?? "Arquivo"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 px-6 py-20 text-center text-sm text-[var(--atria-primary)]/50">
              Nenhuma mídia disponível para esta entrega.
            </div>
          )}
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex h-fit flex-col gap-4 xl:sticky xl:top-6"
        >
          {canReview && (
            <div className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white/70 p-5">
              <h2 className="mb-1 text-sm font-semibold text-[var(--atria-primary)]">
                Decisão
              </h2>
              <p className="mb-4 text-sm text-[var(--atria-primary)]/50">
                Aprove a entrega completa ou peça ajustes.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => void handleApprovePost()}
                  disabled={actionLoading || post.status === "approved"}
                >
                  <CheckCircle2 className="size-4" />
                  Aprovar Entrega
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 border-amber-300 text-amber-800 hover:bg-amber-50"
                  onClick={() => setRejectOpen(true)}
                  disabled={actionLoading}
                >
                  <MessageSquareWarning className="size-4" />
                  Solicitar Ajuste
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white/50 p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--atria-primary)]">
              Status da mídia
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              {(
                [
                  ["pending", "Pendente"],
                  ["approved", "Aprovado"],
                  ["requires_adjustment", "Necessita Ajuste"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      MEDIA_STATUS_STYLES[key],
                    )}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {latestRejection && (
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 p-5">
              <h2 className="mb-2 text-sm font-semibold text-amber-900">
                Último feedback
              </h2>
              <p className="text-sm leading-relaxed text-amber-950/90">
                {latestRejection.comment}
              </p>
            </div>
          )}
        </motion.aside>
      </div>

      <RejectPostDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
        loading={actionLoading}
      />

      {!showDeliverableGrid && (
        <MediaLightbox
          items={attachmentLightboxItems}
          index={lightboxIndex}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setLightboxIndex}
          onDownload={(item) => {
            triggerBrowserDownload(item.url, item.fileName ?? "download");
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Expand,
  Loader2,
} from "lucide-react";
import { createPortal } from "react-dom";
import type { PortalActionHandlers } from "@/components/portal/portal-actions";
import {
  MediaLightbox,
  type LightboxMediaItem,
} from "@/components/deliverables/media-lightbox";
import { Button } from "@/components/ui/button";
import { MediaPreview } from "@/components/ui/media-preview";
import { useCarouselKeyboard } from "@/hooks/use-carousel-keyboard";
import { preferredDisplayUrl } from "@/lib/media-url";
import { toast } from "@/lib/toast";
import {
  getPreviewMediaKind,
  mimeTypeForPreviewKind,
  toLightboxMediaType,
} from "@/lib/pdf-utils";
import { cn } from "@/lib/utils";
import type {
  DeliverableItem,
  PortalContentPipelineItem,
} from "@/services/types";

interface PortalDeliveryReviewProps {
  post: PortalContentPipelineItem;
  onBack: () => void;
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

const STATUS_LABELS = {
  pending: "Pendente",
  approved: "Aprovado",
  requires_adjustment: "Necessita Ajuste",
} as const;

export function PortalDeliveryReview({
  post,
  onBack,
  onRefresh,
  actions,
}: PortalDeliveryReviewProps) {
  const [items, setItems] = useState<DeliverableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [approvingPost, setApprovingPost] = useState(false);
  const [approvingItem, setApprovingItem] = useState(false);
  const [deliveryApproved, setDeliveryApproved] = useState(
    post.status === "approved",
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDeliveryApproved(post.status === "approved");
  }, [post.status]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const view = await actions.getDeliverableFullView(post.id);
        if (!cancelled) {
          setItems(view.media.all);
          setActiveIndex(0);
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
              mediaType: toLightboxMediaType(
                getPreviewMediaKind(
                  attachment.url,
                  attachment.mimeType,
                  attachment.name,
                ),
              ),
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
          setItems(fallback);
          setActiveIndex(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [actions, post]);

  const currentItem = items[activeIndex] ?? null;

  const lightboxItems = useMemo<LightboxMediaItem[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        url: preferredDisplayUrl(item),
        originalUrl: item.mediaUrl,
        mediaType: item.mediaType,
        fileName: item.fileName,
        status: item.status,
        feedbackNotes: item.adjustmentNotes ?? item.feedbackNotes,
        deliverableItemId: item.id.startsWith("attachment-") ? null : item.id,
      })),
    [items],
  );

  const { goPrev, goNext } = useCarouselKeyboard({
    enabled: !lightboxOpen && items.length > 0,
    itemCount: items.length,
    index: activeIndex,
    onIndexChange: setActiveIndex,
    onEscape: onBack,
  });

  async function handleApproveItem(item: LightboxMediaItem | DeliverableItem) {
    const itemId =
      "deliverableItemId" in item ? item.deliverableItemId : item.id;
    if (!itemId || itemId.startsWith("attachment-")) return;
    setApprovingItem(true);
    try {
      const updated = await actions.reviseDeliverableItem(itemId, {
        status: "approved",
      });
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === itemId
            ? {
                ...entry,
                ...updated,
                feedbackNotes: updated.adjustmentNotes ?? updated.feedbackNotes,
              }
            : entry,
        ),
      );
      toast.success("Mídia aprovada.");
      onRefresh();
    } catch {
      toast.error("Não foi possível aprovar esta mídia.");
    } finally {
      setApprovingItem(false);
    }
  }

  async function handleApprovePost() {
    setApprovingPost(true);
    try {
      await actions.approvePost(post.id);
      setDeliveryApproved(true);
      setItems((prev) =>
        prev.map((item) =>
          item.id.startsWith("attachment-")
            ? item
            : { ...item, status: "approved" },
        ),
      );
      toast.success("Entrega aprovada — tarefa movida para OK.");
      onRefresh();
    } catch {
      toast.error("Não foi possível aprovar a entrega.");
    } finally {
      setApprovingPost(false);
    }
  }

  const review = (
    <div className="fixed inset-0 z-40 flex max-h-screen items-stretch justify-center bg-[var(--atria-base,#F8F8F6)] p-4">
      <div
        className="flex h-[calc(100vh-2rem)] max-h-screen w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white shadow-xl"
        role="region"
        aria-roledescription="carousel"
        aria-label="Revisão da entrega"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--atria-primary)]/10 px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-start gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label="Voltar"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--atria-primary)]/45">
                Entrega para revisão
              </p>
              <h2 className="truncate text-lg font-semibold text-[var(--atria-primary)] sm:text-xl">
                {post.title}
              </h2>
            </div>
          </div>
          <Button
            type="button"
            className="shrink-0 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={approvingPost || deliveryApproved}
            onClick={() => void handleApprovePost()}
          >
            {approvingPost ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {deliveryApproved ? "Aprovado" : "Aprovar entrega"}
          </Button>
        </header>

        {loading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-[var(--atria-primary)]" />
          </div>
        ) : !currentItem ? (
          <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-sm text-[var(--atria-primary)]/50">
            Nenhuma mídia disponível nesta entrega.
          </div>
        ) : (
          <>
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[var(--atria-primary)]/[0.03]">
              {items.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute left-2 z-10 size-10 rounded-full bg-white/90 text-[var(--atria-primary)] shadow-sm hover:bg-white sm:left-4"
                  onClick={goPrev}
                  aria-label="Mídia anterior"
                >
                  <ChevronLeft className="size-5" />
                </Button>
              )}

              <div className="relative flex h-full w-full items-center justify-center px-12 py-3 sm:px-16">
                {currentItem.mediaType === "video" ? (
                  <MediaPreview
                    url={actions.resolveAssetUrl(preferredDisplayUrl(currentItem))}
                    mimeType="video/mp4"
                    name={currentItem.fileName ?? undefined}
                    className="h-full w-full max-h-none rounded-xl object-contain"
                  />
                ) : (
                  <button
                    type="button"
                    className="flex h-full w-full cursor-zoom-in items-center justify-center"
                    onClick={() => setLightboxOpen(true)}
                    aria-label={`Abrir ${currentItem.fileName ?? "mídia"} em tela cheia`}
                  >
                    <MediaPreview
                      url={actions.resolveAssetUrl(preferredDisplayUrl(currentItem))}
                      mimeType={
                        mimeTypeForPreviewKind(
                          getPreviewMediaKind(
                            currentItem.mediaUrl,
                            currentItem.mediaType === "image"
                              ? "image/jpeg"
                              : undefined,
                            currentItem.fileName,
                          ),
                        )
                      }
                      name={currentItem.fileName ?? undefined}
                      className="h-full w-full max-h-none rounded-xl object-contain"
                      eager
                    />
                  </button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute bottom-3 right-3 z-10 size-9 rounded-full bg-white/90 text-[var(--atria-primary)] shadow-sm hover:bg-white"
                  onClick={() => setLightboxOpen(true)}
                  aria-label="Abrir em tela cheia"
                >
                  <Expand className="size-4" />
                </Button>
              </div>

              {items.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 z-10 size-10 rounded-full bg-white/90 text-[var(--atria-primary)] shadow-sm hover:bg-white sm:right-4"
                  onClick={goNext}
                  aria-label="Próxima mídia"
                >
                  <ChevronRight className="size-5" />
                </Button>
              )}

              <span
                className={cn(
                  "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white",
                  currentItem.status === "requires_adjustment" &&
                    "bg-amber-500/95",
                  currentItem.status === "approved" && "bg-emerald-600/95",
                  currentItem.status === "pending" && "bg-zinc-900/70",
                )}
              >
                {STATUS_LABELS[currentItem.status]}
              </span>
            </div>

            <footer className="flex shrink-0 flex-col gap-3 border-t border-[var(--atria-primary)]/10 px-4 py-3 sm:px-5">
              {post.copy && (
                <p className="max-h-16 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-[var(--atria-primary)]/70">
                  {post.copy}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--atria-primary)]">
                    {currentItem.fileName ?? "Arquivo"}
                  </p>
                  <p className="text-[11px] text-[var(--atria-primary)]/45">
                    {activeIndex + 1} / {items.length}
                    {items.length > 1 ? " · Use ← → para navegar" : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={
                      approvingItem || currentItem.status === "approved"
                    }
                    onClick={() => void handleApproveItem(currentItem)}
                  >
                    {approvingItem ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-3.5" />
                    )}
                    Aprovar
                  </Button>
                </div>
              </div>

              {(currentItem.adjustmentNotes || currentItem.feedbackNotes) && (
                <p className="line-clamp-2 text-xs text-amber-800/90">
                  {currentItem.adjustmentNotes ?? currentItem.feedbackNotes}
                </p>
              )}

              {items.length > 1 && (
                <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
                  {items.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={cn(
                        "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition",
                        index === activeIndex
                          ? "border-[var(--atria-primary)]"
                          : "border-transparent opacity-70 hover:opacity-100",
                      )}
                      aria-label={`Ir para ${item.fileName ?? `mídia ${index + 1}`}`}
                      aria-current={index === activeIndex}
                    >
                      <MediaPreview
                        url={actions.resolveAssetUrl(preferredDisplayUrl(item))}
                        mimeType={
                          mimeTypeForPreviewKind(
                            getPreviewMediaKind(
                              item.mediaUrl,
                              item.mediaType === "video"
                                ? "video/mp4"
                                : item.mediaType === "image"
                                  ? "image/jpeg"
                                  : undefined,
                              item.fileName,
                            ),
                          )
                        }
                        name={item.fileName ?? undefined}
                        className="pointer-events-none h-full w-full max-h-none rounded-none object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </footer>
          </>
        )}
      </div>

      <MediaLightbox
        items={lightboxItems}
        index={activeIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setActiveIndex}
        onApprove={handleApproveItem}
        onDownload={(item) => {
          const url = actions.resolveAssetUrl(item.originalUrl ?? item.url);
          window.open(url, "_blank", "noopener,noreferrer");
        }}
        approving={approvingItem}
      />
    </div>
  );

  if (!mounted) return null;
  return createPortal(review, document.body);
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MessageSquareWarning,
  Play,
  Trash2,
} from "lucide-react";
import { MediaRevisionDrawer } from "@/components/deliverables/media-revision-drawer";
import {
  MediaLightbox,
  type LightboxMediaItem,
} from "@/components/deliverables/media-lightbox";
import { Button } from "@/components/ui/button";
import { MediaPreview } from "@/components/ui/media-preview";
import { useCarouselKeyboard } from "@/hooks/use-carousel-keyboard";
import { resolveMediaUrl } from "@/lib/media-url";
import { isPdfSource } from "@/lib/pdf-utils";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { deliverablesService } from "@/services";
import type { DeliverableItem, DeliverableItemStatus } from "@/services/types";

const STATUS_LABELS: Record<DeliverableItemStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  requires_adjustment: "Necessita de ajustes",
};

interface DeliverableMediaGridProps {
  items: DeliverableItem[];
  onItemsChange?: (items: DeliverableItem[]) => void;
  onRevisionSubmitted?: () => void | Promise<void>;
  onDeleteItem?: (item: DeliverableItem) => void | Promise<void>;
  onReviseItem?: (
    itemId: string,
    data: {
      status: DeliverableItemStatus;
      adjustmentNotes?: string | null;
      feedbackNotes?: string;
    },
  ) => Promise<DeliverableItem>;
  onApproveItem?: (itemId: string) => Promise<DeliverableItem>;
  onDownloadItem?: (item: DeliverableItem) => Promise<void>;
  onDownloadAllItems?: (items: DeliverableItem[]) => Promise<void>;
  resolveMediaUrl?: (url: string) => string | undefined;
  showHeaderActions?: boolean;
  allowItemAdjustment?: boolean;
  emptyMessage?: string;
  className?: string;
}

function toLightboxItem(item: DeliverableItem): LightboxMediaItem {
  return {
    id: item.id,
    url: item.mediaUrl,
    mediaType: item.mediaType,
    fileName: item.fileName,
    mimeType: isPdfSource(item.mediaUrl, null, item.fileName)
      ? "application/pdf"
      : undefined,
    status: item.status,
    feedbackNotes: item.feedbackNotes,
    deliverableItemId: item.id,
  };
}

export function DeliverableMediaGrid({
  items,
  onItemsChange,
  onRevisionSubmitted,
  onDeleteItem,
  onReviseItem,
  onApproveItem,
  onDownloadItem,
  onDownloadAllItems,
  resolveMediaUrl: resolveMediaUrlProp,
  showHeaderActions = true,
  allowItemAdjustment = true,
  emptyMessage = "Nenhuma mídia disponível.",
  className,
}: DeliverableMediaGridProps) {
  const [revisionItem, setRevisionItem] = useState<DeliverableItem | null>(
    null,
  );
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder),
    [items],
  );

  const lightboxItems = useMemo(
    () => sortedItems.map(toLightboxItem),
    [sortedItems],
  );

  const hasMultiple = sortedItems.length > 1;
  const activeItem = sortedItems[activeIndex] ?? sortedItems[0] ?? null;

  useEffect(() => {
    setActiveIndex((current) => {
      if (sortedItems.length === 0) return 0;
      return Math.min(current, sortedItems.length - 1);
    });
  }, [sortedItems.length]);

  const { goPrev, goNext } = useCarouselKeyboard({
    enabled: hasMultiple && !lightboxOpen,
    itemCount: sortedItems.length,
    index: activeIndex,
    onIndexChange: setActiveIndex,
  });

  function openRevision(item: DeliverableItem) {
    setRevisionItem(item);
    setRevisionOpen(true);
  }

  function openLightbox(index: number) {
    setActiveIndex(index);
    setLightboxOpen(true);
  }

  function updateItem(updated: DeliverableItem) {
    onItemsChange?.(
      items.map((item) =>
        item.id === updated.id ? { ...item, ...updated } : item,
      ),
    );
  }

  async function handleRevisionSubmit(itemId: string, feedbackNotes: string) {
    setRevisionLoading(true);
    try {
      const updated = onReviseItem
        ? await onReviseItem(itemId, {
            status: "requires_adjustment",
            adjustmentNotes: feedbackNotes,
            feedbackNotes,
          })
        : await deliverablesService.reviseItem(itemId, {
            status: "requires_adjustment",
            adjustmentNotes: feedbackNotes,
            feedbackNotes,
          });
      updateItem(updated);
      toast.success("Ajuste solicitado para esta mídia.");
      setRevisionOpen(false);
      setRevisionItem(null);
      await onRevisionSubmitted?.();
    } finally {
      setRevisionLoading(false);
    }
  }

  async function handleDownload(item: DeliverableItem | LightboxMediaItem) {
    const itemId =
      "deliverableItemId" in item && item.deliverableItemId
        ? item.deliverableItemId
        : item.id;
    setDownloadingId(itemId);
    try {
      if (onDownloadItem && "deliverableId" in item) {
        await onDownloadItem(item);
      } else {
        await deliverablesService.downloadItem(itemId);
      }
      toast.success("Download iniciado.");
    } catch {
      toast.error("Falha ao baixar o arquivo.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleApprove(item: LightboxMediaItem) {
    if (!item.deliverableItemId) return;
    setApprovingId(item.deliverableItemId);
    try {
      const updated = onApproveItem
        ? await onApproveItem(item.deliverableItemId)
        : await deliverablesService.reviseItem(item.deliverableItemId, {
            status: "approved",
          });
      updateItem(updated);
      toast.success("Mídia aprovada.");
      await onRevisionSubmitted?.();
    } catch {
      toast.error("Não foi possível aprovar esta mídia.");
    } finally {
      setApprovingId(null);
    }
  }

  async function handleDownloadAll() {
    if (sortedItems.length === 0) return;
    setDownloadingAll(true);
    try {
      if (onDownloadAllItems) {
        await onDownloadAllItems(sortedItems);
      } else {
        await deliverablesService.downloadAllItems(
          sortedItems.map((item) => item.id),
        );
      }
      toast.success(
        sortedItems.length === 1
          ? "Download iniciado."
          : "Arquivo ZIP com todas as mídias baixado.",
      );
    } catch {
      toast.error("Falha ao baixar um ou mais arquivos.");
    } finally {
      setDownloadingAll(false);
    }
  }

  if (sortedItems.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 px-6 py-16 text-center text-sm text-[var(--atria-primary)]/50">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {showHeaderActions && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--atria-primary)]/55">
            {sortedItems.length} mídia{sortedItems.length === 1 ? "" : "s"}
          </p>
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
        </div>
      )}

      {hasMultiple && activeItem && (
        <div
          className="relative overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.03]"
          role="region"
          aria-roledescription="carousel"
          aria-label="Pré-visualização do carrossel"
        >
          <div className="relative flex min-h-[min(50vh,420px)] items-center justify-center px-12 py-4 sm:px-16">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute left-2 z-10 size-10 rounded-full bg-white/90 text-[var(--atria-primary)] shadow-sm hover:bg-white sm:left-4"
              onClick={goPrev}
              aria-label="Slide anterior"
            >
              <ChevronLeft className="size-5" />
            </Button>

            <button
              type="button"
              className="flex h-full w-full cursor-zoom-in items-center justify-center"
              onClick={() => openLightbox(activeIndex)}
              aria-label={`Abrir ${activeItem.fileName ?? "mídia"} em tela cheia`}
            >
              {(() => {
                const previewUrl =
                  resolveMediaUrlProp?.(activeItem.mediaUrl) ??
                  resolveMediaUrl(activeItem.mediaUrl) ??
                  activeItem.mediaUrl;

                if (activeItem.mediaType === "video") {
                  return (
                    <div className="relative aspect-[4/3] w-full max-w-3xl bg-black">
                      <video
                        src={previewUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full rounded-xl object-contain"
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="flex size-14 items-center justify-center rounded-full bg-black/55 text-white shadow-lg">
                          <Play className="ml-0.5 size-7 fill-current" />
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <MediaPreview
                    url={previewUrl}
                    mimeType={
                      activeItem.mediaType === "image"
                        ? "image/jpeg"
                        : isPdfSource(
                              activeItem.mediaUrl,
                              null,
                              activeItem.fileName,
                            )
                          ? "application/pdf"
                          : undefined
                    }
                    name={activeItem.fileName ?? undefined}
                    className="max-h-[min(50vh,420px)] w-full max-w-3xl rounded-xl object-contain"
                  />
                );
              })()}
            </button>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-2 z-10 size-10 rounded-full bg-white/90 text-[var(--atria-primary)] shadow-sm hover:bg-white sm:right-4"
              onClick={goNext}
              aria-label="Próximo slide"
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>

          <p className="border-t border-[var(--atria-primary)]/10 px-4 py-2 text-center text-xs text-[var(--atria-primary)]/55">
            {activeIndex + 1} / {sortedItems.length}
            <span className="hidden sm:inline">
              {" "}
              · use as setas ← → do teclado para navegar
            </span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sortedItems.map((item, index) => {
          const previewUrl =
            resolveMediaUrlProp?.(item.mediaUrl) ??
            resolveMediaUrl(item.mediaUrl) ??
            item.mediaUrl;
          const isDownloading = downloadingId === item.id;

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.25,
                delay: Math.min(index * 0.04, 0.24),
              }}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-[var(--atria-primary)]/[0.02]",
                index === activeIndex && hasMultiple
                  ? "border-[var(--atria-primary)]/35 ring-2 ring-[var(--atria-primary)]/15"
                  : "border-[var(--atria-primary)]/10",
              )}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <button
                type="button"
                className="block w-full cursor-zoom-in text-left"
                onClick={() => openLightbox(index)}
                aria-label={`Abrir ${item.fileName ?? "mídia"} em tela cheia`}
              >
                {item.mediaType === "video" ? (
                  <div className="relative aspect-[4/3] w-full bg-black">
                    <video
                      src={previewUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                      <span className="flex size-14 items-center justify-center rounded-full bg-black/55 text-white shadow-lg">
                        <Play className="ml-0.5 size-7 fill-current" />
                      </span>
                    </div>
                  </div>
                ) : (
                  <MediaPreview
                    url={previewUrl}
                    mimeType={
                      item.mediaType === "image"
                        ? "image/jpeg"
                        : isPdfSource(item.mediaUrl, null, item.fileName)
                          ? "application/pdf"
                          : undefined
                    }
                    name={item.fileName ?? undefined}
                    className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                )}
              </button>

              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm",
                    item.status === "requires_adjustment" &&
                      "bg-amber-500/95 text-white",
                    item.status === "approved" &&
                      "bg-emerald-600/95 text-white",
                    item.status === "pending" && "bg-zinc-900/70 text-white",
                  )}
                >
                  {STATUS_LABELS[item.status]}
                </span>
                {onDeleteItem && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    className="pointer-events-auto bg-white/95 text-red-600 hover:bg-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onDeleteItem(item);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>

              <div className="space-y-3 border-t border-[var(--atria-primary)]/10 bg-white/80 p-3 backdrop-blur-sm">
                <div>
                  <p className="truncate text-sm font-semibold text-[var(--atria-primary)]">
                    {item.fileName ?? "Arquivo"}
                  </p>
                  {item.feedbackNotes && (
                    <p className="mt-1 line-clamp-2 text-xs text-amber-800/90">
                      {item.feedbackNotes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {allowItemAdjustment && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => openRevision(item)}
                    >
                      <MessageSquareWarning className="size-3.5" />
                      Solicitar Ajuste
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="gap-1.5"
                    disabled={isDownloading}
                    onClick={() => void handleDownload(item)}
                  >
                    {isDownloading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    Baixar Conteúdo
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {allowItemAdjustment && (
        <MediaRevisionDrawer
          item={revisionItem}
          open={revisionOpen}
          onOpenChange={setRevisionOpen}
          onSubmit={handleRevisionSubmit}
          loading={revisionLoading}
        />
      )}

      <MediaLightbox
        items={lightboxItems}
        index={activeIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setActiveIndex}
        onDownload={(item) => handleDownload(item)}
        onRequestAdjustment={
          allowItemAdjustment
            ? (item) => {
                const match = sortedItems.find((entry) => entry.id === item.id);
                if (!match) return;
                setLightboxOpen(false);
                openRevision(match);
              }
            : undefined
        }
        onApprove={handleApprove}
        downloading={Boolean(downloadingId)}
        approving={Boolean(approvingId)}
      />
    </div>
  );
}

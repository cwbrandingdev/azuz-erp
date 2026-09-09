"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileIcon,
  Loader2,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { createPortal } from "react-dom";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { Button } from "@/components/ui/button";
import { useCarouselKeyboard } from "@/hooks/use-carousel-keyboard";
import { resolveMediaUrl } from "@/lib/media-url";
import { isPdfSource } from "@/lib/pdf-utils";
import { cn } from "@/lib/utils";
import type { DeliverableItemStatus } from "@/services/types";

export interface LightboxMediaItem {
  id: string;
  url: string;
  mediaType: "image" | "video" | "other";
  fileName?: string | null;
  mimeType?: string | null;
  status?: DeliverableItemStatus | null;
  feedbackNotes?: string | null;
  deliverableItemId?: string | null;
}

const STATUS_META: Record<
  DeliverableItemStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pendente",
    className: "bg-white/15 text-white",
  },
  approved: {
    label: "Aprovado",
    className: "bg-emerald-500/90 text-white",
  },
  requires_adjustment: {
    label: "Necessita Ajuste",
    className: "bg-amber-500/90 text-white",
  },
};

interface MediaLightboxProps {
  items: LightboxMediaItem[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onDownload?: (item: LightboxMediaItem) => void | Promise<void>;
  onRequestAdjustment?: (item: LightboxMediaItem) => void;
  onApprove?: (item: LightboxMediaItem) => void | Promise<void>;
  downloading?: boolean;
  approving?: boolean;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

export function MediaLightbox({
  items,
  index,
  open,
  onClose,
  onIndexChange,
  onDownload,
  downloading,
}: MediaLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const item = items[index] ?? null;
  const hasMultiple = items.length > 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setZoom(1);
  }, [item?.id, open]);

  const { goPrev, goNext } = useCarouselKeyboard({
    enabled: open,
    itemCount: items.length,
    index,
    onIndexChange,
    onEscape: onClose,
  });

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted) return null;

  const previewUrl = item ? (resolveMediaUrl(item.url) ?? item.url) : "";
  const status = item?.status ? STATUS_META[item.status] : null;
  const canActOnItem = Boolean(item?.deliverableItemId);
  const isPdf = item
    ? isPdfSource(item.url, item.mimeType, item.fileName)
    : false;

  function zoomIn() {
    setZoom((current) => Math.min(ZOOM_MAX, current + ZOOM_STEP));
  }

  function zoomOut() {
    setZoom((current) => Math.max(ZOOM_MIN, current - ZOOM_STEP));
  }

  function resetZoom() {
    setZoom(1);
  }

  return createPortal(
    <AnimatePresence>
      {open && item && (
        <motion.div
          key="media-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Visualização de mídia"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex h-dvh max-h-screen flex-col overflow-hidden bg-black/90 backdrop-blur-md"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/95">
                {item.fileName ?? "Mídia"}
              </p>
              <p className="text-xs text-white/50">
                {index + 1} / {items.length}
                {status ? ` · ${status.label}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isPdf && (
                <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-white hover:bg-white/15 hover:text-white"
                    onClick={zoomOut}
                    disabled={zoom <= ZOOM_MIN}
                    aria-label="Diminuir zoom"
                  >
                    <ZoomOut className="size-4" />
                  </Button>
                  <span className="min-w-12 text-center text-xs font-medium text-white/80">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-white hover:bg-white/15 hover:text-white"
                    onClick={zoomIn}
                    disabled={zoom >= ZOOM_MAX}
                    aria-label="Aumentar zoom"
                  >
                    <ZoomIn className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-white hover:bg-white/15 hover:text-white"
                    onClick={resetZoom}
                    disabled={zoom === 1}
                    aria-label="Restaurar zoom"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </div>
              )}
              {status && (
                <span
                  className={cn(
                    "hidden rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide sm:inline-flex",
                    status.className,
                  )}
                >
                  {status.label}
                </span>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={onClose}
                aria-label="Fechar"
              >
                <X className="size-5" />
              </Button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 sm:px-16">
            {hasMultiple && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute left-2 z-10 size-11 rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4"
                onClick={goPrev}
                aria-label="Mídia anterior"
              >
                <ChevronLeft className="size-6" />
              </Button>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="flex h-full w-full max-w-[96vw] items-center justify-center overflow-auto"
              >
                {item.mediaType === "video" ? (
                  <video
                    key={previewUrl}
                    src={previewUrl}
                    controls
                    autoPlay
                    playsInline
                    style={{ transform: `scale(${zoom})` }}
                    className="max-h-full max-w-full rounded-lg bg-black object-contain shadow-2xl transition-transform duration-150"
                  />
                ) : isPdf ? (
                  <PdfViewer
                    url={previewUrl}
                    fileName={item.fileName}
                    theme="dark"
                    className="h-full max-h-[80vh] w-full max-w-[96vw] overflow-hidden rounded-lg"
                  />
                ) : item.mediaType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={item.fileName ?? "Mídia"}
                    style={{ transform: `scale(${zoom})` }}
                    className="max-h-full max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-150"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-white/80">
                    <FileIcon className="size-16" />
                    <p className="max-w-sm text-center text-sm">
                      Pré-visualização indisponível para este arquivo.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {hasMultiple && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-2 z-10 size-11 rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4"
                onClick={goNext}
                aria-label="Próxima mídia"
              >
                <ChevronRight className="size-6" />
              </Button>
            )}
          </div>

          <div className="shrink-0 border-t border-white/10 bg-black/40 px-4 py-3 sm:px-6">
            {item.feedbackNotes && (
              <p className="mb-3 line-clamp-2 text-center text-sm text-amber-200/90">
                {item.feedbackNotes}
              </p>
            )}

            <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="gap-2 bg-white/95 text-zinc-900 hover:bg-white"
                disabled={downloading}
                onClick={() => void onDownload?.(item)}
              >
                {downloading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Baixar
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

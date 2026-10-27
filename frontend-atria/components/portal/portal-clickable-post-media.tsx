"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaLightbox, type LightboxMediaItem } from "@/components/deliverables/media-lightbox";
import { MediaPreview } from "@/components/ui/media-preview";
import { useCarouselKeyboard } from "@/hooks/use-carousel-keyboard";
import {
  getPreviewMediaKind,
  mimeTypeForPreviewKind,
  toLightboxMediaType,
} from "@/lib/pdf-utils";
import { cn } from "@/lib/utils";

interface PortalPostAttachment {
  id: string;
  name: string;
  url: string;
  previewUrl?: string | null;
  mimeType: string | null;
}

interface PortalClickablePostMediaProps {
  attachments?: PortalPostAttachment[];
  resolveAssetUrl: (url: string) => string;
  fallbackLabel?: string;
  className?: string;
  previewClassName?: string;
}

function toLightboxItem(
  attachment: PortalPostAttachment,
  resolveAssetUrl: (url: string) => string,
): LightboxMediaItem {
  const originalUrl = resolveAssetUrl(attachment.url);
  const url = resolveAssetUrl(attachment.previewUrl || attachment.url);
  const kind = getPreviewMediaKind(
    originalUrl,
    attachment.mimeType,
    attachment.name,
  );

  return {
    id: attachment.id,
    url,
    originalUrl,
    mediaType: toLightboxMediaType(kind),
    mimeType: attachment.mimeType ?? mimeTypeForPreviewKind(kind),
    fileName: attachment.name,
    deliverableItemId: null,
  };
}

export function PortalClickablePostMedia({
  attachments,
  resolveAssetUrl,
  fallbackLabel,
  className,
  previewClassName,
}: PortalClickablePostMediaProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [focused, setFocused] = useState(false);

  const items = useMemo(
    () =>
      (attachments ?? []).map((attachment) =>
        toLightboxItem(attachment, resolveAssetUrl),
      ),
    [attachments, resolveAssetUrl],
  );

  useEffect(() => {
    setSlideIndex((current) => {
      if (items.length === 0) return 0;
      return Math.min(current, items.length - 1);
    });
  }, [items.length]);

  const { goPrev, goNext } = useCarouselKeyboard({
    enabled: focused && !lightboxOpen,
    itemCount: items.length,
    index: slideIndex,
    onIndexChange: setSlideIndex,
  });

  const current = attachments?.[slideIndex] ?? attachments?.[0];

  if (!current) {
    return (
      <div
        className={cn(
          "flex min-h-[120px] items-center justify-center bg-[var(--atria-primary)]/5 p-4",
          className,
        )}
      >
        <span className="text-xs font-medium text-[var(--atria-primary)]/40">
          {fallbackLabel ?? "Sem mídia"}
        </span>
      </div>
    );
  }

  const previewUrl = resolveAssetUrl(current.previewUrl || current.url);
  const isVideo = current.mimeType?.startsWith("video/");
  const hasMultiple = items.length > 1;

  return (
    <>
      <div
        className={cn(
          "group relative flex min-h-[120px] w-full items-center justify-center bg-[var(--atria-primary)]/5 p-2",
          className,
        )}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={current.name}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <button
          type="button"
          className="flex h-full w-full cursor-zoom-in items-center justify-center text-left transition hover:bg-[var(--atria-primary)]/8"
          onClick={() => setLightboxOpen(true)}
          aria-label={`Abrir mídia: ${current.name}`}
        >
          {isVideo ? (
            <video
              src={previewUrl}
              muted
              playsInline
              className={cn(
                "max-h-32 max-w-full rounded-lg object-contain transition duration-300 group-hover:scale-[1.02]",
                previewClassName,
              )}
            />
          ) : (
            <MediaPreview
              url={previewUrl}
              mimeType={current.mimeType}
              name={current.name}
              className={cn(
                "max-h-32 w-full object-contain transition duration-300 group-hover:scale-[1.02]",
                previewClassName,
              )}
            />
          )}
        </button>

        {hasMultiple && (
          <>
            <button
              type="button"
              className="absolute left-1 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                goPrev();
              }}
              aria-label="Slide anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              className="absolute right-1 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                goNext();
              }}
              aria-label="Próximo slide"
            >
              <ChevronRight className="size-4" />
            </button>
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
              {slideIndex + 1}/{items.length}
            </span>
          </>
        )}
      </div>

      <MediaLightbox
        items={items}
        index={slideIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setSlideIndex}
        onDownload={(item) => {
          window.open(
            item.originalUrl ?? item.url,
            "_blank",
            "noopener,noreferrer",
          );
        }}
      />
    </>
  );
}

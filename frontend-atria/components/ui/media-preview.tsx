"use client";

import { FileIcon, FileText } from "lucide-react";
import { getPreviewMediaKind } from "@/lib/pdf-utils";
import { cn } from "@/lib/utils";

interface MediaPreviewProps {
  url: string;
  mimeType?: string | null;
  name?: string;
  className?: string;
  eager?: boolean;
}

export function MediaPreview({
  url,
  mimeType,
  name,
  className,
  eager = false,
}: MediaPreviewProps) {
  const kind = getPreviewMediaKind(url, mimeType, name);

  if (kind === "video") {
    return (
      <video
        src={url}
        controls
        className={cn("max-h-48 w-full rounded-lg bg-black/5 object-contain", className)}
      >
        {name}
      </video>
    );
  }

  if (kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? "Preview"}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={cn("max-h-48 w-full rounded-lg object-cover", className)}
      />
    );
  }

  if (kind === "pdf") {
    return (
      <div
        className={cn(
          "flex h-24 flex-col items-center justify-center gap-1.5 rounded-lg border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.04]",
          className,
        )}
      >
        <FileText className="size-8 text-red-600/80" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-red-700/80">
          PDF
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-24 items-center justify-center rounded-lg border border-dashed border-input bg-muted/30",
        className,
      )}
    >
      <FileIcon className="size-8 text-muted-foreground" />
    </div>
  );
}

interface LocalMediaPreviewProps {
  file: File;
  className?: string;
}

export function LocalMediaPreview({ file, className }: LocalMediaPreviewProps) {
  const url = URL.createObjectURL(file);

  return (
    <MediaPreview
      url={url}
      mimeType={file.type}
      name={file.name}
      className={className}
    />
  );
}

"use client";

import { useEffect, useState } from "react";
import { FileIcon, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getPreviewMediaKind } from "@/lib/pdf-utils";
import { cn } from "@/lib/utils";

interface MediaPreviewProps {
  url: string;
  mimeType?: string | null;
  name?: string;
  className?: string;
}

export function MediaPreview({
  url,
  mimeType,
  name,
  className,
}: MediaPreviewProps) {
  const kind = getPreviewMediaKind(url, mimeType, name);

  if (kind === "video") {
    return (
      <VideoPreview url={url} name={name} className={className} />
    );
  }

  if (kind === "image") {
    return (
      <ImagePreview url={url} name={name} className={className} />
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

function ImagePreview({
  url,
  name,
  className,
}: {
  url: string;
  name?: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [url]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!loaded && (
        <Skeleton className="absolute inset-0 size-full rounded-[inherit]" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name ?? "Preview"}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn(
          "size-full max-h-48 object-cover transition-opacity duration-200",
          !loaded && "opacity-0",
        )}
      />
    </div>
  );
}

function VideoPreview({
  url,
  name,
  className,
}: {
  url: string;
  name?: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [url]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!loaded && (
        <Skeleton className="absolute inset-0 size-full rounded-[inherit]" />
      )}
      <video
        src={url}
        controls
        preload="metadata"
        onLoadedData={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn(
          "size-full max-h-48 object-contain transition-opacity duration-200",
          !loaded && "opacity-0",
        )}
      >
        {name}
      </video>
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

"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PdfViewerProps {
  url: string;
  fileName?: string | null;
  className?: string;
  showControls?: boolean;
  theme?: "light" | "dark";
}

export function PdfViewer({
  url,
  fileName,
  className,
  showControls = true,
  theme = "light",
}: PdfViewerProps) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const isDark = theme === "dark";
  const title = fileName?.trim() || "PDF";

  useEffect(() => {
    setLoading(true);
    setFailed(false);
  }, [url]);

  return (
    <div className={cn("flex h-full min-h-64 w-full flex-col", className)}>
      {showControls && (
        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center justify-end gap-2 border-b px-2 py-1.5",
            isDark
              ? "border-white/10 bg-black/30"
              : "border-[var(--atria-primary)]/10 bg-white/80",
          )}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "gap-1.5",
              isDark &&
                "border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white",
            )}
            render={
              <a href={url} target="_blank" rel="noopener noreferrer" />
            }
          >
            <ExternalLink className="size-3.5" />
            Abrir em nova aba
          </Button>
        </div>
      )}

      <div
        className={cn(
          "relative min-h-0 flex-1",
          isDark ? "bg-zinc-950" : "bg-[#f1f5f5]",
        )}
      >
        {loading && !failed && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Loader2
              className={cn(
                "size-6 animate-spin",
                isDark ? "text-white/60" : "text-[var(--atria-primary)]/50",
              )}
            />
          </div>
        )}
        {failed ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <p
              className={cn(
                "text-sm",
                isDark ? "text-white/70" : "text-[var(--atria-primary)]/70",
              )}
            >
              Não foi possível pré-visualizar este PDF.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              render={
                <a href={url} target="_blank" rel="noopener noreferrer" />
              }
            >
              <ExternalLink className="size-3.5" />
              Abrir {title} em nova aba
            </Button>
          </div>
        ) : (
          <iframe
            src={url}
            title={title}
            className={cn(
              "h-full min-h-64 w-full border-0",
              isDark ? "bg-zinc-950" : "bg-white",
            )}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

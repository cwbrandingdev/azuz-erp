"use client";

import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { assetsService } from "@/services";

export type FileUploadStatus = "queued" | "uploading" | "processing" | "done" | "error";

export interface FileUploadProgressItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: FileUploadStatus;
}

export function createFileUploadItems(files: File[]): FileUploadProgressItem[] {
  return files.map((file, index) => ({
    id: `${index}-${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    size: file.size,
    progress: 0,
    status: "queued",
  }));
}

function statusLabel(item: FileUploadProgressItem) {
  if (item.status === "queued") return "Na fila";
  if (item.status === "uploading") {
    return item.progress > 0 ? `${item.progress}%` : "Enviando...";
  }
  if (item.status === "processing") return "Processando...";
  if (item.status === "done") return "Enviado";
  return "Falhou";
}

function barWidth(item: FileUploadProgressItem) {
  if (item.status === "queued") return "0%";
  if (
    item.status === "processing" ||
    item.status === "done" ||
    item.status === "error"
  ) {
    return "100%";
  }
  if (item.progress === 0) return undefined;
  return `${item.progress}%`;
}

export function FileUploadProgressList({
  items,
}: {
  items: FileUploadProgressItem[];
}) {
  if (items.length === 0) return null;

  const current = items.find(
    (item) => item.status === "uploading" || item.status === "processing",
  );
  const completed = items.filter((item) => item.status === "done").length;

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--atria-primary)]">
          {current
            ? `Enviando ${current.name}`
            : completed === items.length
              ? "Envio concluído"
              : "Enviando arquivos"}
        </p>
        <p className="text-xs text-[var(--atria-primary)]/55">
          {completed}/{items.length}
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="space-y-1.5">
            <div className="flex items-center gap-2">
              {item.status === "done" ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
              ) : item.status === "error" ? (
                <CircleAlert className="size-3.5 shrink-0 text-red-600" />
              ) : item.status === "queued" ? (
                <span className="size-3.5 shrink-0 rounded-full border border-[var(--atria-primary)]/25" />
              ) : (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--atria-primary)]" />
              )}
              <p className="min-w-0 flex-1 truncate text-sm text-[var(--atria-primary)]">
                {item.name}
              </p>
              <p className="shrink-0 text-[11px] text-[var(--atria-primary)]/50">
                {assetsService.formatFileSize(item.size)}
              </p>
              <p
                className={cn(
                  "shrink-0 text-[11px] font-medium",
                  item.status === "error"
                    ? "text-red-600"
                    : item.status === "done"
                      ? "text-emerald-700"
                      : "text-[var(--atria-primary)]/70",
                )}
              >
                {statusLabel(item)}
              </p>
            </div>
            <div
              role="progressbar"
              aria-label={`Envio de ${item.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                item.status === "queued" ? 0 : Math.max(item.progress, 0)
              }
              className="h-1.5 overflow-hidden rounded-full bg-[var(--atria-primary)]/10"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-200",
                  item.status === "error"
                    ? "bg-red-500"
                    : item.status === "done"
                      ? "bg-emerald-500"
                      : "bg-[var(--atria-primary)]",
                  item.status === "uploading" &&
                    item.progress === 0 &&
                    "w-1/3 animate-pulse",
                )}
                style={{ width: barWidth(item) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

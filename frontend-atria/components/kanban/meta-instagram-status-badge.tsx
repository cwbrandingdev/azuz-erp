"use client";

import { ExternalLink } from "lucide-react";
import type { KanbanTask } from "@/services/types";

const STATUS_CLASS: Record<string, string> = {
  not_scheduled: "bg-zinc-100 text-zinc-700",
  pending: "bg-sky-100 text-sky-800",
  scheduled: "bg-indigo-100 text-indigo-800",
  published: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
};

function formatMetaDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildLabel(meta: NonNullable<KanbanTask["metaInstagram"]>) {
  switch (meta.status) {
    case "scheduled":
      return meta.scheduledAt
        ? `Agendado no Instagram · ${formatMetaDateTime(meta.scheduledAt)}`
        : "Agendado no Instagram";
    case "published":
      if (meta.publishedAt) {
        return `Publicado no Instagram · ${formatMetaDateTime(meta.publishedAt)}`;
      }
      if (meta.scheduledAt) {
        return `Publicado no Instagram (agendado para ${formatMetaDateTime(meta.scheduledAt)})`;
      }
      return "Publicado no Instagram";
    case "pending":
      return "Enviando para o Instagram…";
    case "failed":
      return "Falha ao publicar no Instagram";
    case "not_scheduled":
      return "Instagram: não agendado";
    default:
      return `Instagram: ${meta.status}`;
  }
}

export function MetaInstagramStatusBadge({
  meta,
}: {
  meta: NonNullable<KanbanTask["metaInstagram"]>;
}) {
  const label = buildLabel(meta);
  const className =
    STATUS_CLASS[meta.status] ?? "bg-zinc-100 text-zinc-700";

  const subtitle =
    meta.status === "scheduled" && meta.scheduledAt
      ? "O status muda para publicado após o horário, quando a Meta confirmar (até ~5 min)."
      : null;

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex w-fit max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${className}`}
        title={meta.error ?? undefined}
      >
        <span className="truncate">{label}</span>
        {meta.permalink ? (
          <a
            href={meta.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0"
            aria-label="Abrir no Instagram"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </span>
      {subtitle ? (
        <p className="max-w-md text-[10px] text-[var(--atria-primary)]/50">
          {subtitle}
        </p>
      ) : null}
      {meta.error ? (
        <p className="text-[11px] text-red-600">{meta.error}</p>
      ) : null}
    </div>
  );
}

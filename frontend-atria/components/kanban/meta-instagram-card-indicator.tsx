"use client";

import { AtSign } from "lucide-react";
import type { KanbanTask } from "@/services/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-indigo-100 text-indigo-800",
  published: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-sky-100 text-sky-800",
};

export function MetaInstagramCardIndicator({
  meta,
}: {
  meta: NonNullable<KanbanTask["metaInstagram"]>;
}) {
  if (meta.status === "not_scheduled") {
    return null;
  }

  const style =
    STATUS_STYLES[meta.status] ?? "bg-zinc-100 text-zinc-700";

  const shortLabel =
    meta.status === "scheduled"
      ? "IG agendado"
      : meta.status === "published"
        ? "IG publicado"
        : meta.status === "failed"
          ? "IG falhou"
          : meta.status === "pending"
            ? "IG…"
            : `IG ${meta.status}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
        style,
      )}
      title={meta.error ?? shortLabel}
    >
      <AtSign className="h-2.5 w-2.5" />
      {shortLabel}
    </span>
  );
}

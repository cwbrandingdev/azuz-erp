"use client";

import { Bookmark, Heart, MessageCircle, Share2 } from "lucide-react";
import { toKanbanContentTypeLabel } from "./content-type-filter";
import type { InstagramMediaInsight } from "@/services/types";

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

interface ContentPerformanceGridProps {
  items: InstagramMediaInsight[];
}

export function ContentPerformanceGrid({ items }: ContentPerformanceGridProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--atria-primary)]/15 bg-white px-6 py-12 text-center text-sm text-[var(--atria-primary)]/55">
        Nenhum conteúdo encontrado para este filtro.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="overflow-hidden rounded-2xl border border-[var(--atria-primary)]/10 bg-white"
        >
          <div className="relative aspect-[4/5] bg-[var(--atria-primary)]/5">
            {item.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnailUrl}
                alt={item.caption || "Publicação"}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-[var(--atria-primary)]/40">
                Sem preview
              </div>
            )}
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--atria-primary)]">
              {toKanbanContentTypeLabel(item.contentType)}
            </span>
          </div>
          <div className="space-y-3 p-4">
            <p className="line-clamp-2 min-h-10 text-sm text-[var(--atria-primary)]/80">
              {item.caption || "Sem legenda"}
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <Metric icon={Heart} value={item.likes} label="Likes" />
              <Metric icon={MessageCircle} value={item.comments} label="Comments" />
              <Metric icon={Share2} value={item.shares} label="Shares" />
              <Metric icon={Bookmark} value={item.saves} label="Saves" />
            </div>
            {item.permalink ? (
              <a
                href={item.permalink}
                target="_blank"
                rel="noreferrer"
                className="block text-xs font-medium text-[var(--atria-primary)]/55 hover:text-[var(--atria-primary)]"
              >
                Ver no Instagram
              </a>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Heart;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon className="size-3.5 text-[var(--atria-primary)]/50" />
      <span className="text-sm font-semibold text-[var(--atria-primary)]">
        {formatNumber(value)}
      </span>
      <span className="text-[10px] text-[var(--atria-primary)]/45">{label}</span>
    </div>
  );
}

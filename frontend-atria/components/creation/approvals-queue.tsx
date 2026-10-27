"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ContentStatusBadge } from "@/components/content/content-status-badge";
import { LiquidGlassCard } from "@/components/creation/liquid-glass-card";
import { MediaPreview } from "@/components/ui/media-preview";
import { resolveMediaUrl } from "@/lib/media-url";
import type { CreationApprovalItem } from "@/services/types";

const FORMAT_LABELS = {
  carousel: "Carrossel",
  reels: "Reels",
  static: "Estático",
  story: "Story",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface ApprovalsQueueProps {
  items: CreationApprovalItem[];
}

export function ApprovalsQueue({ items }: ApprovalsQueueProps) {
  return (
    <LiquidGlassCard accent>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--atria-primary)]">
            Fila de Aprovações
          </h2>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Feedback interno e do cliente
          </p>
        </div>
        <span className="rounded-full bg-[var(--atria-primary)]/10 px-2.5 py-1 text-xs font-bold text-[var(--atria-primary)]">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--atria-accent)]/30 bg-white/30 px-4 py-8 text-center text-sm text-[var(--atria-primary)]/50">
          Nenhum item aguardando aprovação.
        </div>
      ) : (
        <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/content/${item.id}`}
              className="group flex items-start gap-3 rounded-xl border border-white/40 bg-white/50 p-3 transition-colors hover:bg-white/80"
            >
              {item.previewAttachment ? (
                <div className="size-14 shrink-0 overflow-hidden rounded-lg">
                  <MediaPreview
                    url={
                      resolveMediaUrl(
                        item.previewAttachment.previewUrl ||
                          item.previewAttachment.url,
                      ) ??
                      item.previewAttachment.previewUrl ??
                      item.previewAttachment.url
                    }
                    mimeType={item.previewAttachment.mimeType}
                    name={item.previewAttachment.name}
                    className="size-14 object-cover"
                  />
                </div>
              ) : (
                <Avatar className="size-9 shrink-0">
                  <AvatarImage src={item.clientAvatarUrl ?? undefined} />
                  <AvatarFallback className="bg-[var(--atria-primary)]/10 text-xs text-[var(--atria-primary)]">
                    {getInitials(item.clientName)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-[var(--atria-primary)] group-hover:underline">
                    {item.title}
                  </p>
                  <ContentStatusBadge status={item.status} />
                </div>
                <p className="text-xs text-[var(--atria-primary)]/60">
                  {item.clientName} · {FORMAT_LABELS[item.format]}
                </p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--atria-primary)]/40">
                  <Clock className="size-3" />
                  {new Date(item.updatedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {item.assignee ? ` · ${item.assignee.name}` : ""}
                </div>
              </div>
              <ArrowRight className="mt-1 size-4 shrink-0 text-[var(--atria-primary)]/30 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--atria-primary)]" />
            </Link>
          ))}
        </div>
      )}
    </LiquidGlassCard>
  );
}

"use client";

import Link from "next/link";
import { Calendar, ExternalLink } from "lucide-react";
import { LiquidGlassCard } from "@/components/creation/liquid-glass-card";
import type { CreationScheduleItem } from "@/services/types";

const META_STATUS_LABELS: Record<string, string> = {
  scheduled: "Meta: agendado",
  published: "Meta: publicado",
  failed: "Meta: falhou",
  pending: "Meta: enviando",
  not_scheduled: "",
};

const FORMAT_LABELS = {
  carousel: "Carrossel",
  reels: "Reels",
  static: "Estático",
  story: "Story",
};

const PLATFORM_LABELS = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

function formatScheduleDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (date.toDateString() === today.toDateString()) {
    return `Hoje · ${time}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Amanhã · ${time}`;
  }

  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface PublishingScheduleProps {
  items: CreationScheduleItem[];
}

export function PublishingSchedule({ items }: PublishingScheduleProps) {
  const groupedByDay = items.reduce<Map<string, CreationScheduleItem[]>>(
    (map, item) => {
      const key = new Date(item.scheduledAt).toDateString();
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
      return map;
    },
    new Map(),
  );

  return (
    <LiquidGlassCard className="col-span-full">
      <div className="mb-5 flex items-center gap-2">
        <Calendar className="size-5 text-[var(--atria-primary)]" />
        <div>
          <h2 className="text-lg font-semibold text-[var(--atria-primary)]">
            Cronograma de Publicações
          </h2>
          <p className="text-sm text-[var(--atria-primary)]/50">
            Próximas 3 semanas
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--atria-primary)]/15 bg-white/30 px-4 py-10 text-center text-sm text-[var(--atria-primary)]/50">
          Nenhuma publicação agendada.
        </div>
      ) : (
        <div className="relative">
          <div className="absolute top-0 bottom-0 left-[7px] w-px bg-[var(--atria-primary)]/15" />
          <div className="flex flex-col gap-6">
            {Array.from(groupedByDay.entries()).map(([dayKey, dayItems]) => (
              <div key={dayKey}>
                <p className="mb-3 pl-6 text-xs font-bold uppercase tracking-wider text-[var(--atria-primary)]/50">
                  {new Date(dayKey).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </p>
                <div className="flex flex-col gap-3">
                  {dayItems.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="relative pl-6">
                      <span
                        className="absolute top-3 left-0 size-3.5 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <Link
                        href={
                          item.type === "post"
                            ? `/content/${item.id}`
                            : item.referenceUrl ?? "/calendar"
                        }
                        className="group flex items-center justify-between gap-3 rounded-xl border border-white/40 bg-white/50 px-4 py-3 transition-colors hover:bg-white/80"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--atria-primary)] group-hover:underline">
                            {item.title}
                          </p>
                          <p className="text-xs text-[var(--atria-primary)]/60">
                            {item.clientName}
                            {item.platform
                              ? ` · ${PLATFORM_LABELS[item.platform]}`
                              : " · Evento"}
                            {item.format
                              ? ` · ${FORMAT_LABELS[item.format]}`
                              : ""}
                          </p>
                          <p className="mt-0.5 text-[10px] font-medium text-[var(--atria-primary)]/40">
                            {formatScheduleDate(item.scheduledAt)}
                          </p>
                          {item.type === "post" &&
                          item.metaPublishStatus &&
                          META_STATUS_LABELS[item.metaPublishStatus] ? (
                            <p
                              className={`mt-0.5 text-[10px] font-semibold ${
                                item.metaPublishStatus === "failed"
                                  ? "text-red-600"
                                  : item.metaPublishStatus === "published"
                                    ? "text-emerald-700"
                                    : "text-indigo-700"
                              }`}
                              title={item.metaPublishError ?? undefined}
                            >
                              {META_STATUS_LABELS[item.metaPublishStatus]}
                              {item.metaPublishStatus === "failed" &&
                              item.metaPublishError
                                ? ` — ${item.metaPublishError}`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                        {item.referenceUrl ? (
                          <ExternalLink className="size-4 shrink-0 text-[var(--atria-primary)]/30" />
                        ) : (
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                            style={{ backgroundColor: item.color }}
                          >
                            {item.type === "post" ? "Post" : "Evento"}
                          </span>
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </LiquidGlassCard>
  );
}

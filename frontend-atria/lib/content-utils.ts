import type { ContentPostStatus } from "@/services/types";

export const CONTENT_STATUS_LABELS: Record<ContentPostStatus, string> = {
  draft: "Rascunho",
  pending_approval: "Em Aprovação",
  approved: "Aprovado",
  rejected: "Rejeitado",
  scheduled: "Agendado",
  published: "Publicado",
};

export function isMetaPublishRateLimitMessage(
  message: string | null | undefined,
): boolean {
  if (!message?.trim()) {
    return false;
  }
  return (
    /request limit reached/i.test(message) ||
    /rate limit/i.test(message) ||
    /Limite de requisições/i.test(message) ||
    /Limite da Meta/i.test(message)
  );
}

export const INSTAGRAM_PUBLISH_STATUS_LABELS: Record<
  string,
  string
> = {
  none: "—",
  queued: "Na fila (IG)",
  publishing: "Publicando…",
  published: "No Instagram",
  failed: "Falha no IG",
};

export const CONTENT_STATUS_STYLES: Record<ContentPostStatus, string> = {
  draft: "bg-[var(--atria-primary)]/10 text-[var(--atria-primary)]",
  pending_approval: "bg-[var(--atria-accent)]/40 text-[var(--atria-primary)]",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  scheduled: "bg-[var(--atria-accent)]/30 text-[var(--atria-primary)]",
  published: "bg-green-100 text-green-700",
};

export const LIQUID_GLASS_CLASS =
  "rounded-2xl border border-white/20 bg-white/60 shadow-lg shadow-black/5 backdrop-blur-md supports-[backdrop-filter]:bg-white/50";

export const LIQUID_GLASS_ACCENT_CLASS =
  "rounded-2xl border border-[var(--atria-accent)]/30 bg-[var(--atria-accent)]/10 shadow-lg shadow-[var(--atria-accent)]/10 backdrop-blur-md";

export function formatContentDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isMediaVideo(url: string, mimeType?: string | null) {
  if (mimeType?.startsWith("video/")) return true;
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

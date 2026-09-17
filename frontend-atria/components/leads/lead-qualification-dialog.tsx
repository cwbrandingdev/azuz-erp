"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Lead } from "@/services/types";

type InstagramPostSnapshot = {
  likes: number | null;
  views: number | null;
  timestamp: string | null;
  isPinned?: boolean;
};

type InstagramQualification = {
  username?: string;
  profileUrl?: string;
  recentPosts?: InstagramPostSnapshot[];
  lastPostAt?: string | null;
  daysSinceLastPost?: number | null;
  averageLikesRecent?: number | null;
  averageViewsRecent?: number | null;
  fetchedAt?: string;
};

function readInstagramQualification(rawData: unknown): InstagramQualification | null {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return null;
  }
  const snapshot = (rawData as Record<string, unknown>).instagramQualification;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }
  return snapshot as InstagramQualification;
}

function formatPostDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMetric(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR");
}

type LeadQualificationDialogProps = {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequalify?: () => void;
  requalifying?: boolean;
};

export function LeadQualificationDialog({
  lead,
  open,
  onOpenChange,
  onRequalify,
  requalifying,
}: LeadQualificationDialogProps) {
  if (!lead) {
    return null;
  }

  const instagram = readInstagramQualification(lead.rawData);
  const posts = instagram?.recentPosts?.slice(0, 2) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="border-b border-[var(--atria-primary)]/10 pb-4">
          <DialogTitle className="text-[var(--atria-primary)]">
            Qualificação — {lead.name}
          </DialogTitle>
          {lead.aiScore != null && (
            <p className="text-2xl font-semibold text-[var(--atria-primary)]">
              {lead.aiScore}
              <span className="text-base font-normal text-[var(--atria-primary)]/50">
                /100
              </span>
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          {instagram && posts.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-[var(--atria-primary)]">
                Instagram @{instagram.username}
              </h3>
              <p className="text-xs text-[var(--atria-primary)]/50">
                2 posts mais recentes (fixados ignorados)
              </p>
              <div className="overflow-hidden rounded-lg border border-[var(--atria-primary)]/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--atria-primary)]/5 text-xs text-[var(--atria-primary)]/60">
                    <tr>
                      <th className="px-3 py-2 font-medium">Post</th>
                      <th className="px-3 py-2 font-medium">Data</th>
                      <th className="px-3 py-2 font-medium">Curtidas</th>
                      <th className="px-3 py-2 font-medium">Views</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--atria-primary)]/80">
                    {posts.map((post, index) => (
                      <tr
                        key={index}
                        className="border-t border-[var(--atria-primary)]/10"
                      >
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2">{formatPostDate(post.timestamp)}</td>
                        <td className="px-3 py-2">{formatMetric(post.likes)}</td>
                        <td className="px-3 py-2">{formatMetric(post.views)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-1 text-xs text-[var(--atria-primary)]/60">
                {instagram.averageLikesRecent != null && (
                  <p>
                    Média de curtidas:{" "}
                    <span className="font-medium text-[var(--atria-primary)]/80">
                      {formatMetric(instagram.averageLikesRecent)}
                    </span>
                  </p>
                )}
                {instagram.averageViewsRecent != null && (
                  <p>
                    Média de views:{" "}
                    <span className="font-medium text-[var(--atria-primary)]/80">
                      {formatMetric(instagram.averageViewsRecent)}
                    </span>
                  </p>
                )}
                {instagram.daysSinceLastPost != null && (
                  <p>
                    Último post há{" "}
                    <span className="font-medium text-[var(--atria-primary)]/80">
                      {instagram.daysSinceLastPost} dia(s)
                    </span>
                  </p>
                )}
              </div>
            </section>
          )}

          {lead.aiNotes && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-[var(--atria-primary)]">
                Justificativa do score
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--atria-primary)]/70">
                {lead.aiNotes}
              </p>
            </section>
          )}

          {!lead.aiNotes && lead.aiScore == null && (
            <p className="text-sm text-[var(--atria-primary)]/50">
              Este lead ainda não foi qualificado.
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-[var(--atria-primary)]/10 pt-4">
          {onRequalify && (
            <Button
              type="button"
              variant="outline"
              disabled={requalifying}
              onClick={onRequalify}
            >
              {requalifying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Qualificar novamente
            </Button>
          )}
          <Button type="button" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

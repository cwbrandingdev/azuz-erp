"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  commercialFitBadgeVariant,
  commercialFitLabel,
  readCommercialFit,
  readInstagramQualification,
} from "@/lib/lead-qualification-utils";
import type { Lead } from "@/services/types";

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
  const commercial = readCommercialFit(lead.rawData);
  const posts = instagram?.recentPosts?.slice(0, 2) ?? [];
  const fitLabel = commercialFitLabel(commercial?.verdict);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="border-b border-[var(--atria-primary)]/10 pb-4">
          <DialogTitle className="text-[var(--atria-primary)]">
            Qualificação — {lead.name}
          </DialogTitle>
          {lead.aiScore != null && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl font-semibold text-[var(--atria-primary)]">
                {lead.aiScore}
                <span className="text-base font-normal text-[var(--atria-primary)]/50">
                  /100
                </span>
              </p>
              {fitLabel && (
                <Badge variant={commercialFitBadgeVariant(commercial?.verdict)}>
                  {fitLabel}
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          {commercial && (
            <section className="space-y-2 rounded-lg border border-[var(--atria-primary)]/10 bg-[var(--atria-primary)]/[0.02] p-3">
              <h3 className="text-sm font-medium text-[var(--atria-primary)]">
                Fit comercial CW
              </h3>
              <p className="text-sm text-[var(--atria-primary)]/80">
                <span className="font-medium">Segmento:</span>{" "}
                {commercial.segmentLabel ?? "—"}
              </p>
              {commercial.estimatedRevenueBand && (
                <p className="text-sm text-[var(--atria-primary)]/70">
                  {commercial.estimatedRevenueBand}
                </p>
              )}
              {commercial.shareCapital != null && (
                <p className="text-sm text-[var(--atria-primary)]/70">
                  <span className="font-medium text-[var(--atria-primary)]/85">
                    Capital social (Receita):
                  </span>{" "}
                  R${" "}
                  {commercial.shareCapital.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
              {commercial.revenueJustification && (
                <p className="text-sm leading-relaxed text-[var(--atria-primary)]/70">
                  <span className="font-medium text-[var(--atria-primary)]/85">
                    Por que esse faturamento:
                  </span>{" "}
                  {commercial.revenueJustification}
                </p>
              )}
              {commercial.minPackageMonthly != null && (
                <p className="text-xs text-[var(--atria-primary)]/60">
                  Pacote entrada (Posicionamento): R{" "}
                  {commercial.minPackageMonthly.toLocaleString("pt-BR")}/mês
                  {commercial.packageSharePercent != null
                    ? ` — ~${commercial.packageSharePercent}% do faturamento estimado`
                    : ""}
                </p>
              )}
              {commercial.summary && (
                <p className="text-sm leading-relaxed text-[var(--atria-primary)]/75">
                  {commercial.summary}
                </p>
              )}
              {commercial.usedAi && (
                <p className="text-xs text-[var(--atria-primary)]/50">
                  Análise refinada com IA (bio/categoria ambígua).
                </p>
              )}
            </section>
          )}

          {instagram?.biography && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-[var(--atria-primary)]">
                Bio Instagram
                {instagram.username ? ` @${instagram.username}` : ""}
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--atria-primary)]/75">
                {instagram.biography}
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-[var(--atria-primary)]/60">
                {instagram.followersCount != null && (
                  <span>
                    Seguidores:{" "}
                    <strong className="text-[var(--atria-primary)]/80">
                      {formatMetric(instagram.followersCount)}
                    </strong>
                  </span>
                )}
                {instagram.businessCategoryName && (
                  <span>
                    Categoria:{" "}
                    <strong className="text-[var(--atria-primary)]/80">
                      {instagram.businessCategoryName}
                    </strong>
                  </span>
                )}
              </div>
            </section>
          )}

          {instagram && posts.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-[var(--atria-primary)]">
                Posts recentes
              </h3>
              <p className="text-xs text-[var(--atria-primary)]/50">
                2 mais novos (fixados ignorados)
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
                        <td className="px-3 py-2">
                          {formatPostDate(post.timestamp)}
                        </td>
                        <td className="px-3 py-2">{formatMetric(post.likes)}</td>
                        <td className="px-3 py-2">{formatMetric(post.views)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {instagram.daysSinceLastPost != null && (
                <p className="text-xs text-[var(--atria-primary)]/60">
                  Último post há {instagram.daysSinceLastPost} dia(s)
                </p>
              )}
            </section>
          )}

          {lead.aiNotes && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-[var(--atria-primary)]">
                Justificativa completa
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

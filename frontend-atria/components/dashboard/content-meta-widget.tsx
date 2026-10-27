import Link from "next/link";
import { ArrowRight, BarChart2, Calendar, PenLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DashboardOverview } from "@/services/types";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

interface ContentMetaWidgetProps {
  data: DashboardOverview["contentAndMeta"];
}

export function ContentMetaWidget({ data }: ContentMetaWidgetProps) {
  return (
    <Card className="flex h-full flex-col rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[var(--atria-primary)] p-2 text-white">
            <BarChart2 className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--atria-primary)]">
              Conteúdo & Meta
            </h2>
            <p className="text-xs text-[var(--atria-primary)]/50">
              Campanha destaque e posts agendados
            </p>
          </div>
        </div>
      </div>

      {data.topCampaign ? (
        <div className="mb-4 rounded-xl border border-[var(--atria-accent)]/40 bg-[var(--atria-accent)]/10 p-4">
          <div className="mb-1 flex items-center gap-2">
            <BarChart2 className="size-4 text-[var(--atria-primary)]" />
            <span className="text-xs font-medium text-[var(--atria-primary)]/60">
              Top campanha Meta
            </span>
          </div>
          <p className="font-semibold text-[var(--atria-primary)]">
            {data.topCampaign.name}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <span className="font-medium text-green-600">
              ROAS {data.topCampaign.roas.toFixed(1)}x
            </span>
            <span className="text-[var(--atria-primary)]/60">
              CTR {data.topCampaign.ctr.toFixed(2)}%
            </span>
            <span className="text-[var(--atria-primary)]/60">
              {data.topCampaign.spend.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <Link
            href="/insights"
            prefetch={false}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--atria-primary)] hover:underline"
          >
            Ver insights <ArrowRight className="size-3" />
          </Link>
        </div>
      ) : (
        <p className="mb-4 text-sm text-[var(--atria-primary)]/40">
          Nenhuma campanha ativa.
        </p>
      )}

      <div className="flex-1">
        <div className="mb-2 flex items-center gap-2">
          <PenLine className="size-4 text-[var(--atria-primary)]" />
          <span className="text-xs font-semibold text-[var(--atria-primary)]">
            Próximos posts agendados
          </span>
        </div>

        {data.scheduledPosts.length === 0 ? (
          <p className="text-sm text-[var(--atria-primary)]/40">
            Nenhum post agendado.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.scheduledPosts.map((post) => (
              <li
                key={post.id}
                className="flex items-center justify-between rounded-lg border border-[var(--atria-primary)]/10 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--atria-primary)]">
                    {post.title}
                  </p>
                  <p className="text-[10px] text-[var(--atria-primary)]/50">
                    {PLATFORM_LABELS[post.platform] ?? post.platform}
                  </p>
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-1 text-[10px] text-[var(--atria-primary)]/50">
                  <Calendar className="size-3" />
                  {new Date(post.scheduledDate).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/kanban"
          prefetch={false}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--atria-primary)] hover:underline"
        >
          Gerenciar conteúdo <ArrowRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}

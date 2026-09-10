"use client";

import {
  Eye,
  HeartHandshake,
  MessageCircle,
  MousePointerClick,
  TrendingUp,
  UserMinus,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { InstagramAudienceMetrics } from "@/services/types";

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

interface AudienceMetricCardsProps {
  data: InstagramAudienceMetrics;
}

export function AudienceMetricCards({ data }: AudienceMetricCardsProps) {
  const cards = [
    {
      key: "newFollowers",
      label: "Novos seguidores",
      value: formatNumber(data.newFollowers),
      subtitle: `${formatNumber(data.netFollowers)} líquido no mês`,
      icon: Users,
    },
    {
      key: "unfollows",
      label: "Unfollows",
      value: formatNumber(data.unfollows),
      icon: UserMinus,
    },
    {
      key: "profileVisits",
      label: "Visitas ao perfil",
      value: formatNumber(data.profileVisits),
      icon: Eye,
    },
    {
      key: "bioClicks",
      label: "Cliques na bio",
      value: formatNumber(data.bioClicks),
      icon: MousePointerClick,
    },
    {
      key: "reach",
      label: "Alcance",
      value: formatNumber(data.reach),
      icon: TrendingUp,
    },
    {
      key: "conversationsStarted",
      label: "Conversas iniciadas",
      value: formatNumber(data.conversationsStarted),
      subtitle: `${formatNumber(data.comments)} comentários no mês`,
      icon: MessageCircle,
    },
    {
      key: "engagement",
      label: "Contas engajadas",
      value: formatNumber(data.engagement),
      subtitle: `${formatNumber(data.postsCount)} publicações no mês`,
      icon: HeartHandshake,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.key}
            className="rounded-2xl border border-[var(--atria-primary)]/10 bg-white p-5"
          >
            <div className="mb-3 inline-flex rounded-xl bg-[var(--atria-accent)]/30 p-2 text-[var(--atria-primary)]">
              <Icon className="size-4" />
            </div>
            <p className="text-2xl font-bold text-[var(--atria-primary)]">
              {card.value}
            </p>
            <p className="text-xs text-[var(--atria-primary)]/60">
              {card.label}
            </p>
            {card.subtitle ? (
              <p className="mt-1 text-[10px] text-[var(--atria-primary)]/45">
                {card.subtitle}
              </p>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

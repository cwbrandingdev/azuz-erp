export type CommercialFitVerdict =
  | "high"
  | "medium"
  | "low"
  | "do_not_prioritize";

export type CommercialFitSnapshot = {
  segmentLabel?: string;
  estimatedRevenueBand?: string;
  verdict?: CommercialFitVerdict;
  commercialScore?: number;
  summary?: string;
  revenueJustification?: string;
  shareCapital?: number | null;
  minPackageMonthly?: number;
  packageSharePercent?: number | null;
  affordability?: string;
  recommendedAction?: string;
  usedAi?: boolean;
};

export type InstagramQualificationSnapshot = {
  username?: string;
  biography?: string | null;
  followersCount?: number | null;
  followsCount?: number | null;
  businessCategoryName?: string | null;
  externalUrl?: string | null;
  recentPosts?: Array<{
    likes: number | null;
    views: number | null;
    timestamp: string | null;
  }>;
  daysSinceLastPost?: number | null;
  averageLikesRecent?: number | null;
  averageViewsRecent?: number | null;
};

export function readCommercialFit(rawData: unknown): CommercialFitSnapshot | null {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return null;
  }
  const snapshot = (rawData as Record<string, unknown>).commercialFit;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }
  return snapshot as CommercialFitSnapshot;
}

export function readInstagramQualification(
  rawData: unknown,
): InstagramQualificationSnapshot | null {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return null;
  }
  const snapshot = (rawData as Record<string, unknown>).instagramQualification;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }
  return snapshot as InstagramQualificationSnapshot;
}

export function commercialFitLabel(verdict: CommercialFitVerdict | undefined) {
  switch (verdict) {
    case "high":
      return "Fit alto";
    case "medium":
      return "Fit médio";
    case "low":
      return "Fit baixo";
    case "do_not_prioritize":
      return "Não priorizar";
    default:
      return null;
  }
}

export function commercialFitBadgeVariant(
  verdict: CommercialFitVerdict | undefined,
): "default" | "secondary" | "success" | "destructive" | "warning" | "outline" {
  switch (verdict) {
    case "high":
      return "success";
    case "medium":
      return "secondary";
    case "low":
      return "warning";
    case "do_not_prioritize":
      return "destructive";
    default:
      return "outline";
  }
}

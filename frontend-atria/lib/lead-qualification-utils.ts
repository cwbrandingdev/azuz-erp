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

export type InstagramMediaType = "image" | "carousel" | "reel" | "video";

export type InstagramQualificationSnapshot = {
  username?: string;
  profileUrl?: string;
  fullName?: string | null;
  profilePicUrl?: string | null;
  biography?: string | null;
  followersCount?: number | null;
  followsCount?: number | null;
  postsCount?: number | null;
  highlightCount?: number | null;
  verified?: boolean | null;
  businessCategoryName?: string | null;
  externalUrl?: string | null;
  recentPosts?: Array<{
    likes: number | null;
    comments?: number | null;
    views: number | null;
    timestamp: string | null;
    mediaType?: InstagramMediaType;
    displayUrl?: string | null;
    caption?: string | null;
    permalink?: string | null;
  }>;
  lastPostAt?: string | null;
  daysSinceLastPost?: number | null;
  averageLikesRecent?: number | null;
  averageViewsRecent?: number | null;
  averageReelViews?: number | null;
  statsVersion?: number;
  fetchedAt?: string;
};

export type FacadeSnapshot = {
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  fetchedAt?: string;
  provider?: string;
};

export type CnpjMatchMethod =
  | "existing_cnpj"
  | "website"
  | "phone"
  | "name_city";

export type RegistrySnapshot = {
  cnpj?: string;
  capitalSocial?: number | null;
  legalName?: string | null;
  companySize?: string | null;
  matchMethod?: CnpjMatchMethod;
  fetchedAt?: string;
};

export type RegistryLookupStatus = "not_found" | "unavailable";

export type RegistryLookupCache = {
  status?: RegistryLookupStatus;
  fetchedAt?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const FACADE_HIT_MS = 30 * DAY_MS;
const FACADE_MISS_MS = 7 * DAY_MS;
const REGISTRY_HIT_MS = 30 * DAY_MS;
const REGISTRY_MISS_MS = 7 * DAY_MS;
const REGISTRY_UNAVAILABLE_MS = 15 * 60 * 1000;
const INSTAGRAM_CACHE_MS = 72 * 60 * 60 * 1000;

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

function readRecord(rawData: unknown, key: string): Record<string, unknown> | null {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return null;
  }
  const value = (rawData as Record<string, unknown>)[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function isFresh(iso: string | null | undefined, maxAgeMs: number): boolean {
  if (!iso) return false;
  const fetchedAt = Date.parse(iso);
  if (!Number.isFinite(fetchedAt)) return false;
  const age = Date.now() - fetchedAt;
  return age >= 0 && age < maxAgeMs;
}

export function readFacade(rawData: unknown): FacadeSnapshot | null {
  const snapshot = readRecord(rawData, "facade");
  if (!snapshot?.fetchedAt || typeof snapshot.fetchedAt !== "string") {
    return null;
  }
  return snapshot as FacadeSnapshot;
}

export function readRegistrySnapshot(rawData: unknown): RegistrySnapshot | null {
  const snapshot = readRecord(rawData, "registrySnapshot");
  if (!snapshot?.cnpj || typeof snapshot.cnpj !== "string") return null;
  return snapshot as RegistrySnapshot;
}

export function readRegistryLookup(rawData: unknown): RegistryLookupCache | null {
  const snapshot = readRecord(rawData, "registryLookup");
  if (
    snapshot?.status !== "not_found" &&
    snapshot?.status !== "unavailable"
  ) {
    return null;
  }
  return snapshot as RegistryLookupCache;
}

export function cnpjMatchMethodLabel(
  method: CnpjMatchMethod | undefined,
): string | null {
  switch (method) {
    case "existing_cnpj":
      return "CNPJ já conhecido";
    case "website":
      return "CNPJ no site";
    case "phone":
      return "Telefone igual ao da Receita";
    case "name_city":
      return "Nome e cidade parecidos";
    default:
      return null;
  }
}

export function isLeadDossierReady(lead: {
  rawData?: unknown;
  instagram?: string | null;
}): boolean {
  const facade = readFacade(lead.rawData);
  if (!facade) return false;
  const facadeWindow = facade.imageUrl ? FACADE_HIT_MS : FACADE_MISS_MS;
  if (!isFresh(facade.fetchedAt, facadeWindow)) return false;

  const registry = readRegistrySnapshot(lead.rawData);
  const lookup = readRegistryLookup(lead.rawData);
  const registryReady =
    (registry != null && isFresh(registry.fetchedAt, REGISTRY_HIT_MS)) ||
    (lookup?.status === "not_found" &&
      isFresh(lookup.fetchedAt, REGISTRY_MISS_MS)) ||
    (lookup?.status === "unavailable" &&
      isFresh(lookup.fetchedAt, REGISTRY_UNAVAILABLE_MS));
  if (!registryReady) return false;

  if (!lead.instagram?.trim()) return true;
  const instagram = readInstagramQualification(lead.rawData);
  if (!instagram || !isFresh(instagram.fetchedAt, INSTAGRAM_CACHE_MS)) {
    return false;
  }
  const posts = instagram.recentPosts ?? [];
  const hasPostDate =
    Boolean(instagram.lastPostAt) ||
    posts.some((post) => Boolean(post.timestamp));
  if ((instagram.statsVersion ?? 0) < 2) return false;
  if (posts.length > 0 && !hasPostDate && instagram.statsVersion !== 3) {
    return false;
  }
  if (posts.length > 0 && posts.some((post) => post.displayUrl === undefined)) {
    return false;
  }
  return true;
}

export function isRegistryQualified(rawData: unknown): boolean {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return false;
  }
  return (rawData as Record<string, unknown>).qualified === true;
}

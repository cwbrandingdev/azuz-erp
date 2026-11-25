import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompanySettingsService } from '../../company-settings/company-settings.service';
import { MetaDatePreset } from './dto/query-meta-analytics.dto';

export interface MetaAnalyticsSummary {
  totalSpend: number;
  totalRevenue: number;
  netProfit: number;
  roas: number;
  cpc: number;
  cpm: number;
  ctr: number;
  clicks: number;
  impressions: number;
  reach: number;
  frequency: number;
  purchases: number;
  leads: number;
  addsToCart: number;
  landingPageViews: number;
  messagingConversations: number;
  linkClicks: number;
  postEngagement: number;
  datePreset: MetaDatePreset | 'custom';
  periodStart: string | null;
  periodEnd: string | null;
  source: 'meta';
}

export interface MetaAdAccountClient {
  id: string;
  accountId: string;
  name: string;
  accountStatus: number;
  currency: string;
  amountSpent: number;
  isActive: boolean;
}

export interface MetaAdAccountsResponse {
  clients: MetaAdAccountClient[];
  source: 'meta';
}

export interface MetaClientPerformancePoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  revenue: number;
  ctr: number;
  messagingConversations: number;
}

export type MetaCampaignStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'learning'
  | 'unknown';

export interface MetaCampaignInsight {
  id: string;
  name: string;
  status: MetaCampaignStatus;
  effectiveStatus: string;
  budget: number;
  budgetType: 'daily' | 'lifetime' | null;
  spend: number;
  reach: number;
  frequency: number;
  impressions: number;
  clicks: number;
  cpc: number;
  cpm: number;
  ctr: number;
  conversions: number;
  revenue: number;
  roas: number;
  messagingConversations: number;
  linkClicks: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface MetaCampaignsResponse {
  campaigns: MetaCampaignInsight[];
  source: 'meta';
  empty: boolean;
}

export interface MetaClientInsightsResponse {
  client: MetaAdAccountClient;
  overview: MetaAnalyticsSummary;
  performance: MetaClientPerformancePoint[];
  campaigns: MetaCampaignInsight[];
  source: 'meta';
  empty: boolean;
}

export interface MetaAgencyAccountRow {
  client: MetaAdAccountClient;
  overview: MetaAnalyticsSummary;
  empty: boolean;
}

export interface MetaAgencyOverviewResponse {
  accounts: MetaAgencyAccountRow[];
  totals: MetaAnalyticsSummary;
  source: 'meta';
  empty: boolean;
}

export interface MetaAdsKpis {
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  linkClicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  landingPageViews: number;
  addsToCart: number;
  checkouts: number;
  purchases: number;
  leads: number;
  costPerPurchase: number;
  costPerLead: number;
  messagingConversations: number;
  postEngagement: number;
  videoP25: number;
  videoP50: number;
  videoP75: number;
  videoP100: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface MetaAdsDailyPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  linkClicks: number;
  revenue: number;
  purchases: number;
  leads: number;
}

export interface MetaAdsEntityRow {
  id: string;
  name: string;
  parentName: string | null;
  objective: string | null;
  objectiveLabel: string | null;
  status: MetaCampaignStatus | null;
  budget: number;
  budgetType: 'daily' | 'lifetime' | null;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  linkClicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  leads: number;
  revenue: number;
  roas: number;
  costPerPurchase: number;
  landingPageViews: number;
}

export interface MetaAdsCreativeRow extends MetaAdsEntityRow {
  thumbnailUrl: string | null;
  headline: string | null;
  primaryText: string | null;
}

export interface MetaAdsBreakdownRow {
  key: string;
  label: string;
  detail: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  leads: number;
  revenue: number;
  roas: number;
}

export interface MetaAdsFunnelStep {
  key: string;
  label: string;
  value: number;
  rateFromPrevious: number | null;
  rateFromStart: number | null;
}

export interface MetaAdsReport {
  client: MetaAdAccountClient;
  overview: MetaAdsKpis;
  previous: MetaAdsKpis | null;
  performance: MetaAdsDailyPoint[];
  campaigns: MetaAdsEntityRow[];
  adSets: MetaAdsEntityRow[];
  ads: MetaAdsCreativeRow[];
  platforms: MetaAdsBreakdownRow[];
  placements: MetaAdsBreakdownRow[];
  demographics: MetaAdsBreakdownRow[];
  countries: MetaAdsBreakdownRow[];
  devices: MetaAdsBreakdownRow[];
  objectives: MetaAdsBreakdownRow[];
  funnel: MetaAdsFunnelStep[];
  source: 'meta';
  empty: boolean;
}

interface MetaInsightsRow {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  reach?: string;
  frequency?: string;
  impressions?: string;
  clicks?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  date_start?: string;
  date_stop?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  video_p25_watched_actions?: Array<{ action_type: string; value: string }>;
  video_p50_watched_actions?: Array<{ action_type: string; value: string }>;
  video_p75_watched_actions?: Array<{ action_type: string; value: string }>;
  video_p100_watched_actions?: Array<{ action_type: string; value: string }>;
  publisher_platform?: string;
  platform_position?: string;
  age?: string;
  gender?: string;
  country?: string;
  device_platform?: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
}

interface MetaInsightsResponse {
  data?: MetaInsightsRow[];
  paging?: { next?: string };
  error?: { message: string; type: string; code: number };
}

interface MetaCampaignRow {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
}

interface MetaCampaignsListResponse {
  data?: MetaCampaignRow[];
  paging?: { next?: string };
  error?: { message: string; type?: string; code?: number };
}

interface MetaAdAccountRow {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
  currency: string;
  amount_spent?: string;
}

interface MetaAdAccountsListResponse {
  data?: MetaAdAccountRow[];
  paging?: { next?: string };
  error?: { message: string; type?: string; code?: number };
}

interface MetaAdAccountDetailResponse {
  id?: string;
  name?: string;
  account_id?: string;
  account_status?: number;
  currency?: string;
  amount_spent?: string;
  error?: { message: string; type?: string; code?: number };
}

export interface MetaPeriodFilter {
  datePreset?: MetaDatePreset;
  month?: number;
  year?: number;
}

const GRAPH_API_VERSION = 'v19.0';
const INSIGHT_FIELDS =
  'spend,reach,frequency,impressions,clicks,cpc,cpm,ctr,actions,action_values';
const DAILY_INSIGHT_FIELDS =
  'spend,impressions,clicks,ctr,actions,action_values,date_start,date_stop';
const CAMPAIGN_INSIGHT_FIELDS =
  'campaign_id,campaign_name,spend,reach,frequency,impressions,clicks,cpc,cpm,ctr,actions,action_values,date_start,date_stop';
const CAMPAIGN_FIELDS =
  'id,name,objective,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time';
const REPORT_FIELDS =
  'spend,reach,frequency,impressions,clicks,cpc,cpm,ctr,actions,action_values,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions';
const BREAKDOWN_FIELDS =
  'spend,impressions,clicks,cpc,cpm,ctr,actions,action_values';
const PURCHASE_ACTION_TYPES = [
  'omni_purchase',
  'purchase',
  'offsite_conversion.fb_pixel_purchase',
  'onsite_conversion.purchase',
];
const LEAD_ACTION_TYPES = [
  'lead',
  'offsite_conversion.fb_pixel_lead',
  'onsite_conversion.lead_grouped',
  'complete_registration',
];
const ADD_TO_CART_ACTION_TYPES = [
  'omni_add_to_cart',
  'add_to_cart',
  'offsite_conversion.fb_pixel_add_to_cart',
];
const CHECKOUT_ACTION_TYPES = [
  'omni_initiated_checkout',
  'initiate_checkout',
  'offsite_conversion.fb_pixel_initiate_checkout',
];
const LANDING_PAGE_ACTION_TYPES = [
  'omni_landing_page_view',
  'landing_page_view',
];
const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_AWARENESS: 'Reconhecimento',
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_ENGAGEMENT: 'Engajamento',
  OUTCOME_LEADS: 'Cadastros',
  OUTCOME_APP_PROMOTION: 'Aplicativo',
  OUTCOME_SALES: 'Vendas',
  REACH: 'Alcance',
  BRAND_AWARENESS: 'Reconhecimento',
  LINK_CLICKS: 'Cliques no link',
  POST_ENGAGEMENT: 'Engajamento',
  VIDEO_VIEWS: 'Visualizações de vídeo',
  LEAD_GENERATION: 'Cadastros',
  MESSAGES: 'Mensagens',
  CONVERSIONS: 'Vendas',
  APP_INSTALLS: 'Instalações',
  PRODUCT_CATALOG_SALES: 'Catálogo',
};
const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  audience_network: 'Audience Network',
  messenger: 'Messenger',
  threads: 'Threads',
  unknown: 'Não informado',
};
const POSITION_LABELS: Record<string, string> = {
  feed: 'Feed',
  facebook_reels: 'Reels',
  instagram_reels: 'Reels',
  facebook_stories: 'Stories',
  instagram_stories: 'Stories',
  instagram_explore: 'Explorar',
  instagram_explore_grid_home: 'Explorar',
  marketplace: 'Marketplace',
  video_feeds: 'Vídeos',
  search: 'Pesquisa',
  right_hand_column: 'Coluna direita',
  an_classic: 'Clássico',
  rewarded_video: 'Vídeo recompensado',
  biz_disco_feed: 'Descobrir',
};
const DEVICE_LABELS: Record<string, string> = {
  mobile_app: 'App no celular',
  mobile_web: 'Navegador no celular',
  desktop: 'Computador',
  unknown: 'Não informado',
};
const GENDER_LABELS: Record<string, string> = {
  female: 'Feminino',
  male: 'Masculino',
  unknown: 'Não informado',
};
const AD_ACCOUNT_FIELDS =
  'id,name,account_id,account_status,currency,amount_spent';
const DEFAULT_AD_ACCOUNT_ID = 'act_781471881330330';

@Injectable()
export class MetaAnalyticsService {
  private readonly logger = new Logger(MetaAnalyticsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly companySettings: CompanySettingsService,
  ) {}

  async getAnalytics(
    period: MetaPeriodFilter = {},
    clientId?: string,
    adAccountId?: string,
  ): Promise<MetaAnalyticsSummary> {
    const accountId = await this.resolveAccountId(clientId, adAccountId);
    const accessToken = await this.resolveAccessToken();
    return this.fetchAccountSummary(accountId, period, accessToken);
  }

  async getAdAccounts(search?: string): Promise<MetaAdAccountsResponse> {
    const accessToken = await this.resolveAccessToken();
    const clients = await this.fetchAllAdAccounts(accessToken);
    const filtered = this.filterClientsBySearch(clients, search).sort(
      (a, b) => b.amountSpent - a.amountSpent,
    );

    return {
      clients: filtered,
      source: 'meta',
    };
  }

  async getClientInsights(
    clientId: string | undefined,
    period: MetaPeriodFilter = {},
  ): Promise<MetaClientInsightsResponse> {
    const accessToken = await this.resolveAccessToken();
    const accountId = await this.resolveAccountId(clientId);
    const account =
      (await this.fetchAdAccountDetail(accountId, accessToken)) ??
      this.buildFallbackClient(accountId);

    const client = this.mapAdAccountRow(account);
    const [overview, performance, campaigns] = await Promise.all([
      this.fetchAccountSummary(accountId, period, accessToken),
      this.fetchAccountDailyPerformance(accountId, period, accessToken),
      this.fetchCampaignInsights(accountId, period, accessToken),
    ]);

    const empty = this.isOverviewEmpty(overview) && campaigns.length === 0;

    return {
      client,
      overview,
      performance,
      campaigns,
      source: 'meta',
      empty,
    };
  }

  async getCampaigns(
    clientId: string | undefined,
    period: MetaPeriodFilter = {},
  ): Promise<MetaCampaignsResponse> {
    const accessToken = await this.resolveAccessToken();
    const accountId = await this.resolveAccountId(clientId);
    const campaigns = await this.fetchCampaignInsights(
      accountId,
      period,
      accessToken,
    );

    return {
      campaigns,
      source: 'meta',
      empty: campaigns.length === 0,
    };
  }

  async getAgencyOverview(
    period: MetaPeriodFilter = {},
    search?: string,
  ): Promise<MetaAgencyOverviewResponse> {
    const accessToken = await this.resolveAccessToken();
    const clients = this.filterClientsBySearch(
      await this.fetchAllAdAccounts(accessToken),
      search,
    ).sort((a, b) => b.amountSpent - a.amountSpent);

    const accounts: MetaAgencyAccountRow[] = [];

    for (const client of clients) {
      try {
        const overview = await this.fetchAccountSummary(
          client.id,
          period,
          accessToken,
        );
        accounts.push({
          client,
          overview,
          empty: this.isOverviewEmpty(overview),
        });
      } catch (error) {
        this.logger.warn(
          `Failed to load insights for ${client.id}: ${String(error)}`,
        );
        accounts.push({
          client,
          overview: this.buildEmptySummary(period),
          empty: true,
        });
      }
    }

    const totals = this.sumOverviews(
      accounts.map((item) => item.overview),
      period,
    );

    return {
      accounts,
      totals,
      source: 'meta',
      empty: accounts.every((item) => item.empty),
    };
  }

  async getAccountReport(
    clientId: string | undefined,
    period: MetaPeriodFilter = {},
  ): Promise<MetaAdsReport> {
    const accessToken = await this.resolveAccessToken();
    const accountId = await this.resolveAccountId(clientId);
    const ranges = this.resolveRanges(period);
    const currentRange: { since: string; until: string } | 'maximum' =
      ranges.useMaximum || !ranges.current ? 'maximum' : ranges.current;

    const [
      account,
      overviewResult,
      previousResult,
      dailyResult,
      campaignResult,
      campaignMeta,
      adSetResult,
      adResult,
      platformResult,
      placementResult,
      demographicResult,
      countryResult,
      deviceResult,
    ] = await Promise.all([
      this.fetchAdAccountDetail(accountId, accessToken),
      this.fetchInsightRows(accountId, accessToken, currentRange, {
        fields: REPORT_FIELDS,
      }),
      ranges.previous
        ? this.fetchInsightRows(accountId, accessToken, ranges.previous, {
            fields: REPORT_FIELDS,
          })
        : Promise.resolve({ rows: [], failed: false }),
      this.fetchInsightRows(accountId, accessToken, currentRange, {
        fields: REPORT_FIELDS,
        timeIncrement: '1',
        limit: '100',
      }),
      this.fetchInsightRows(accountId, accessToken, currentRange, {
        fields: `campaign_id,campaign_name,${REPORT_FIELDS}`,
        level: 'campaign',
        limit: '100',
      }),
      this.fetchAllCampaignMeta(accountId, accessToken),
      this.fetchInsightRows(accountId, accessToken, currentRange, {
        fields: `adset_id,adset_name,campaign_name,${REPORT_FIELDS}`,
        level: 'adset',
        limit: '100',
      }),
      this.fetchInsightRows(accountId, accessToken, currentRange, {
        fields: `ad_id,ad_name,adset_name,campaign_name,${REPORT_FIELDS}`,
        level: 'ad',
        limit: '50',
      }),
      this.fetchInsightRows(accountId, accessToken, currentRange, {
        fields: BREAKDOWN_FIELDS,
        breakdowns: 'publisher_platform',
        limit: '25',
      }),
      this.fetchInsightRows(accountId, accessToken, currentRange, {
        fields: BREAKDOWN_FIELDS,
        breakdowns: 'publisher_platform,platform_position',
        limit: '100',
      }),
      this.fetchInsightRows(accountId, accessToken, currentRange, {
        fields: BREAKDOWN_FIELDS,
        breakdowns: 'age,gender',
        limit: '100',
      }),
      this.fetchInsightRows(accountId, accessToken, currentRange, {
        fields: BREAKDOWN_FIELDS,
        breakdowns: 'country',
        limit: '50',
      }),
      this.fetchInsightRows(accountId, accessToken, currentRange, {
        fields: BREAKDOWN_FIELDS,
        breakdowns: 'device_platform',
        limit: '20',
      }),
    ]);

    const metaById = new Map(
      campaignMeta.map((campaign) => [campaign.id, campaign]),
    );
    const overview = this.buildKpis(
      overviewResult.rows[0],
      ranges.current,
    );
    const previous =
      ranges.previous && !previousResult.failed
        ? this.buildKpis(previousResult.rows[0], ranges.previous)
        : null;

    const campaigns = campaignResult.rows
      .filter((row) => row.campaign_id)
      .map((row) => {
        const meta = metaById.get(row.campaign_id!);
        const budget = this.resolveCampaignBudget(meta);
        return this.mapInsightEntity(row, {
          id: row.campaign_id!,
          name: row.campaign_name ?? meta?.name ?? 'Campanha',
          parentName: null,
          objective: meta?.objective ?? null,
          status: meta
            ? this.mapCampaignStatus(
                meta.effective_status ?? meta.status ?? 'UNKNOWN',
              )
            : null,
          budget: budget.budget,
          budgetType: budget.budgetType,
        });
      })
      .sort((a, b) => b.spend - a.spend);

    const adSets = adSetResult.rows
      .filter((row) => row.adset_id)
      .map((row) =>
        this.mapInsightEntity(row, {
          id: row.adset_id!,
          name: row.adset_name ?? 'Conjunto',
          parentName: row.campaign_name ?? null,
          objective: null,
          status: null,
          budget: 0,
          budgetType: null,
        }),
      )
      .sort((a, b) => b.spend - a.spend);

    const topAds = adResult.rows
      .filter((row) => row.ad_id)
      .map((row) => row)
      .sort(
        (a, b) => this.parseNumber(b.spend) - this.parseNumber(a.spend),
      )
      .slice(0, 25);
    const creatives = await this.fetchAdCreatives(
      topAds.map((row) => row.ad_id!),
      accessToken,
    );
    const ads: MetaAdsCreativeRow[] = topAds.map((row) => {
      const creative = creatives.get(row.ad_id!);
      const parent = [row.campaign_name, row.adset_name]
        .filter(Boolean)
        .join(' · ');
      return {
        ...this.mapInsightEntity(row, {
          id: row.ad_id!,
          name: row.ad_name ?? creative?.headline ?? 'Anúncio',
          parentName: parent || null,
          objective: null,
          status: null,
          budget: 0,
          budgetType: null,
        }),
        thumbnailUrl: creative?.thumbnailUrl ?? null,
        headline: creative?.headline ?? null,
        primaryText: creative?.primaryText ?? null,
      };
    });

    const client = this.mapAdAccountRow(
      account ?? this.buildFallbackClient(accountId),
    );

    return {
      client,
      overview,
      previous,
      performance: dailyResult.rows
        .map((row) => ({
          date: row.date_start ?? row.date_stop ?? '',
          spend: this.parseNumber(row.spend),
          impressions: this.parseNumber(row.impressions),
          clicks: this.parseNumber(row.clicks),
          linkClicks: this.pickAction(row.actions, ['link_click']),
          revenue: this.pickAction(row.action_values, PURCHASE_ACTION_TYPES),
          purchases: this.pickAction(row.actions, PURCHASE_ACTION_TYPES),
          leads: this.pickAction(row.actions, LEAD_ACTION_TYPES),
        }))
        .filter((point) => point.date),
      campaigns,
      adSets,
      ads,
      platforms: this.mapBreakdowns(platformResult.rows, (row) => {
        const key = row.publisher_platform ?? 'unknown';
        return {
          key,
          label: PLATFORM_LABELS[key] ?? this.humanizeKey(key),
          detail: null,
        };
      }),
      placements: this.mapBreakdowns(placementResult.rows, (row) => {
        const platform = row.publisher_platform ?? 'unknown';
        const position = row.platform_position ?? 'unknown';
        return {
          key: `${platform}:${position}`,
          label: `${PLATFORM_LABELS[platform] ?? this.humanizeKey(platform)} · ${POSITION_LABELS[position] ?? this.humanizeKey(position)}`,
          detail: null,
        };
      }).slice(0, 12),
      demographics: this.mapBreakdowns(demographicResult.rows, (row) => {
        const age = row.age ?? 'Não informado';
        const gender = row.gender ?? 'unknown';
        return {
          key: `${age}:${gender}`,
          label: age,
          detail: GENDER_LABELS[gender] ?? this.humanizeKey(gender),
        };
      }),
      countries: this.mapBreakdowns(countryResult.rows, (row) => {
        const code = row.country ?? 'unknown';
        return {
          key: code,
          label: this.countryLabel(code),
          detail: code === 'unknown' ? null : code,
        };
      }).slice(0, 12),
      devices: this.mapBreakdowns(deviceResult.rows, (row) => {
        const key = row.device_platform ?? 'unknown';
        return {
          key,
          label: DEVICE_LABELS[key] ?? this.humanizeKey(key),
          detail: null,
        };
      }),
      objectives: this.aggregateObjectives(campaignResult.rows, metaById),
      funnel: this.buildFunnel(overview),
      source: 'meta',
      empty:
        overview.spend === 0 &&
        overview.impressions === 0 &&
        campaigns.length === 0,
    };
  }

  private async fetchInsightRows(
    accountId: string,
    accessToken: string,
    range: { since: string; until: string } | 'maximum',
    options: {
      fields: string;
      level?: string;
      breakdowns?: string;
      timeIncrement?: string;
      limit?: string;
    },
  ): Promise<{ rows: MetaInsightsRow[]; failed: boolean }> {
    const rows: MetaInsightsRow[] = [];
    const url = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${accountId}/insights`,
    );
    url.searchParams.set('fields', options.fields);
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('limit', options.limit ?? '100');
    if (options.level) url.searchParams.set('level', options.level);
    if (options.breakdowns) url.searchParams.set('breakdowns', options.breakdowns);
    if (options.timeIncrement) {
      url.searchParams.set('time_increment', options.timeIncrement);
    }
    if (range === 'maximum') {
      url.searchParams.set('date_preset', 'maximum');
    } else {
      url.searchParams.set('time_range', JSON.stringify(range));
    }

    let nextUrl: string | null = url.toString();
    let pages = 0;

    while (nextUrl && pages < 4) {
      const payload = await this.fetchJson<MetaInsightsResponse>(nextUrl);
      if (payload.error) {
        this.logger.warn(
          `Meta report insights (${options.level ?? 'account'} ${options.breakdowns ?? ''}): ${payload.error.message}`,
        );
        return { rows, failed: rows.length === 0 };
      }
      rows.push(...(payload.data ?? []));
      nextUrl = payload.paging?.next ?? null;
      pages += 1;
    }

    return { rows, failed: false };
  }

  private async fetchAdCreatives(
    adIds: string[],
    accessToken: string,
  ): Promise<
    Map<string, { thumbnailUrl: string | null; headline: string | null; primaryText: string | null }>
  > {
    const creatives = new Map<
      string,
      { thumbnailUrl: string | null; headline: string | null; primaryText: string | null }
    >();
    if (adIds.length === 0) return creatives;

    const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/`);
    url.searchParams.set('ids', adIds.join(','));
    url.searchParams.set('fields', 'creative{thumbnail_url,image_url,title,body}');
    url.searchParams.set('access_token', accessToken);

    const payload = await this.fetchJson<
      Record<string, { creative?: { thumbnail_url?: string; image_url?: string; title?: string; body?: string }; error?: { message: string } } | { message: string }>
    >(url.toString());

    if ('error' in payload && payload.error && !Array.isArray(payload)) {
      const message =
        typeof payload.error === 'object' && payload.error && 'message' in payload.error
          ? String(payload.error.message)
          : 'creative lookup failed';
      this.logger.warn(`Meta ad creatives: ${message}`);
      return creatives;
    }

    for (const id of adIds) {
      const node = payload[id];
      if (!node || !('creative' in node)) continue;
      const creative = node.creative;
      creatives.set(id, {
        thumbnailUrl: creative?.thumbnail_url ?? creative?.image_url ?? null,
        headline: creative?.title ?? null,
        primaryText: creative?.body ?? null,
      });
    }

    return creatives;
  }

  private resolveRanges(period: MetaPeriodFilter): {
    current: { since: string; until: string } | null;
    previous: { since: string; until: string } | null;
    useMaximum: boolean;
  } {
    if (period.month && period.year) {
      const since = new Date(Date.UTC(period.year, period.month - 1, 1));
      const until = new Date(Date.UTC(period.year, period.month, 0));
      return {
        current: { since: this.formatUtc(since), until: this.formatUtc(until) },
        previous: this.previousWindow(since, until),
        useMaximum: false,
      };
    }

    const preset = period.datePreset ?? 'last_90d';
    if (preset === 'maximum') {
      return { current: null, previous: null, useMaximum: true };
    }

    const today = new Date();
    const utcToday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    let since = utcToday;
    let until = utcToday;

    if (preset === 'yesterday') {
      since = this.addUtcDays(utcToday, -1);
      until = since;
    } else if (preset === 'last_7d') {
      since = this.addUtcDays(utcToday, -6);
    } else if (preset === 'last_14d') {
      since = this.addUtcDays(utcToday, -13);
    } else if (preset === 'last_28d') {
      since = this.addUtcDays(utcToday, -27);
    } else if (preset === 'last_30d') {
      since = this.addUtcDays(utcToday, -29);
    } else if (preset === 'last_90d') {
      since = this.addUtcDays(utcToday, -89);
    } else if (preset === 'this_month') {
      since = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth(), 1));
    } else if (preset === 'last_month') {
      since = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth() - 1, 1));
      until = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth(), 0));
    } else if (preset === 'this_quarter') {
      const quarterStart = Math.floor(utcToday.getUTCMonth() / 3) * 3;
      since = new Date(Date.UTC(utcToday.getUTCFullYear(), quarterStart, 1));
    } else if (preset === 'this_year') {
      since = new Date(Date.UTC(utcToday.getUTCFullYear(), 0, 1));
    } else if (preset === 'last_year') {
      since = new Date(Date.UTC(utcToday.getUTCFullYear() - 1, 0, 1));
      until = new Date(Date.UTC(utcToday.getUTCFullYear() - 1, 11, 31));
    }

    return {
      current: { since: this.formatUtc(since), until: this.formatUtc(until) },
      previous: this.previousWindow(since, until),
      useMaximum: false,
    };
  }

  private previousWindow(since: Date, until: Date) {
    const length =
      Math.round((until.getTime() - since.getTime()) / 86_400_000) + 1;
    const prevUntil = this.addUtcDays(since, -1);
    const prevSince = this.addUtcDays(prevUntil, -(length - 1));
    return {
      since: this.formatUtc(prevSince),
      until: this.formatUtc(prevUntil),
    };
  }

  private addUtcDays(date: Date, days: number) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private formatUtc(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private buildKpis(
    row: MetaInsightsRow | undefined,
    range: { since: string; until: string } | null,
  ): MetaAdsKpis {
    const spend = this.parseNumber(row?.spend);
    const revenue = this.pickAction(row?.action_values, PURCHASE_ACTION_TYPES);
    const purchases = this.pickAction(row?.actions, PURCHASE_ACTION_TYPES);
    const leads = this.pickAction(row?.actions, LEAD_ACTION_TYPES);
    const impressions = this.parseNumber(row?.impressions);
    const clicks = this.parseNumber(row?.clicks);

    return {
      spend,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      impressions,
      reach: this.parseNumber(row?.reach),
      frequency: this.parseNumber(row?.frequency),
      clicks,
      linkClicks: this.pickAction(row?.actions, ['link_click']),
      ctr: this.parseNumber(row?.ctr) || (impressions > 0 ? (clicks / impressions) * 100 : 0),
      cpc: this.parseNumber(row?.cpc) || (clicks > 0 ? spend / clicks : 0),
      cpm: this.parseNumber(row?.cpm) || (impressions > 0 ? (spend / impressions) * 1000 : 0),
      landingPageViews: this.pickAction(row?.actions, LANDING_PAGE_ACTION_TYPES),
      addsToCart: this.pickAction(row?.actions, ADD_TO_CART_ACTION_TYPES),
      checkouts: this.pickAction(row?.actions, CHECKOUT_ACTION_TYPES),
      purchases,
      leads,
      costPerPurchase: purchases > 0 ? spend / purchases : 0,
      costPerLead: leads > 0 ? spend / leads : 0,
      messagingConversations: this.pickAction(row?.actions, [
        'onsite_conversion.messaging_conversation_started_7d',
      ]),
      postEngagement: this.pickAction(row?.actions, ['post_engagement']),
      videoP25: this.sumActionList(row?.video_p25_watched_actions),
      videoP50: this.sumActionList(row?.video_p50_watched_actions),
      videoP75: this.sumActionList(row?.video_p75_watched_actions),
      videoP100: this.sumActionList(row?.video_p100_watched_actions),
      periodStart: row?.date_start ?? range?.since ?? null,
      periodEnd: row?.date_stop ?? range?.until ?? null,
    };
  }

  private mapInsightEntity(
    row: MetaInsightsRow,
    identity: {
      id: string;
      name: string;
      parentName: string | null;
      objective: string | null;
      status: MetaCampaignStatus | null;
      budget: number;
      budgetType: 'daily' | 'lifetime' | null;
    },
  ): MetaAdsEntityRow {
    const spend = this.parseNumber(row.spend);
    const purchases = this.pickAction(row.actions, PURCHASE_ACTION_TYPES);
    const revenue = this.pickAction(row.action_values, PURCHASE_ACTION_TYPES);
    const impressions = this.parseNumber(row.impressions);
    const clicks = this.parseNumber(row.clicks);

    return {
      ...identity,
      objectiveLabel: identity.objective
        ? OBJECTIVE_LABELS[identity.objective] ?? this.humanizeKey(identity.objective)
        : null,
      spend,
      impressions,
      reach: this.parseNumber(row.reach),
      frequency: this.parseNumber(row.frequency),
      clicks,
      linkClicks: this.pickAction(row.actions, ['link_click']),
      ctr: this.parseNumber(row.ctr) || (impressions > 0 ? (clicks / impressions) * 100 : 0),
      cpc: this.parseNumber(row.cpc) || (clicks > 0 ? spend / clicks : 0),
      cpm: this.parseNumber(row.cpm) || (impressions > 0 ? (spend / impressions) * 1000 : 0),
      purchases,
      leads: this.pickAction(row.actions, LEAD_ACTION_TYPES),
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      costPerPurchase: purchases > 0 ? spend / purchases : 0,
      landingPageViews: this.pickAction(row.actions, LANDING_PAGE_ACTION_TYPES),
    };
  }

  private mapBreakdowns(
    rows: MetaInsightsRow[],
    identify: (row: MetaInsightsRow) => { key: string; label: string; detail: string | null },
  ): MetaAdsBreakdownRow[] {
    const grouped = new Map<string, MetaAdsBreakdownRow>();

    for (const row of rows) {
      const identity = identify(row);
      const spend = this.parseNumber(row.spend);
      const impressions = this.parseNumber(row.impressions);
      const clicks = this.parseNumber(row.clicks);
      const purchases = this.pickAction(row.actions, PURCHASE_ACTION_TYPES);
      const leads = this.pickAction(row.actions, LEAD_ACTION_TYPES);
      const revenue = this.pickAction(row.action_values, PURCHASE_ACTION_TYPES);
      const current = grouped.get(identity.key) ?? {
        ...identity,
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        purchases: 0,
        leads: 0,
        revenue: 0,
        roas: 0,
      };
      current.spend += spend;
      current.impressions += impressions;
      current.clicks += clicks;
      current.purchases += purchases;
      current.leads += leads;
      current.revenue += revenue;
      grouped.set(identity.key, current);
    }

    return [...grouped.values()]
      .map((row) => ({
        ...row,
        spend: Number(row.spend.toFixed(2)),
        revenue: Number(row.revenue.toFixed(2)),
        ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0,
        cpc: row.clicks > 0 ? row.spend / row.clicks : 0,
        cpm: row.impressions > 0 ? (row.spend / row.impressions) * 1000 : 0,
        roas: row.spend > 0 ? row.revenue / row.spend : 0,
      }))
      .sort((a, b) => b.spend - a.spend);
  }

  private aggregateObjectives(
    rows: MetaInsightsRow[],
    metaById: Map<string, MetaCampaignRow>,
  ): MetaAdsBreakdownRow[] {
    return this.mapBreakdowns(rows, (row) => {
      const objective = metaById.get(row.campaign_id ?? '')?.objective ?? 'UNKNOWN';
      return {
        key: objective,
        label: OBJECTIVE_LABELS[objective] ?? 'Sem objetivo',
        detail: null,
      };
    });
  }

  private buildFunnel(kpis: MetaAdsKpis): MetaAdsFunnelStep[] {
    const steps: Array<{ key: string; label: string; value: number }> = [
      { key: 'impressions', label: 'Impressões', value: kpis.impressions },
      { key: 'link_clicks', label: 'Cliques no link', value: kpis.linkClicks },
      { key: 'landing', label: 'Visualizações da página', value: kpis.landingPageViews },
      { key: 'cart', label: 'Adições ao carrinho', value: kpis.addsToCart },
      { key: 'checkout', label: 'Checkouts iniciados', value: kpis.checkouts },
      { key: 'purchase', label: 'Compras', value: kpis.purchases },
    ];

    return steps.map((step, index) => {
      const previous = index === 0 ? null : steps[index - 1].value;
      const start = steps[0].value;
      return {
        ...step,
        rateFromPrevious:
          previous && previous > 0 ? step.value / previous : null,
        rateFromStart: start > 0 ? step.value / start : null,
      };
    });
  }

  private pickAction(
    actions: Array<{ action_type: string; value: string }> | undefined,
    types: string[],
  ) {
    if (!actions?.length) return 0;
    for (const type of types) {
      const match = actions.find((action) => action.action_type === type);
      if (match) return this.parseNumber(match.value);
    }
    return 0;
  }

  private sumActionList(actions?: Array<{ value: string }>) {
    if (!actions?.length) return 0;
    return actions.reduce((sum, action) => sum + this.parseNumber(action.value), 0);
  }

  private humanizeKey(value: string) {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private countryLabel(code: string) {
    if (!code || code === 'unknown') return 'Não informado';
    try {
      return new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(code) ?? code;
    } catch {
      return code;
    }
  }

  private async fetchAllAdAccounts(
    accessToken: string,
  ): Promise<MetaAdAccountClient[]> {
    const clients: MetaAdAccountClient[] = [];
    let nextUrl: string | null = (() => {
      const url = new URL(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/me/adaccounts`,
      );
      url.searchParams.set('fields', AD_ACCOUNT_FIELDS);
      url.searchParams.set('limit', '50');
      url.searchParams.set('access_token', accessToken);
      return url.toString();
    })();

    while (nextUrl) {
      const payload = await this.fetchJson<MetaAdAccountsListResponse>(nextUrl);
      if (payload.error) {
        throw new ServiceUnavailableException(
          `Meta ad accounts error: ${payload.error.message}`,
        );
      }

      for (const account of payload.data ?? []) {
        clients.push(this.mapAdAccountRow(account));
      }

      nextUrl = payload.paging?.next ?? null;
    }

    return clients;
  }

  private async fetchAccountSummary(
    accountId: string,
    period: MetaPeriodFilter,
    accessToken: string,
  ): Promise<MetaAnalyticsSummary> {
    const url = this.buildInsightsUrl(accountId, accessToken, period);
    const payload = await this.fetchJson<MetaInsightsResponse>(url.toString());

    if (payload.error) {
      this.logger.warn(
        `Meta insights error for ${accountId}: ${payload.error.message}`,
      );
      return this.buildEmptySummary(period);
    }

    const row = payload.data?.[0];
    if (!row) {
      return this.buildEmptySummary(period);
    }

    return this.normalizeRow(row, period, 'meta');
  }

  private async fetchAccountDailyPerformance(
    accountId: string,
    period: MetaPeriodFilter,
    accessToken: string,
  ): Promise<MetaClientPerformancePoint[]> {
    const url = this.buildInsightsUrl(accountId, accessToken, period);
    url.searchParams.set('fields', DAILY_INSIGHT_FIELDS);
    url.searchParams.set('time_increment', '1');

    const payload = await this.fetchJson<MetaInsightsResponse>(url.toString());

    if (payload.error || !payload.data?.length) {
      return [];
    }

    return payload.data.map((row) => ({
      date: row.date_start ?? row.date_stop ?? '',
      spend: this.parseNumber(row.spend),
      impressions: this.parseNumber(row.impressions),
      clicks: this.parseNumber(row.clicks),
      revenue: this.extractRevenue(row.action_values),
      ctr: this.parseNumber(row.ctr),
      messagingConversations: this.extractActionValue(
        row.actions,
        'onsite_conversion.messaging_conversation_started_7d',
      ),
    }));
  }

  private async fetchCampaignInsights(
    accountId: string,
    period: MetaPeriodFilter,
    accessToken: string,
  ): Promise<MetaCampaignInsight[]> {
    const [insightRows, campaignMeta] = await Promise.all([
      this.fetchAllCampaignInsightRows(accountId, period, accessToken),
      this.fetchAllCampaignMeta(accountId, accessToken),
    ]);

    const metaById = new Map(
      campaignMeta.map((campaign) => [campaign.id, campaign]),
    );

    const campaigns = insightRows
      .filter((row) => row.campaign_id)
      .map((row) => {
        const meta = metaById.get(row.campaign_id!);
        return this.normalizeCampaignRow(row, meta);
      })
      .sort((a, b) => b.spend - a.spend);

    // Include campaigns with budget/status but no insights in the period
    for (const meta of campaignMeta) {
      if (campaigns.some((campaign) => campaign.id === meta.id)) continue;
      campaigns.push(this.normalizeCampaignMetaOnly(meta));
    }

    return campaigns.sort((a, b) => b.spend - a.spend);
  }

  private async fetchAllCampaignInsightRows(
    accountId: string,
    period: MetaPeriodFilter,
    accessToken: string,
  ): Promise<MetaInsightsRow[]> {
    const rows: MetaInsightsRow[] = [];
    const initialUrl = this.buildInsightsUrl(accountId, accessToken, period);
    initialUrl.searchParams.set('fields', CAMPAIGN_INSIGHT_FIELDS);
    initialUrl.searchParams.set('level', 'campaign');
    initialUrl.searchParams.set('limit', '100');

    let nextUrl: string | null = initialUrl.toString();

    while (nextUrl) {
      const payload = await this.fetchJson<MetaInsightsResponse>(nextUrl);

      if (payload.error) {
        this.logger.warn(
          `Meta campaign insights error for ${accountId}: ${payload.error.message}`,
        );
        break;
      }

      rows.push(...(payload.data ?? []));
      nextUrl = payload.paging?.next ?? null;
    }

    return rows;
  }

  private async fetchAllCampaignMeta(
    accountId: string,
    accessToken: string,
  ): Promise<MetaCampaignRow[]> {
    const campaigns: MetaCampaignRow[] = [];
    let nextUrl: string | null = (() => {
      const url = new URL(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${accountId}/campaigns`,
      );
      url.searchParams.set('fields', CAMPAIGN_FIELDS);
      url.searchParams.set('limit', '100');
      url.searchParams.set(
        'filtering',
        JSON.stringify([
          {
            field: 'effective_status',
            operator: 'IN',
            value: [
              'ACTIVE',
              'PAUSED',
              'CAMPAIGN_PAUSED',
              'IN_PROCESS',
              'WITH_ISSUES',
            ],
          },
        ]),
      );
      url.searchParams.set('access_token', accessToken);
      return url.toString();
    })();

    while (nextUrl) {
      const payload = await this.fetchJson<MetaCampaignsListResponse>(nextUrl);

      if (payload.error) {
        this.logger.warn(
          `Meta campaigns list error for ${accountId}: ${payload.error.message}`,
        );
        break;
      }

      for (const campaign of payload.data ?? []) {
        campaigns.push(campaign);
      }

      nextUrl = payload.paging?.next ?? null;
    }

    return campaigns;
  }

  private normalizeCampaignRow(
    row: MetaInsightsRow,
    meta?: MetaCampaignRow,
  ): MetaCampaignInsight {
    const spend = this.parseNumber(row.spend);
    const reach = this.parseNumber(row.reach);
    const frequency = this.parseNumber(row.frequency);
    const impressions = this.parseNumber(row.impressions);
    const clicks = this.parseNumber(row.clicks);
    const cpc = this.parseNumber(row.cpc);
    const cpm = this.parseNumber(row.cpm);
    const ctr = this.parseNumber(row.ctr);
    const revenue = this.extractRevenue(row.action_values);
    const conversions = this.extractConversions(row.actions);
    const messagingConversations = this.extractActionValue(
      row.actions,
      'onsite_conversion.messaging_conversation_started_7d',
    );
    const linkClicks = this.extractActionValue(row.actions, 'link_click');
    const { budget, budgetType } = this.resolveCampaignBudget(meta);
    const effectiveStatus = meta?.effective_status ?? meta?.status ?? 'UNKNOWN';

    return {
      id: row.campaign_id!,
      name: row.campaign_name ?? meta?.name ?? `Campanha ${row.campaign_id}`,
      status: this.mapCampaignStatus(effectiveStatus),
      effectiveStatus,
      budget,
      budgetType,
      spend,
      reach,
      frequency,
      impressions,
      clicks,
      cpc,
      cpm,
      ctr,
      conversions,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      messagingConversations,
      linkClicks,
      periodStart: row.date_start ?? null,
      periodEnd: row.date_stop ?? null,
    };
  }

  private normalizeCampaignMetaOnly(meta: MetaCampaignRow): MetaCampaignInsight {
    const effectiveStatus = meta.effective_status ?? meta.status ?? 'UNKNOWN';
    const { budget, budgetType } = this.resolveCampaignBudget(meta);

    return {
      id: meta.id,
      name: meta.name,
      status: this.mapCampaignStatus(effectiveStatus),
      effectiveStatus,
      budget,
      budgetType,
      spend: 0,
      reach: 0,
      frequency: 0,
      impressions: 0,
      clicks: 0,
      cpc: 0,
      cpm: 0,
      ctr: 0,
      conversions: 0,
      revenue: 0,
      roas: 0,
      messagingConversations: 0,
      linkClicks: 0,
      periodStart: null,
      periodEnd: null,
    };
  }

  private resolveCampaignBudget(meta?: MetaCampaignRow) {
    if (!meta) {
      return { budget: 0, budgetType: null as 'daily' | 'lifetime' | null };
    }

    if (meta.daily_budget) {
      return {
        budget: this.parseCents(meta.daily_budget),
        budgetType: 'daily' as const,
      };
    }

    if (meta.lifetime_budget) {
      return {
        budget: this.parseCents(meta.lifetime_budget),
        budgetType: 'lifetime' as const,
      };
    }

    return { budget: 0, budgetType: null as 'daily' | 'lifetime' | null };
  }

  private mapCampaignStatus(effectiveStatus: string): MetaCampaignStatus {
    const normalized = effectiveStatus.toUpperCase();

    if (normalized === 'ACTIVE') return 'active';
    if (
      normalized === 'PAUSED' ||
      normalized === 'CAMPAIGN_PAUSED' ||
      normalized === 'ADSET_PAUSED'
    ) {
      return 'paused';
    }
    if (
      normalized === 'DELETED' ||
      normalized === 'ARCHIVED' ||
      normalized === 'COMPLETED'
    ) {
      return 'completed';
    }
    if (normalized === 'IN_PROCESS' || normalized === 'WITH_ISSUES') {
      return 'learning';
    }

    return 'unknown';
  }

  private extractConversions(
    actions?: Array<{ action_type: string; value: string }>,
  ) {
    if (!actions?.length) return 0;

    const conversionTypes = new Set([
      'purchase',
      'omni_purchase',
      'offsite_conversion.fb_pixel_purchase',
      'onsite_conversion.purchase',
      'lead',
      'complete_registration',
    ]);

    return actions.reduce((sum, action) => {
      if (!conversionTypes.has(action.action_type)) return sum;
      return sum + this.parseNumber(action.value);
    }, 0);
  }

  private async fetchAdAccountDetail(
    accountId: string,
    accessToken: string,
  ): Promise<MetaAdAccountRow | null> {
    const url = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${accountId}`,
    );
    url.searchParams.set('fields', AD_ACCOUNT_FIELDS);
    url.searchParams.set('access_token', accessToken);

    const payload = await this.fetchJson<MetaAdAccountDetailResponse>(
      url.toString(),
    );

    if (payload.error || !payload.id) {
      return null;
    }

    return {
      id: payload.id,
      name: payload.name ?? `Conta ${accountId}`,
      account_id: payload.account_id ?? accountId.replace(/^act_/, ''),
      account_status: payload.account_status ?? 0,
      currency: payload.currency ?? 'BRL',
      amount_spent: payload.amount_spent,
    };
  }

  private buildInsightsUrl(
    accountId: string,
    accessToken: string,
    period: MetaPeriodFilter,
  ) {
    const url = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${accountId}/insights`,
    );
    url.searchParams.set('fields', INSIGHT_FIELDS);
    url.searchParams.set('access_token', accessToken);

    const customRange = this.resolveCustomTimeRange(period);
    if (customRange) {
      url.searchParams.set('time_range', JSON.stringify(customRange));
    } else {
      url.searchParams.set(
        'date_preset',
        period.datePreset ?? 'last_90d',
      );
    }

    return url;
  }

  private resolveCustomTimeRange(period: MetaPeriodFilter) {
    if (!period.month || !period.year) return null;

    const start = new Date(Date.UTC(period.year, period.month - 1, 1));
    const end = new Date(Date.UTC(period.year, period.month, 0));

    return {
      since: start.toISOString().slice(0, 10),
      until: end.toISOString().slice(0, 10),
    };
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return (await response.json()) as T;
  }

  private async resolveAccessToken() {
    const envToken = this.config.get<string>('META_ACCESS_TOKEN')?.trim();
    if (envToken) {
      return envToken;
    }

    try {
      const credentials =
        await this.companySettings.getIntegrationCredentialsForCurrentTenant();
      const tenantToken = credentials.metaPageAccessToken?.trim();
      if (tenantToken) {
        return tenantToken;
      }
    } catch {
    }

    throw new BadRequestException(
      'Token de acesso Meta não configurado (META_ACCESS_TOKEN no .env ou Integrações)',
    );
  }

  private async resolveAccountId(clientId?: string, adAccountId?: string) {
    const candidate = clientId?.trim() || adAccountId?.trim();
    if (candidate) {
      return this.normalizeAccountId(candidate);
    }

    const envAccountId = this.config.get<string>('META_AD_ACCOUNT_ID')?.trim();
    if (envAccountId) {
      return this.normalizeAccountId(envAccountId);
    }

    try {
      const credentials =
        await this.companySettings.getIntegrationCredentialsForCurrentTenant();
      const tenantAccountId = credentials.metaAdAccountId?.trim();
      if (tenantAccountId) {
        return this.normalizeAccountId(tenantAccountId);
      }
    } catch {
    }

    return DEFAULT_AD_ACCOUNT_ID;
  }

  private normalizeAccountId(accountId: string) {
    const trimmed = accountId.trim();
    if (trimmed.startsWith('act_')) return trimmed;
    if (/^\d+$/.test(trimmed)) return `act_${trimmed}`;
    return trimmed;
  }

  private isAccountActive(accountStatus?: number) {
    return accountStatus === 1;
  }

  private mapAdAccountRow(account: MetaAdAccountRow): MetaAdAccountClient {
    return {
      id: account.id,
      accountId: account.account_id,
      name: account.name,
      accountStatus: account.account_status,
      currency: account.currency,
      amountSpent: this.parseCents(account.amount_spent),
      isActive: this.isAccountActive(account.account_status),
    };
  }

  private buildFallbackClient(accountId: string): MetaAdAccountRow {
    return {
      id: this.normalizeAccountId(accountId),
      name: `Conta ${accountId.replace(/^act_/, '')}`,
      account_id: accountId.replace(/^act_/, ''),
      account_status: 1,
      currency: 'BRL',
      amount_spent: '0',
    };
  }

  private filterClientsBySearch(
    clients: MetaAdAccountClient[],
    search?: string,
  ) {
    const query = search?.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.accountId.includes(query) ||
        client.id.toLowerCase().includes(query),
    );
  }

  private normalizeRow(
    row: MetaInsightsRow,
    period: MetaPeriodFilter,
    source: 'meta',
  ): MetaAnalyticsSummary {
    const totalSpend = this.parseNumber(row.spend);
    const impressions = this.parseNumber(row.impressions);
    const clicks = this.parseNumber(row.clicks);
    const cpc = this.parseNumber(row.cpc);
    const cpm = this.parseNumber(row.cpm);
    const ctr = this.parseNumber(row.ctr);
    const totalRevenue = this.extractRevenue(row.action_values);
    const netProfit = totalRevenue - totalSpend;
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const reach = this.parseNumber(row.reach);
    const frequency = this.parseNumber(row.frequency);
    const purchases = this.pickAction(row.actions, PURCHASE_ACTION_TYPES);
    const leads = this.pickAction(row.actions, LEAD_ACTION_TYPES);
    const addsToCart = this.pickAction(row.actions, ADD_TO_CART_ACTION_TYPES);
    const landingPageViews = this.pickAction(row.actions, LANDING_PAGE_ACTION_TYPES);
    const messagingConversations = this.extractActionValue(
      row.actions,
      'onsite_conversion.messaging_conversation_started_7d',
    );
    const linkClicks = this.extractActionValue(row.actions, 'link_click');
    const postEngagement = this.extractActionValue(
      row.actions,
      'post_engagement',
    );

    return {
      totalSpend,
      totalRevenue,
      netProfit,
      roas,
      cpc,
      cpm,
      ctr,
      clicks,
      impressions,
      reach,
      frequency,
      purchases,
      leads,
      addsToCart,
      landingPageViews,
      messagingConversations,
      linkClicks,
      postEngagement,
      datePreset: period.month && period.year ? 'custom' : period.datePreset ?? 'last_90d',
      periodStart: row.date_start ?? null,
      periodEnd: row.date_stop ?? null,
      source,
    };
  }

  private extractRevenue(
    actionValues?: Array<{ action_type: string; value: string }>,
  ) {
    if (!actionValues?.length) return 0;

    return this.pickAction(actionValues, PURCHASE_ACTION_TYPES);
  }

  private extractActionValue(
    actions: Array<{ action_type: string; value: string }> | undefined,
    actionType: string,
  ) {
    if (!actions?.length) return 0;
    const match = actions.find((action) => action.action_type === actionType);
    return this.parseNumber(match?.value);
  }

  private parseNumber(value?: string) {
    if (!value) return 0;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private parseCents(value?: string) {
    const cents = this.parseNumber(value);
    return Number((cents / 100).toFixed(2));
  }

  private isOverviewEmpty(overview: MetaAnalyticsSummary) {
    return (
      overview.totalSpend === 0 &&
      overview.impressions === 0 &&
      overview.clicks === 0 &&
      overview.messagingConversations === 0
    );
  }

  private buildEmptySummary(period: MetaPeriodFilter): MetaAnalyticsSummary {
    const customRange = this.resolveCustomTimeRange(period);
    return {
      totalSpend: 0,
      totalRevenue: 0,
      netProfit: 0,
      roas: 0,
      cpc: 0,
      cpm: 0,
      ctr: 0,
      clicks: 0,
      impressions: 0,
      reach: 0,
      frequency: 0,
      purchases: 0,
      leads: 0,
      addsToCart: 0,
      landingPageViews: 0,
      messagingConversations: 0,
      linkClicks: 0,
      postEngagement: 0,
      datePreset: period.month && period.year ? 'custom' : period.datePreset ?? 'last_90d',
      periodStart: customRange?.since ?? null,
      periodEnd: customRange?.until ?? null,
      source: 'meta',
    };
  }

  private sumOverviews(
    overviews: MetaAnalyticsSummary[],
    period: MetaPeriodFilter,
  ): MetaAnalyticsSummary {
    const totals = this.buildEmptySummary(period);

    for (const item of overviews) {
      totals.totalSpend += item.totalSpend;
      totals.totalRevenue += item.totalRevenue;
      totals.clicks += item.clicks;
      totals.impressions += item.impressions;
      totals.reach += item.reach;
      totals.purchases += item.purchases;
      totals.leads += item.leads;
      totals.addsToCart += item.addsToCart;
      totals.landingPageViews += item.landingPageViews;
      totals.messagingConversations += item.messagingConversations;
      totals.linkClicks += item.linkClicks;
      totals.postEngagement += item.postEngagement;
    }

    totals.netProfit = totals.totalRevenue - totals.totalSpend;
    totals.roas =
      totals.totalSpend > 0 ? totals.totalRevenue / totals.totalSpend : 0;
    totals.cpc = totals.clicks > 0 ? totals.totalSpend / totals.clicks : 0;
    totals.cpm =
      totals.impressions > 0
        ? (totals.totalSpend / totals.impressions) * 1000
        : 0;
    totals.ctr =
      totals.impressions > 0
        ? (totals.clicks / totals.impressions) * 100
        : 0;

    totals.totalSpend = Number(totals.totalSpend.toFixed(2));
    totals.totalRevenue = Number(totals.totalRevenue.toFixed(2));
    totals.netProfit = Number(totals.netProfit.toFixed(2));
    totals.roas = Number(totals.roas.toFixed(2));
    totals.cpc = Number(totals.cpc.toFixed(2));
    totals.cpm = Number(totals.cpm.toFixed(2));
    totals.ctr = Number(totals.ctr.toFixed(2));

    return totals;
  }
}

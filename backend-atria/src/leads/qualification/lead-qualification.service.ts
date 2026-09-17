import { Injectable } from '@nestjs/common';
import { Lead, Prisma } from '@prisma/client';
import {
  CommercialFitService,
  type CommercialFitResult,
  CW_MIN_PACKAGE_MONTHLY,
} from './commercial-fit.service';
import { CompanyLookupService } from '../company-lookup/application/company-lookup.service';
import {
  InstagramApifyEnricher,
  type InstagramProfileQualificationData,
} from './instagram-apify.enricher';
import {
  extractCnpjFromLead,
  mergeRegistrySnapshotIntoRawData,
  parseShareCapital,
  readCachedRegistrySnapshot,
  readShareCapitalFromRawData,
  readLegalNameFromRawData,
  type RegistrySnapshot,
} from './registry-signals.util';

export interface LeadQualificationResult {
  score: number;
  operationalScore: number;
  commercialScore: number;
  qualified: boolean;
  notes: string;
  instagram?: InstagramProfileQualificationData | null;
  commercialFit?: CommercialFitResult;
  usedApify: boolean;
  mergedRawData: Prisma.InputJsonValue;
}

const QUALIFIED_THRESHOLD = 60;
const INSTAGRAM_CACHE_MS = 72 * 60 * 60 * 1000;
const OPERATIONAL_WEIGHT = 0.4;
const COMMERCIAL_WEIGHT = 0.6;

interface ScoreFactor {
  label: string;
  delta: number;
}

@Injectable()
export class LeadQualificationService {
  constructor(
    private readonly instagramEnricher: InstagramApifyEnricher,
    private readonly commercialFit: CommercialFitService,
    private readonly companyLookup: CompanyLookupService,
  ) {}

  async qualifyLead(
    lead: Lead,
    apifyToken: string | null,
  ): Promise<LeadQualificationResult> {
    const [instagramOutcome, enrichedLead] = await Promise.all([
      this.resolveInstagramData(lead, apifyToken),
      this.enrichLeadRegistry(lead),
    ]);

    const instagramData = instagramOutcome.data;
    const usedApify = instagramOutcome.usedApify;

    const commercialFit = await this.commercialFit.assess(
      enrichedLead,
      instagramData,
    );

    const { score: operationalScore, factors: operationalFactors } =
      this.computeOperationalScoreBreakdown(enrichedLead, instagramData);

    let commercialScore = commercialFit.commercialScore;
    const commercialFactors: ScoreFactor[] = [
      {
        label: `Fit comercial — ${commercialFit.segmentLabel}`,
        delta: commercialScore - 50,
      },
    ];

    if (commercialFit.verdict === 'do_not_prioritize') {
      commercialFactors.push({
        label: 'Não priorizar — ticket vs faturamento estimado',
        delta: -25,
      });
      commercialScore = Math.min(commercialScore, 25);
    }

    const blended = Math.round(
      operationalScore * OPERATIONAL_WEIGHT + commercialScore * COMMERCIAL_WEIGHT,
    );
    let score = Math.max(0, Math.min(100, blended));

    if (commercialFit.verdict === 'do_not_prioritize') {
      score = Math.min(score, 35);
    }

    const qualified = score >= QUALIFIED_THRESHOLD;
    const mergedRawData = this.mergeQualificationRawData(enrichedLead, {
      instagram: instagramData,
      commercialFit,
    });

    const notes = this.buildNotes(
      enrichedLead,
      instagramData,
      score,
      operationalScore,
      commercialScore,
      commercialFit,
      operationalFactors,
      commercialFactors,
      usedApify,
    );

    return {
      score,
      operationalScore,
      commercialScore,
      qualified,
      notes,
      instagram: instagramData,
      commercialFit,
      usedApify,
      mergedRawData,
    };
  }

  private async resolveInstagramData(
    lead: Lead,
    apifyToken: string | null,
  ): Promise<{
    data: InstagramProfileQualificationData | null;
    usedApify: boolean;
  }> {
    const cached = this.readCachedInstagram(lead);
    if (cached) {
      return { data: cached, usedApify: cached.provider === 'apify' };
    }

    if (!apifyToken || !lead.instagram?.trim()) {
      return { data: null, usedApify: false };
    }

    try {
      const data = await this.instagramEnricher.fetchProfileSignals(
        lead.instagram,
        apifyToken,
      );
      return { data, usedApify: Boolean(data) };
    } catch {
      return { data: null, usedApify: false };
    }
  }

  private async enrichLeadRegistry(lead: Lead): Promise<Lead> {
    if (readCachedRegistrySnapshot(lead.rawData)) {
      return lead;
    }

    const cnpj = extractCnpjFromLead(lead);
    if (!cnpj) {
      return lead;
    }

    const capitalFromRaw = readShareCapitalFromRawData(lead.rawData);
    if (capitalFromRaw != null) {
      const snapshot: RegistrySnapshot = {
        cnpj,
        capitalSocial: capitalFromRaw,
        legalName: readLegalNameFromRawData(lead.rawData),
        fetchedAt: new Date().toISOString(),
      };
      return {
        ...lead,
        rawData: mergeRegistrySnapshotIntoRawData(
          lead.rawData,
          snapshot,
        ) as Lead['rawData'],
      };
    }

    try {
      const record = await this.companyLookup.lookup(cnpj);
      if (!record) {
        return lead;
      }

      const snapshot: RegistrySnapshot = {
        cnpj: record.cnpj,
        capitalSocial:
          record.shareCapital ??
          parseShareCapital(record.rawData.capital_social) ??
          null,
        legalName: record.legalName,
        fetchedAt: new Date().toISOString(),
      };

      return {
        ...lead,
        rawData: mergeRegistrySnapshotIntoRawData(
          lead.rawData,
          snapshot,
        ) as Lead['rawData'],
      };
    } catch {
      return lead;
    }
  }

  mergeQualificationRawData(
    lead: Lead,
    input: {
      instagram: InstagramProfileQualificationData | null;
      commercialFit: CommercialFitResult | null;
    },
  ): Prisma.InputJsonValue {
    const base =
      lead.rawData &&
      typeof lead.rawData === 'object' &&
      !Array.isArray(lead.rawData)
        ? { ...(lead.rawData as Record<string, unknown>) }
        : {};

    if (input.instagram) {
      base.instagramQualification = input.instagram;
    }
    if (input.commercialFit) {
      base.commercialFit = {
        ...input.commercialFit,
        assessedAt: new Date().toISOString(),
      };
    }

    return base as Prisma.InputJsonValue;
  }

  /** @deprecated use mergeQualificationRawData */
  mergeInstagramIntoRawData(
    lead: Lead,
    instagram: InstagramProfileQualificationData | null,
  ): Prisma.InputJsonValue {
    return this.mergeQualificationRawData(lead, {
      instagram,
      commercialFit: null,
    });
  }

  private computeOperationalScoreBreakdown(
    lead: Lead,
    instagram: InstagramProfileQualificationData | null,
  ): { score: number; factors: ScoreFactor[] } {
    const factors: ScoreFactor[] = [{ label: 'Base operacional', delta: 35 }];
    let score = 35;

    if (lead.phone?.trim()) {
      score += 15;
      factors.push({ label: 'Telefone informado', delta: 15 });
    } else {
      factors.push({ label: 'Sem telefone', delta: 0 });
    }

    if (lead.website?.trim()) {
      score += 10;
      factors.push({ label: 'Site informado', delta: 10 });
    }
    if (lead.email?.trim()) {
      score += 5;
      factors.push({ label: 'E-mail informado', delta: 5 });
    }
    if (lead.instagram?.trim()) {
      score += 8;
      factors.push({ label: 'Instagram no cadastro', delta: 8 });
    }
    if (typeof lead.rating === 'number' && lead.rating >= 4) {
      score += 8;
      factors.push({ label: `Avaliação Google ≥ 4 (${lead.rating})`, delta: 8 });
    }
    if (typeof lead.reviewsCount === 'number' && lead.reviewsCount >= 20) {
      score += 7;
      factors.push({
        label: `Volume de avaliações (≥ 20: ${lead.reviewsCount})`,
        delta: 7,
      });
    }

    if (instagram) {
      const days = instagram.daysSinceLastPost;
      if (days != null) {
        if (days <= 14) {
          score += 12;
          factors.push({
            label: `Instagram ativo — último post há ${days} dia(s)`,
            delta: 12,
          });
        } else if (days <= 45) {
          score += 4;
          factors.push({
            label: `Instagram moderado — último post há ${days} dia(s)`,
            delta: 4,
          });
        } else {
          score -= 12;
          factors.push({
            label: `Instagram inativo — último post há ${days} dia(s)`,
            delta: -12,
          });
        }
      }

      const avgLikes = instagram.averageLikesRecent;
      if (avgLikes != null) {
        if (avgLikes >= 80) {
          score += 10;
          factors.push({
            label: `Engajamento alto — média ${avgLikes} curtidas`,
            delta: 10,
          });
        } else if (avgLikes >= 25) {
          score += 5;
          factors.push({
            label: `Engajamento médio — média ${avgLikes} curtidas`,
            delta: 5,
          });
        } else if (avgLikes < 10) {
          score -= 5;
          factors.push({
            label: `Engajamento baixo — média ${avgLikes} curtidas`,
            delta: -5,
          });
        }
      }
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      factors,
    };
  }

  private buildNotes(
    lead: Lead,
    instagram: InstagramProfileQualificationData | null,
    score: number,
    operationalScore: number,
    commercialScore: number,
    commercialFit: CommercialFitResult,
    operationalFactors: ScoreFactor[],
    commercialFactors: ScoreFactor[],
    usedApify: boolean,
  ): string {
    const lines: string[] = [];

    lines.push(
      `Score final ${score}/100 (operacional ${operationalScore}, comercial ${commercialScore}). Limite sugerido: ≥ ${QUALIFIED_THRESHOLD}.`,
    );
    lines.push('');

    lines.push('Fit comercial CW:');
    lines.push(`• Segmento: ${commercialFit.segmentLabel}.`);
    lines.push(`• ${commercialFit.estimatedRevenueBand}.`);
    if (commercialFit.shareCapital != null) {
      lines.push(
        `• Capital social (Receita): R$ ${commercialFit.shareCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
      );
    }
    if (commercialFit.revenueJustification?.trim()) {
      lines.push(`• Por que esse faturamento: ${commercialFit.revenueJustification}`);
    }
    lines.push(
      `• Pacote entrada Posicionamento: R$ ${CW_MIN_PACKAGE_MONTHLY.toLocaleString('pt-BR')}/mês` +
        (commercialFit.packageSharePercent != null
          ? ` (~${commercialFit.packageSharePercent}% do faturamento estimado).`
          : '.'),
    );
    lines.push(`• Veredito: ${this.verdictLabel(commercialFit.verdict)}.`);
    lines.push(`• ${commercialFit.summary}`);
    if (commercialFit.usedAi) {
      lines.push('• Refinado com IA (bio/categoria ambígua).');
    }
    lines.push('');

    if (instagram) {
      if (instagram.biography) {
        lines.push(`Bio @${instagram.username}:`);
        lines.push(instagram.biography);
        lines.push('');
      }
      if (instagram.followersCount != null) {
        lines.push(
          `• Seguidores: ${instagram.followersCount.toLocaleString('pt-BR')}` +
            (instagram.businessCategoryName
              ? ` | Categoria IG: ${instagram.businessCategoryName}`
              : ''),
        );
      }

      lines.push(
        `Posts recentes (2 mais novos, fixados ignorados) @${instagram.username}:`,
      );
      const posts = instagram.recentPosts.slice(0, 2);
      if (posts.length === 0) {
        lines.push('• Nenhum post após filtrar fixados.');
      } else {
        posts.forEach((post, index) => {
          const likes =
            post.likes != null ? `${post.likes} curtidas` : 'curtidas N/D';
          const views =
            post.views != null ? `${post.views} views` : 'views N/D';
          const when = post.timestamp
            ? this.formatPostDate(post.timestamp)
            : 'data N/D';
          lines.push(`• Post ${index + 1}: ${likes}, ${views}, ${when}.`);
        });
      }
      if (instagram.daysSinceLastPost != null) {
        lines.push(
          `• Último post há ${instagram.daysSinceLastPost} dia(s).`,
        );
      }
      if (usedApify) {
        lines.push('• Instagram via Apify.');
      }
    } else if (lead.instagram?.trim()) {
      lines.push(
        'Instagram informado, mas sem dados (Apify indisponível ou perfil restrito).',
      );
    }

    lines.push('');
    lines.push('Composição operacional:');
    for (const factor of operationalFactors) {
      lines.push(this.formatFactor(factor));
    }
    lines.push('');
    lines.push('Composição comercial:');
    for (const factor of commercialFactors) {
      lines.push(this.formatFactor(factor));
    }

    return lines.join('\n');
  }

  private formatFactor(factor: ScoreFactor): string {
    const delta =
      factor.delta === 0
        ? ''
        : ` (${factor.delta > 0 ? '+' : ''}${factor.delta})`;
    return `• ${factor.label}${delta}`;
  }

  private verdictLabel(verdict: CommercialFitResult['verdict']): string {
    switch (verdict) {
      case 'high':
        return 'Alto — priorizar';
      case 'medium':
        return 'Médio — validar na conversa';
      case 'low':
        return 'Baixo — nurture';
      case 'do_not_prioritize':
        return 'Não priorizar';
      default:
        return verdict;
    }
  }

  private formatPostDate(iso: string): string {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) {
      return iso;
    }
    return new Date(ms).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private readCachedInstagram(
    lead: Lead,
  ): InstagramProfileQualificationData | null {
    const raw = lead.rawData;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return null;
    }

    const snapshot = (raw as Record<string, unknown>).instagramQualification;
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return null;
    }

    const fetchedAt = (snapshot as { fetchedAt?: string }).fetchedAt;
    if (!fetchedAt || Date.parse(fetchedAt) < Date.now() - INSTAGRAM_CACHE_MS) {
      return null;
    }

    const data = snapshot as InstagramProfileQualificationData;
    if (!('biography' in data) || !('followersCount' in data)) {
      return null;
    }

    const posts = data.recentPosts;
    if (
      Array.isArray(posts) &&
      posts.some((post) => !post || !('views' in post))
    ) {
      return null;
    }

    return data;
  }
}

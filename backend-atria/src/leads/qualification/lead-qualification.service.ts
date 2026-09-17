import { Injectable } from '@nestjs/common';
import { Lead, Prisma } from '@prisma/client';
import {
  InstagramApifyEnricher,
  type InstagramProfileQualificationData,
} from './instagram-apify.enricher';

export interface LeadQualificationResult {
  score: number;
  qualified: boolean;
  notes: string;
  instagram?: InstagramProfileQualificationData | null;
  usedApify: boolean;
}

const QUALIFIED_THRESHOLD = 60;
const INSTAGRAM_CACHE_MS = 72 * 60 * 60 * 1000;

interface ScoreFactor {
  label: string;
  delta: number;
}

@Injectable()
export class LeadQualificationService {
  constructor(private readonly instagramEnricher: InstagramApifyEnricher) {}

  async qualifyLead(
    lead: Lead,
    apifyToken: string | null,
  ): Promise<LeadQualificationResult> {
    let instagramData: InstagramProfileQualificationData | null = null;
    let usedApify = false;

    const cached = this.readCachedInstagram(lead);
    if (cached) {
      instagramData = cached;
      usedApify = cached.provider === 'apify';
    } else if (apifyToken && lead.instagram?.trim()) {
      try {
        instagramData = await this.instagramEnricher.fetchProfileSignals(
          lead.instagram,
          apifyToken,
        );
        usedApify = Boolean(instagramData);
      } catch {
        instagramData = null;
        usedApify = false;
      }
    }

    const { score, factors } = this.computeScoreBreakdown(lead, instagramData);
    const qualified = score >= QUALIFIED_THRESHOLD;
    const notes = this.buildNotes(
      lead,
      instagramData,
      score,
      factors,
      usedApify,
    );

    return {
      score,
      qualified,
      notes,
      instagram: instagramData,
      usedApify,
    };
  }

  mergeInstagramIntoRawData(
    lead: Lead,
    instagram: InstagramProfileQualificationData | null,
  ): Prisma.InputJsonValue {
    const base =
      lead.rawData &&
      typeof lead.rawData === 'object' &&
      !Array.isArray(lead.rawData)
        ? { ...(lead.rawData as Record<string, unknown>) }
        : {};

    if (instagram) {
      base.instagramQualification = instagram;
    }

    return base as Prisma.InputJsonValue;
  }

  private computeScoreBreakdown(
    lead: Lead,
    instagram: InstagramProfileQualificationData | null,
  ): { score: number; factors: ScoreFactor[] } {
    const factors: ScoreFactor[] = [{ label: 'Base de prospecção', delta: 35 }];
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
            label: `Instagram ativo — último post há ${days} dia(s) (≤ 14)`,
            delta: 12,
          });
        } else if (days <= 45) {
          score += 4;
          factors.push({
            label: `Instagram moderado — último post há ${days} dia(s) (15–45)`,
            delta: 4,
          });
        } else {
          score -= 12;
          factors.push({
            label: `Instagram inativo — último post há ${days} dia(s) (> 45)`,
            delta: -12,
          });
        }
      }

      const avgLikes = instagram.averageLikesRecent;
      if (avgLikes != null) {
        if (avgLikes >= 80) {
          score += 10;
          factors.push({
            label: `Engajamento alto — média ${avgLikes} curtidas (≥ 80)`,
            delta: 10,
          });
        } else if (avgLikes >= 25) {
          score += 5;
          factors.push({
            label: `Engajamento médio — média ${avgLikes} curtidas (25–79)`,
            delta: 5,
          });
        } else if (avgLikes < 10) {
          score -= 5;
          factors.push({
            label: `Engajamento baixo — média ${avgLikes} curtidas (< 10)`,
            delta: -5,
          });
        } else {
          factors.push({
            label: `Engajamento neutro — média ${avgLikes} curtidas (10–24)`,
            delta: 0,
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
    factors: ScoreFactor[],
    usedApify: boolean,
  ): string {
    const lines: string[] = [];

    lines.push(
      `Score ${score}/100 para ${lead.name} (${lead.category ?? 'sem categoria'}). Limite sugerido para priorizar: ≥ ${QUALIFIED_THRESHOLD}.`,
    );
    lines.push('');

    if (instagram) {
      lines.push(
        `Instagram @${instagram.username} — analisamos os 2 posts mais recentes (fixados ignorados):`,
      );
      const posts = instagram.recentPosts.slice(0, 2);
      if (posts.length === 0) {
        lines.push('• Nenhum post recente encontrado após filtrar fixados.');
      } else {
        posts.forEach((post, index) => {
          const likes =
            post.likes != null ? `${post.likes} curtidas` : 'curtidas não disponíveis';
          const views =
            post.views != null ? `${post.views} views` : 'views não disponíveis';
          const when = post.timestamp
            ? this.formatPostDate(post.timestamp)
            : 'data desconhecida';
          lines.push(
            `• Post ${index + 1}: ${likes}, ${views}, publicado em ${when}.`,
          );
        });
      }

      if (instagram.averageLikesRecent != null) {
        lines.push(
          `• Média de curtidas nesses posts: ${instagram.averageLikesRecent}.`,
        );
      }
      if (instagram.averageViewsRecent != null) {
        lines.push(
          `• Média de views nesses posts: ${instagram.averageViewsRecent}.`,
        );
      }
      if (instagram.daysSinceLastPost != null) {
        lines.push(
          `• Tempo desde o post mais recente: ${instagram.daysSinceLastPost} dia(s).`,
        );
      }
      if (usedApify) {
        lines.push('• Fonte: Apify (instagram-scraper).');
      }
    } else if (lead.instagram?.trim()) {
      lines.push(
        'Instagram informado, mas sem métricas (Apify indisponível, perfil privado ou sem posts).',
      );
    } else {
      lines.push('Sem Instagram no cadastro — critérios de engajamento não aplicados.');
    }

    lines.push('');
    lines.push('Composição do score:');
    for (const factor of factors) {
      const delta =
        factor.delta === 0
          ? ''
          : ` (${factor.delta > 0 ? '+' : ''}${factor.delta})`;
      lines.push(`• ${factor.label}${delta}`);
    }

    return lines.join('\n');
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

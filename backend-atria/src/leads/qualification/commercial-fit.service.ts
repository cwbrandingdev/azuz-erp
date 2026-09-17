import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Lead } from '@prisma/client';
import { AiService } from '../../ai/ai.service';
import type { InstagramProfileQualificationData } from './instagram-apify.enricher';
import { readShareCapitalFromLead } from './registry-signals.util';

export const CW_MIN_PACKAGE_MONTHLY = 5699;

export type CommercialFitVerdict =
  | 'high'
  | 'medium'
  | 'low'
  | 'do_not_prioritize';

export type CommercialFitAffordability = 'high' | 'medium' | 'low';

export interface CommercialFitResult {
  segmentLabel: string;
  estimatedMonthlyRevenueMax: number | null;
  estimatedRevenueBand: string;
  minPackageMonthly: number;
  packageSharePercent: number | null;
  affordability: CommercialFitAffordability;
  verdict: CommercialFitVerdict;
  recommendedAction: 'prioritize' | 'nurture' | 'do_not_prioritize';
  commercialScore: number;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  revenueJustification: string;
  shareCapital: number | null;
  usedAi: boolean;
  matchedRuleId?: string;
}

const RULE_REVENUE_BENCHMARK: Record<string, string> = {
  micro_beauty:
    'Profissionais autônomos de beleza (nails, lash, estética) costumam faturar na faixa de R$ 8 mil a R$ 15 mil/mês em operação solo ou micro — pouca equipe e ticket por atendimento.',
  micro_fitness:
    'Personal trainers e coaches individuais costumam ficar entre R$ 10 mil e R$ 18 mil/mês, dependendo de quantidade de alunos e planos.',
  smb_health:
    'Clínicas e consultórios com equipe e agenda cheia costumam ultrapassar R$ 50 mil/mês; usamos teto conservador para clínicas em crescimento.',
  smb_food:
    'Restaurantes e food service com salão e delivery variam muito; R$ 80 mil/mês é referência para operação estabelecida com movimento constante.',
  smb_retail:
    'Lojas físicas de varejo médio costumam operar entre R$ 40 mil e R$ 80 mil/mês conforme fluxo e mix de produtos.',
};

interface SegmentRule {
  id: string;
  label: string;
  patterns: RegExp[];
  estimatedMonthlyRevenueMax: number;
  defaultVerdict: CommercialFitVerdict;
}

const AFFORDABILITY_MAX_SHARE = 0.28;

const MICRO_SERVICE_RULES: SegmentRule[] = [
  {
    id: 'micro_beauty',
    label: 'Beleza / nails / estética (autônomo ou micro)',
    patterns: [
      /\bnail\b/i,
      /unha/i,
      /manicure/i,
      /pedicure/i,
      /lash/i,
      /cilio/i,
      /sobrancelh/i,
      /brow/i,
      /micropigment/i,
      /designer de sobrancelh/i,
      /cabeleireir/i,
      /hair stylist/i,
      /maquiador/i,
      /makeup/i,
      /esteticist/i,
      /depilac/i,
    ],
    estimatedMonthlyRevenueMax: 15000,
    defaultVerdict: 'do_not_prioritize',
  },
  {
    id: 'micro_fitness',
    label: 'Personal / fitness individual',
    patterns: [
      /personal trainer/i,
      /\bpersonal\b/i,
      /treinador/i,
      /crossfit coach/i,
    ],
    estimatedMonthlyRevenueMax: 18000,
    defaultVerdict: 'low',
  },
];

const SMB_RULES: SegmentRule[] = [
  {
    id: 'smb_health',
    label: 'Clínica / saúde / odontologia',
    patterns: [
      /clinica/i,
      /odontolog/i,
      /dentist/i,
      /medic/i,
      /veterin/i,
      /hospital/i,
    ],
    estimatedMonthlyRevenueMax: 120000,
    defaultVerdict: 'high',
  },
  {
    id: 'smb_food',
    label: 'Restaurante / food service',
    patterns: [
      /restaurante/i,
      /gastronom/i,
      /pizzaria/i,
      /hamburguer/i,
      /bar\b/i,
      /cafeteria/i,
      /padaria/i,
    ],
    estimatedMonthlyRevenueMax: 80000,
    defaultVerdict: 'medium',
  },
  {
    id: 'smb_retail',
    label: 'Varejo / loja física',
    patterns: [/loja/i, /varejo/i, /moda/i, /boutique/i, /comercio/i],
    estimatedMonthlyRevenueMax: 60000,
    defaultVerdict: 'medium',
  },
];

@Injectable()
export class CommercialFitService {
  constructor(
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) {}

  async assess(
    lead: Lead,
    instagram: InstagramProfileQualificationData | null,
  ): Promise<CommercialFitResult> {
    const corpus = this.buildCorpus(lead, instagram);
    const ruleMatch = this.matchRules(corpus);

    let result = ruleMatch
      ? this.fromRule(lead, ruleMatch, corpus, instagram)
      : this.fromHeuristics(lead, instagram, corpus);

    const useAi =
      this.configService.get<string>('LEAD_QUALIFICATION_USE_AI') === 'true' ||
      this.configService.get<string>('LEAD_QUALIFICATION_USE_AI') === '1';

    const shareCapital = readShareCapitalFromLead(lead);
    result = this.applyShareCapitalAdjustments(result, shareCapital);

    if (useAi && result.confidence === 'low') {
      const ai = await this.aiService.assessCommercialFit({
        name: lead.name,
        category: lead.category,
        biography: instagram?.biography,
        businessCategoryName: instagram?.businessCategoryName,
        followersCount: instagram?.followersCount,
        reviewsCount: lead.reviewsCount,
        shareCapital,
      });

      if (ai) {
        result = this.mergeAiResult(result, ai);
        result = this.applyShareCapitalAdjustments(result, shareCapital);
      }
    }

    result.commercialScore = this.verdictToScore(result);
    return result;
  }

  private buildCorpus(
    lead: Lead,
    instagram: InstagramProfileQualificationData | null,
  ): string {
    const parts = [
      lead.name,
      lead.category,
      instagram?.biography,
      instagram?.businessCategoryName,
    ].filter((part) => typeof part === 'string' && part.trim());

    const raw = lead.rawData;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const record = raw as Record<string, unknown>;
      const cnae =
        record.primaryCnaeDescription ??
        (record.registry &&
        typeof record.registry === 'object' &&
        !Array.isArray(record.registry)
          ? (record.registry as Record<string, unknown>).cnae_fiscal_descricao
          : undefined);
      if (typeof cnae === 'string' && cnae.trim()) {
        parts.push(cnae);
      }
    }

    return parts.join(' ').toLowerCase();
  }

  private matchRules(corpus: string): SegmentRule | null {
    for (const rule of [...MICRO_SERVICE_RULES, ...SMB_RULES]) {
      if (rule.patterns.some((pattern) => pattern.test(corpus))) {
        return rule;
      }
    }
    return null;
  }

  private fromRule(
    lead: Lead,
    rule: SegmentRule,
    corpus: string,
    instagram: InstagramProfileQualificationData | null,
  ): CommercialFitResult {
    const estimatedMax = rule.estimatedMonthlyRevenueMax;
    const share = estimatedMax
      ? CW_MIN_PACKAGE_MONTHLY / estimatedMax
      : null;
    const affordability = this.affordabilityFromShare(share);
    let verdict = rule.defaultVerdict;

    if (
      affordability === 'low' &&
      verdict !== 'do_not_prioritize'
    ) {
      verdict = 'low';
    }

    if (
      typeof lead.reviewsCount === 'number' &&
      lead.reviewsCount >= 80 &&
      rule.id.startsWith('smb_')
    ) {
      verdict = verdict === 'low' ? 'medium' : 'high';
    }

    const confidence = corpus.length > 40 ? 'high' : 'medium';
    const revenueJustification = this.buildRuleRevenueJustification(
      rule,
      lead,
      instagram,
      estimatedMax,
    );

    return {
      segmentLabel: rule.label,
      estimatedMonthlyRevenueMax: estimatedMax,
      estimatedRevenueBand: `até ~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês (estimativa)`,
      minPackageMonthly: CW_MIN_PACKAGE_MONTHLY,
      packageSharePercent:
        share != null ? Math.round(share * 100) : null,
      affordability,
      verdict,
      recommendedAction: this.verdictToAction(verdict),
      commercialScore: 0,
      confidence,
      summary: this.buildSummary(
        rule.label,
        estimatedMax,
        affordability,
        verdict,
      ),
      revenueJustification,
      shareCapital: null,
      usedAi: false,
      matchedRuleId: rule.id,
    };
  }

  private fromHeuristics(
    lead: Lead,
    instagram: InstagramProfileQualificationData | null,
    corpus: string,
  ): CommercialFitResult {
    let estimatedMax = 35000;
    let verdict: CommercialFitVerdict = 'medium';
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let revenueJustification =
      'Sem regra de segmento específica: usamos faixa padrão de negócio local (~R$ 35 mil/mês) com base em categoria cadastral e dados limitados.';

    const followers = instagram?.followersCount ?? 0;
    const reviews = lead.reviewsCount ?? 0;

    if (reviews >= 100 || followers >= 20000) {
      estimatedMax = 150000;
      verdict = 'high';
      confidence = 'medium';
      revenueJustification = `Escala maior: ${reviews > 0 ? `${reviews} avaliações no Google` : 'sem avaliações relevantes'}${followers > 0 ? ` e ${followers.toLocaleString('pt-BR')} seguidores no Instagram` : ''}. Operações com esse volume costumam faturar bem acima de R$ 100 mil/mês — usamos teto de R$ ${estimatedMax.toLocaleString('pt-BR')}.`;
    } else if (reviews >= 30 || followers >= 5000) {
      estimatedMax = 60000;
      verdict = 'medium';
      confidence = corpus.length > 20 ? 'medium' : 'low';
      revenueJustification = `Sinais moderados de escala (${reviews} avaliações Google${followers > 0 ? `, ${followers.toLocaleString('pt-BR')} seguidores` : ''}). Estimamos ~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês para negócio local em crescimento.`;
    } else if (followers > 0 && followers < 1500 && reviews < 15) {
      estimatedMax = 12000;
      verdict = 'do_not_prioritize';
      confidence = 'low';
      revenueJustification = `Perfil pequeno: poucos seguidores (${followers}) e poucas avaliações (${reviews}). Típico de autônomo/micro — estimamos até ~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês.`;
    } else if (lead.category?.trim()) {
      revenueJustification = `Categoria "${lead.category}" sem match de segmento CW; faixa ~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês como referência genérica de PME local.`;
    }

    const share = CW_MIN_PACKAGE_MONTHLY / estimatedMax;
    const affordability = this.affordabilityFromShare(share);

    if (affordability === 'low' && verdict === 'medium') {
      verdict = 'low';
    }

    return {
      segmentLabel: lead.category?.trim() || 'Segmento não identificado',
      estimatedMonthlyRevenueMax: estimatedMax,
      estimatedRevenueBand: `~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês (heurística)`,
      minPackageMonthly: CW_MIN_PACKAGE_MONTHLY,
      packageSharePercent: Math.round(share * 100),
      affordability,
      verdict,
      recommendedAction: this.verdictToAction(verdict),
      commercialScore: 0,
      confidence,
      summary: this.buildSummary(
        lead.category ?? 'Negócio local',
        estimatedMax,
        affordability,
        verdict,
      ),
      revenueJustification,
      shareCapital: null,
      usedAi: false,
    };
  }

  private applyShareCapitalAdjustments(
    result: CommercialFitResult,
    shareCapital: number | null,
  ): CommercialFitResult {
    if (shareCapital == null) {
      return { ...result, shareCapital: null };
    }

    let estimatedMax = result.estimatedMonthlyRevenueMax ?? 35_000;
    let verdict = result.verdict;
    let revenueJustification = result.revenueJustification;

    if (shareCapital >= 500_000) {
      const boosted = Math.round(estimatedMax * 1.18);
      revenueJustification += ` Capital social elevado (R$ ${this.formatMoney(shareCapital)}): ampliamos o teto estimado de R$ ${this.formatMoney(estimatedMax)} para R$ ${this.formatMoney(boosted)}/mês (+18%).`;
      estimatedMax = boosted;
    }

    const isMicroRule = result.matchedRuleId?.startsWith('micro_') ?? false;
    if (isMicroRule && shareCapital < 10_000) {
      if (verdict !== 'do_not_prioritize') {
        verdict = 'do_not_prioritize';
      }
      revenueJustification += ` Capital social baixo (R$ ${this.formatMoney(shareCapital)}) reforça perfil micro/autônomo.`;
    } else if (
      !isMicroRule &&
      shareCapital < 10_000 &&
      estimatedMax > 25_000
    ) {
      const capped = Math.min(estimatedMax, 25_000);
      if (capped < estimatedMax) {
        revenueJustification += ` Capital social muito baixo (R$ ${this.formatMoney(shareCapital)}) sugere operação menor — teto ajustado para R$ ${this.formatMoney(capped)}/mês.`;
        estimatedMax = capped;
      }
    }

    const capitalParagraph = this.buildShareCapitalJustification(shareCapital);
    if (!revenueJustification.includes('Capital social declarado')) {
      revenueJustification = `${revenueJustification} ${capitalParagraph}`;
    }

    const packageShare = CW_MIN_PACKAGE_MONTHLY / estimatedMax;
    const affordability = this.affordabilityFromShare(packageShare);
    const segment =
      result.segmentLabel.split(':')[0] ?? result.segmentLabel;

    return {
      ...result,
      shareCapital,
      estimatedMonthlyRevenueMax: estimatedMax,
      estimatedRevenueBand: `até ~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês (estimativa)`,
      packageSharePercent: Math.round(packageShare * 100),
      affordability,
      verdict,
      recommendedAction: this.verdictToAction(verdict),
      revenueJustification: revenueJustification.trim(),
      summary: this.buildSummary(segment, estimatedMax, affordability, verdict),
    };
  }

  private buildShareCapitalJustification(shareCapital: number): string {
    return `Capital social declarado na Receita Federal: R$ ${this.formatMoney(shareCapital)} — não é faturamento mensal, mas capital muito baixo costuma indicar operação enxuta/microempresa; capital alto pode indicar estrutura societária maior (sem garantir receita atual).`;
  }

  private formatMoney(value: number): string {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  private buildRuleRevenueJustification(
    rule: SegmentRule,
    lead: Lead,
    instagram: InstagramProfileQualificationData | null,
    estimatedMax: number,
  ): string {
    const signals = this.collectFitSignals(lead, instagram);
    const benchmark =
      RULE_REVENUE_BENCHMARK[rule.id] ??
      'Benchmark interno CW para este tipo de negócio.';
    const signalsText =
      signals.length > 0
        ? `Sinais usados: ${signals.join('; ')}. `
        : 'Poucos sinais textuais; regra aplicada pelo tipo de negócio inferido. ';

    return `${signalsText}${benchmark} Por isso adotamos teto estimado de R$ ${estimatedMax.toLocaleString('pt-BR')}/mês.`;
  }

  private collectFitSignals(
    lead: Lead,
    instagram: InstagramProfileQualificationData | null,
  ): string[] {
    const signals: string[] = [];
    if (lead.category?.trim()) {
      signals.push(`categoria Maps/cadastro (“${lead.category.trim()}”)`);
    }
    if (instagram?.businessCategoryName?.trim()) {
      signals.push(
        `categoria Instagram (“${instagram.businessCategoryName.trim()}”)`,
      );
    }
    if (instagram?.biography?.trim()) {
      signals.push('termos na bio do Instagram');
    }
    const raw = lead.rawData;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const record = raw as Record<string, unknown>;
      const cnae =
        record.primaryCnaeDescription ??
        (record.registry &&
        typeof record.registry === 'object' &&
        !Array.isArray(record.registry)
          ? (record.registry as Record<string, unknown>).cnae_fiscal_descricao
          : undefined);
      if (typeof cnae === 'string' && cnae.trim()) {
        signals.push(`CNAE (“${cnae.trim()}”)`);
      }
    }
    if (typeof lead.reviewsCount === 'number' && lead.reviewsCount > 0) {
      signals.push(`${lead.reviewsCount} avaliações no Google`);
    }
    if (
      typeof instagram?.followersCount === 'number' &&
      instagram.followersCount > 0
    ) {
      signals.push(
        `${instagram.followersCount.toLocaleString('pt-BR')} seguidores no Instagram`,
      );
    }
    const shareCapital = readShareCapitalFromLead(lead);
    if (shareCapital != null) {
      signals.push(
        `capital social R$ ${shareCapital.toLocaleString('pt-BR')} (Receita Federal)`,
      );
    }
    return signals;
  }

  private mergeAiResult(
    base: CommercialFitResult,
    ai: {
      segmentLabel: string;
      estimatedRevenueBand: string;
      recommendedAction: 'prioritize' | 'nurture' | 'do_not_prioritize';
      oneLineReason: string;
      revenueJustification?: string;
    },
  ): CommercialFitResult {
    const verdict = this.actionToVerdict(ai.recommendedAction);
    const affordability =
      ai.recommendedAction === 'do_not_prioritize'
        ? 'low'
        : ai.recommendedAction === 'prioritize'
          ? 'high'
          : 'medium';

    return {
      ...base,
      segmentLabel: ai.segmentLabel,
      estimatedRevenueBand: ai.estimatedRevenueBand,
      verdict,
      affordability,
      recommendedAction: ai.recommendedAction,
      confidence: 'medium',
      summary: ai.oneLineReason,
      revenueJustification:
        ai.revenueJustification?.trim() || base.revenueJustification,
      usedAi: true,
    };
  }

  private affordabilityFromShare(
    share: number | null,
  ): CommercialFitAffordability {
    if (share == null) return 'medium';
    if (share <= AFFORDABILITY_MAX_SHARE) return 'high';
    if (share <= 0.4) return 'medium';
    return 'low';
  }

  private verdictToAction(
    verdict: CommercialFitVerdict,
  ): 'prioritize' | 'nurture' | 'do_not_prioritize' {
    if (verdict === 'high') return 'prioritize';
    if (verdict === 'do_not_prioritize' || verdict === 'low') {
      return verdict === 'do_not_prioritize' ? 'do_not_prioritize' : 'nurture';
    }
    return 'nurture';
  }

  private actionToVerdict(
    action: 'prioritize' | 'nurture' | 'do_not_prioritize',
  ): CommercialFitVerdict {
    if (action === 'prioritize') return 'high';
    if (action === 'do_not_prioritize') return 'do_not_prioritize';
    return 'medium';
  }

  private verdictToScore(result: CommercialFitResult): number {
    switch (result.verdict) {
      case 'high':
        return 85;
      case 'medium':
        return 62;
      case 'low':
        return 38;
      case 'do_not_prioritize':
        return 18;
      default:
        return 50;
    }
  }

  private buildSummary(
    segment: string,
    estimatedMax: number,
    affordability: CommercialFitAffordability,
    verdict: CommercialFitVerdict,
  ): string {
    const share = Math.round((CW_MIN_PACKAGE_MONTHLY / estimatedMax) * 100);
    if (verdict === 'do_not_prioritize' || affordability === 'low') {
      return `${segment}: pacote mínimo (R$ ${CW_MIN_PACKAGE_MONTHLY.toLocaleString('pt-BR')}) representa ~${share}% de um faturamento estimado de até R$ ${estimatedMax.toLocaleString('pt-BR')}/mês — baixa probabilidade de fechamento.`;
    }
    if (verdict === 'high') {
      return `${segment}: faturamento estimado compatível com investimento em marketing CW (pacote desde R$ ${CW_MIN_PACKAGE_MONTHLY.toLocaleString('pt-BR')}/mês).`;
    }
    return `${segment}: fit comercial moderado; validar capacidade de investimento (~${share}% do faturamento estimado no pacote entrada).`;
  }
}

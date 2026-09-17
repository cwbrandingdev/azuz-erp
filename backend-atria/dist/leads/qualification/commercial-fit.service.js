"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommercialFitService = exports.CW_MIN_PACKAGE_MONTHLY = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ai_service_1 = require("../../ai/ai.service");
const registry_signals_util_1 = require("./registry-signals.util");
exports.CW_MIN_PACKAGE_MONTHLY = 5699;
const RULE_REVENUE_BENCHMARK = {
    micro_beauty: 'Profissionais autônomos de beleza (nails, lash, estética) costumam faturar na faixa de R$ 8 mil a R$ 15 mil/mês em operação solo ou micro — pouca equipe e ticket por atendimento.',
    micro_fitness: 'Personal trainers e coaches individuais costumam ficar entre R$ 10 mil e R$ 18 mil/mês, dependendo de quantidade de alunos e planos.',
    smb_health: 'Clínicas e consultórios com equipe e agenda cheia costumam ultrapassar R$ 50 mil/mês; usamos teto conservador para clínicas em crescimento.',
    smb_food: 'Restaurantes e food service com salão e delivery variam muito; R$ 80 mil/mês é referência para operação estabelecida com movimento constante.',
    smb_retail: 'Lojas físicas de varejo médio costumam operar entre R$ 40 mil e R$ 80 mil/mês conforme fluxo e mix de produtos.',
};
const AFFORDABILITY_MAX_SHARE = 0.28;
const MICRO_SERVICE_RULES = [
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
const SMB_RULES = [
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
let CommercialFitService = class CommercialFitService {
    aiService;
    configService;
    constructor(aiService, configService) {
        this.aiService = aiService;
        this.configService = configService;
    }
    async assess(lead, instagram) {
        const corpus = this.buildCorpus(lead, instagram);
        const ruleMatch = this.matchRules(corpus);
        let result = ruleMatch
            ? this.fromRule(lead, ruleMatch, corpus, instagram)
            : this.fromHeuristics(lead, instagram, corpus);
        const useAi = this.configService.get('LEAD_QUALIFICATION_USE_AI') === 'true' ||
            this.configService.get('LEAD_QUALIFICATION_USE_AI') === '1';
        const shareCapital = (0, registry_signals_util_1.readShareCapitalFromLead)(lead);
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
    buildCorpus(lead, instagram) {
        const parts = [
            lead.name,
            lead.category,
            instagram?.biography,
            instagram?.businessCategoryName,
        ].filter((part) => typeof part === 'string' && part.trim());
        const raw = lead.rawData;
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
            const record = raw;
            const cnae = record.primaryCnaeDescription ??
                (record.registry &&
                    typeof record.registry === 'object' &&
                    !Array.isArray(record.registry)
                    ? record.registry.cnae_fiscal_descricao
                    : undefined);
            if (typeof cnae === 'string' && cnae.trim()) {
                parts.push(cnae);
            }
        }
        return parts.join(' ').toLowerCase();
    }
    matchRules(corpus) {
        for (const rule of [...MICRO_SERVICE_RULES, ...SMB_RULES]) {
            if (rule.patterns.some((pattern) => pattern.test(corpus))) {
                return rule;
            }
        }
        return null;
    }
    fromRule(lead, rule, corpus, instagram) {
        const estimatedMax = rule.estimatedMonthlyRevenueMax;
        const share = estimatedMax
            ? exports.CW_MIN_PACKAGE_MONTHLY / estimatedMax
            : null;
        const affordability = this.affordabilityFromShare(share);
        let verdict = rule.defaultVerdict;
        if (affordability === 'low' &&
            verdict !== 'do_not_prioritize') {
            verdict = 'low';
        }
        if (typeof lead.reviewsCount === 'number' &&
            lead.reviewsCount >= 80 &&
            rule.id.startsWith('smb_')) {
            verdict = verdict === 'low' ? 'medium' : 'high';
        }
        const confidence = corpus.length > 40 ? 'high' : 'medium';
        const revenueJustification = this.buildRuleRevenueJustification(rule, lead, instagram, estimatedMax);
        return {
            segmentLabel: rule.label,
            estimatedMonthlyRevenueMax: estimatedMax,
            estimatedRevenueBand: `até ~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês (estimativa)`,
            minPackageMonthly: exports.CW_MIN_PACKAGE_MONTHLY,
            packageSharePercent: share != null ? Math.round(share * 100) : null,
            affordability,
            verdict,
            recommendedAction: this.verdictToAction(verdict),
            commercialScore: 0,
            confidence,
            summary: this.buildSummary(rule.label, estimatedMax, affordability, verdict),
            revenueJustification,
            shareCapital: null,
            usedAi: false,
            matchedRuleId: rule.id,
        };
    }
    fromHeuristics(lead, instagram, corpus) {
        let estimatedMax = 35000;
        let verdict = 'medium';
        let confidence = 'low';
        let revenueJustification = 'Sem regra de segmento específica: usamos faixa padrão de negócio local (~R$ 35 mil/mês) com base em categoria cadastral e dados limitados.';
        const followers = instagram?.followersCount ?? 0;
        const reviews = lead.reviewsCount ?? 0;
        if (reviews >= 100 || followers >= 20000) {
            estimatedMax = 150000;
            verdict = 'high';
            confidence = 'medium';
            revenueJustification = `Escala maior: ${reviews > 0 ? `${reviews} avaliações no Google` : 'sem avaliações relevantes'}${followers > 0 ? ` e ${followers.toLocaleString('pt-BR')} seguidores no Instagram` : ''}. Operações com esse volume costumam faturar bem acima de R$ 100 mil/mês — usamos teto de R$ ${estimatedMax.toLocaleString('pt-BR')}.`;
        }
        else if (reviews >= 30 || followers >= 5000) {
            estimatedMax = 60000;
            verdict = 'medium';
            confidence = corpus.length > 20 ? 'medium' : 'low';
            revenueJustification = `Sinais moderados de escala (${reviews} avaliações Google${followers > 0 ? `, ${followers.toLocaleString('pt-BR')} seguidores` : ''}). Estimamos ~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês para negócio local em crescimento.`;
        }
        else if (followers > 0 && followers < 1500 && reviews < 15) {
            estimatedMax = 12000;
            verdict = 'do_not_prioritize';
            confidence = 'low';
            revenueJustification = `Perfil pequeno: poucos seguidores (${followers}) e poucas avaliações (${reviews}). Típico de autônomo/micro — estimamos até ~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês.`;
        }
        else if (lead.category?.trim()) {
            revenueJustification = `Categoria "${lead.category}" sem match de segmento CW; faixa ~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês como referência genérica de PME local.`;
        }
        const share = exports.CW_MIN_PACKAGE_MONTHLY / estimatedMax;
        const affordability = this.affordabilityFromShare(share);
        if (affordability === 'low' && verdict === 'medium') {
            verdict = 'low';
        }
        return {
            segmentLabel: lead.category?.trim() || 'Segmento não identificado',
            estimatedMonthlyRevenueMax: estimatedMax,
            estimatedRevenueBand: `~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês (heurística)`,
            minPackageMonthly: exports.CW_MIN_PACKAGE_MONTHLY,
            packageSharePercent: Math.round(share * 100),
            affordability,
            verdict,
            recommendedAction: this.verdictToAction(verdict),
            commercialScore: 0,
            confidence,
            summary: this.buildSummary(lead.category ?? 'Negócio local', estimatedMax, affordability, verdict),
            revenueJustification,
            shareCapital: null,
            usedAi: false,
        };
    }
    applyShareCapitalAdjustments(result, shareCapital) {
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
        }
        else if (!isMicroRule &&
            shareCapital < 10_000 &&
            estimatedMax > 25_000) {
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
        const packageShare = exports.CW_MIN_PACKAGE_MONTHLY / estimatedMax;
        const affordability = this.affordabilityFromShare(packageShare);
        const segment = result.segmentLabel.split(':')[0] ?? result.segmentLabel;
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
    buildShareCapitalJustification(shareCapital) {
        return `Capital social declarado na Receita Federal: R$ ${this.formatMoney(shareCapital)} — não é faturamento mensal, mas capital muito baixo costuma indicar operação enxuta/microempresa; capital alto pode indicar estrutura societária maior (sem garantir receita atual).`;
    }
    formatMoney(value) {
        return value.toLocaleString('pt-BR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    }
    buildRuleRevenueJustification(rule, lead, instagram, estimatedMax) {
        const signals = this.collectFitSignals(lead, instagram);
        const benchmark = RULE_REVENUE_BENCHMARK[rule.id] ??
            'Benchmark interno CW para este tipo de negócio.';
        const signalsText = signals.length > 0
            ? `Sinais usados: ${signals.join('; ')}. `
            : 'Poucos sinais textuais; regra aplicada pelo tipo de negócio inferido. ';
        return `${signalsText}${benchmark} Por isso adotamos teto estimado de R$ ${estimatedMax.toLocaleString('pt-BR')}/mês.`;
    }
    collectFitSignals(lead, instagram) {
        const signals = [];
        if (lead.category?.trim()) {
            signals.push(`categoria Maps/cadastro (“${lead.category.trim()}”)`);
        }
        if (instagram?.businessCategoryName?.trim()) {
            signals.push(`categoria Instagram (“${instagram.businessCategoryName.trim()}”)`);
        }
        if (instagram?.biography?.trim()) {
            signals.push('termos na bio do Instagram');
        }
        const raw = lead.rawData;
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
            const record = raw;
            const cnae = record.primaryCnaeDescription ??
                (record.registry &&
                    typeof record.registry === 'object' &&
                    !Array.isArray(record.registry)
                    ? record.registry.cnae_fiscal_descricao
                    : undefined);
            if (typeof cnae === 'string' && cnae.trim()) {
                signals.push(`CNAE (“${cnae.trim()}”)`);
            }
        }
        if (typeof lead.reviewsCount === 'number' && lead.reviewsCount > 0) {
            signals.push(`${lead.reviewsCount} avaliações no Google`);
        }
        if (typeof instagram?.followersCount === 'number' &&
            instagram.followersCount > 0) {
            signals.push(`${instagram.followersCount.toLocaleString('pt-BR')} seguidores no Instagram`);
        }
        const shareCapital = (0, registry_signals_util_1.readShareCapitalFromLead)(lead);
        if (shareCapital != null) {
            signals.push(`capital social R$ ${shareCapital.toLocaleString('pt-BR')} (Receita Federal)`);
        }
        return signals;
    }
    mergeAiResult(base, ai) {
        const verdict = this.actionToVerdict(ai.recommendedAction);
        const affordability = ai.recommendedAction === 'do_not_prioritize'
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
            revenueJustification: ai.revenueJustification?.trim() || base.revenueJustification,
            usedAi: true,
        };
    }
    affordabilityFromShare(share) {
        if (share == null)
            return 'medium';
        if (share <= AFFORDABILITY_MAX_SHARE)
            return 'high';
        if (share <= 0.4)
            return 'medium';
        return 'low';
    }
    verdictToAction(verdict) {
        if (verdict === 'high')
            return 'prioritize';
        if (verdict === 'do_not_prioritize' || verdict === 'low') {
            return verdict === 'do_not_prioritize' ? 'do_not_prioritize' : 'nurture';
        }
        return 'nurture';
    }
    actionToVerdict(action) {
        if (action === 'prioritize')
            return 'high';
        if (action === 'do_not_prioritize')
            return 'do_not_prioritize';
        return 'medium';
    }
    verdictToScore(result) {
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
    buildSummary(segment, estimatedMax, affordability, verdict) {
        const share = Math.round((exports.CW_MIN_PACKAGE_MONTHLY / estimatedMax) * 100);
        if (verdict === 'do_not_prioritize' || affordability === 'low') {
            return `${segment}: pacote mínimo (R$ ${exports.CW_MIN_PACKAGE_MONTHLY.toLocaleString('pt-BR')}) representa ~${share}% de um faturamento estimado de até R$ ${estimatedMax.toLocaleString('pt-BR')}/mês — baixa probabilidade de fechamento.`;
        }
        if (verdict === 'high') {
            return `${segment}: faturamento estimado compatível com investimento em marketing CW (pacote desde R$ ${exports.CW_MIN_PACKAGE_MONTHLY.toLocaleString('pt-BR')}/mês).`;
        }
        return `${segment}: fit comercial moderado; validar capacidade de investimento (~${share}% do faturamento estimado no pacote entrada).`;
    }
};
exports.CommercialFitService = CommercialFitService;
exports.CommercialFitService = CommercialFitService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ai_service_1.AiService,
        config_1.ConfigService])
], CommercialFitService);
//# sourceMappingURL=commercial-fit.service.js.map
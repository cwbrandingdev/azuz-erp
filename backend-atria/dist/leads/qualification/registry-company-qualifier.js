"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGISTRY_COMMERCIAL_WEIGHT = exports.REGISTRY_OPERATIONAL_WEIGHT = exports.REGISTRY_QUALIFIED_THRESHOLD = exports.CW_MIN_PACKAGE_MONTHLY = void 0;
exports.qualifyRegistryCompany = qualifyRegistryCompany;
exports.CW_MIN_PACKAGE_MONTHLY = 5699;
exports.REGISTRY_QUALIFIED_THRESHOLD = 60;
exports.REGISTRY_OPERATIONAL_WEIGHT = 0.4;
exports.REGISTRY_COMMERCIAL_WEIGHT = 0.6;
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
const RULE_REVENUE_BENCHMARK = {
    micro_beauty: 'Profissionais autônomos de beleza (nails, lash, estética) costumam faturar na faixa de R$ 8 mil a R$ 15 mil/mês em operação solo ou micro — pouca equipe e ticket por atendimento.',
    micro_fitness: 'Personal trainers e coaches individuais costumam ficar entre R$ 10 mil e R$ 18 mil/mês, dependendo de quantidade de alunos e planos.',
    smb_health: 'Clínicas e consultórios com equipe e agenda cheia costumam ultrapassar R$ 50 mil/mês; usamos teto conservador para clínicas em crescimento.',
    smb_food: 'Restaurantes e food service com salão e delivery variam muito; R$ 80 mil/mês é referência para operação estabelecida com movimento constante.',
    smb_retail: 'Lojas físicas de varejo médio costumam operar entre R$ 40 mil e R$ 80 mil/mês conforme fluxo e mix de produtos.',
};
function qualifyRegistryCompany(input) {
    const corpus = [input.name, input.category]
        .filter((part) => typeof part === 'string' && part.trim())
        .join(' ')
        .toLowerCase();
    const rule = matchRules(corpus);
    let commercial = rule
        ? fromRule(rule, corpus, input)
        : fromHeuristics(input, corpus);
    commercial = applyShareCapitalAndSize(commercial, input);
    const { score: registryScore, notes: operationalNotes } = computeOperationalScore(input);
    let commercialScore = verdictToScore(commercial.verdict);
    if (commercial.verdict === 'do_not_prioritize') {
        commercialScore = Math.min(commercialScore, 25);
    }
    const blended = Math.round(registryScore * exports.REGISTRY_OPERATIONAL_WEIGHT +
        commercialScore * exports.REGISTRY_COMMERCIAL_WEIGHT);
    let blendedScore = Math.max(0, Math.min(100, blended));
    if (commercial.verdict === 'do_not_prioritize') {
        blendedScore = Math.min(blendedScore, 35);
    }
    const qualified = blendedScore >= exports.REGISTRY_QUALIFIED_THRESHOLD &&
        commercial.verdict !== 'do_not_prioritize';
    const notes = [
        `Score final ${blendedScore}/100 (operacional ${registryScore}, comercial ${commercialScore}).`,
        `Fit comercial: ${commercial.segmentLabel} (${commercial.verdict}).`,
        commercial.summary,
        operationalNotes,
    ]
        .filter(Boolean)
        .join(' ');
    return {
        registryScore,
        commercialScore,
        blendedScore,
        verdict: commercial.verdict,
        qualified,
        segmentLabel: commercial.segmentLabel,
        notes,
        commercialFit: {
            ...commercial,
            commercialScore,
            assessedAt: new Date().toISOString(),
        },
    };
}
function matchRules(corpus) {
    for (const rule of [...MICRO_SERVICE_RULES, ...SMB_RULES]) {
        if (rule.patterns.some((pattern) => pattern.test(corpus))) {
            return rule;
        }
    }
    return null;
}
function fromRule(rule, corpus, input) {
    const estimatedMax = rule.estimatedMonthlyRevenueMax;
    const share = exports.CW_MIN_PACKAGE_MONTHLY / estimatedMax;
    const affordability = affordabilityFromShare(share);
    let verdict = rule.defaultVerdict;
    if (affordability === 'low' && verdict !== 'do_not_prioritize') {
        verdict = 'low';
    }
    const benchmark = RULE_REVENUE_BENCHMARK[rule.id] ??
        'Benchmark interno CW para este tipo de negócio.';
    return {
        segmentLabel: rule.label,
        estimatedMonthlyRevenueMax: estimatedMax,
        estimatedRevenueBand: `até ~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês (estimativa)`,
        minPackageMonthly: exports.CW_MIN_PACKAGE_MONTHLY,
        packageSharePercent: Math.round(share * 100),
        affordability,
        verdict,
        recommendedAction: verdictToAction(verdict),
        commercialScore: 0,
        confidence: corpus.length > 40 ? 'high' : 'medium',
        summary: buildSummary(rule.label, estimatedMax, affordability, verdict),
        revenueJustification: `${benchmark} Por isso adotamos teto estimado de R$ ${estimatedMax.toLocaleString('pt-BR')}/mês.`,
        shareCapital: input.shareCapital ?? null,
        usedAi: false,
        matchedRuleId: rule.id,
        assessedAt: '',
    };
}
function fromHeuristics(input, corpus) {
    let estimatedMax = 35000;
    let verdict = 'medium';
    const category = input.category?.trim() || 'Segmento não identificado';
    let revenueJustification = `Categoria "${category}" sem match de segmento CW; faixa ~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês como referência genérica de PME local.`;
    if (input.isMei) {
        estimatedMax = 12000;
        verdict = 'do_not_prioritize';
        revenueJustification =
            'MEI na Receita: operação típica de micro/autônomo — estimamos até ~R$ 12 mil/mês.';
    }
    const share = exports.CW_MIN_PACKAGE_MONTHLY / estimatedMax;
    const affordability = affordabilityFromShare(share);
    if (affordability === 'low' && verdict === 'medium') {
        verdict = 'low';
    }
    return {
        segmentLabel: category,
        estimatedMonthlyRevenueMax: estimatedMax,
        estimatedRevenueBand: `~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês (heurística)`,
        minPackageMonthly: exports.CW_MIN_PACKAGE_MONTHLY,
        packageSharePercent: Math.round(share * 100),
        affordability,
        verdict,
        recommendedAction: verdictToAction(verdict),
        commercialScore: 0,
        confidence: corpus.length > 20 ? 'medium' : 'low',
        summary: buildSummary(category, estimatedMax, affordability, verdict),
        revenueJustification,
        shareCapital: input.shareCapital ?? null,
        usedAi: false,
        assessedAt: '',
    };
}
function applyShareCapitalAndSize(result, input) {
    const shareCapital = input.shareCapital ?? null;
    let estimatedMax = result.estimatedMonthlyRevenueMax ?? 35_000;
    let verdict = result.verdict;
    let revenueJustification = result.revenueJustification;
    if (input.isMei && verdict !== 'do_not_prioritize') {
        estimatedMax = Math.min(estimatedMax, 15_000);
        revenueJustification += ' Optante MEI: teto de faturamento limitado.';
    }
    if (input.companySize === '01' && estimatedMax > 40_000) {
        estimatedMax = Math.min(estimatedMax, 40_000);
        revenueJustification += ' Porte ME na Receita: teto ajustado para PME.';
    }
    if (shareCapital != null) {
        if (shareCapital >= 500_000) {
            const boosted = Math.round(estimatedMax * 1.18);
            revenueJustification += ` Capital social elevado (R$ ${formatMoney(shareCapital)}): teto de R$ ${formatMoney(estimatedMax)} para R$ ${formatMoney(boosted)}/mês.`;
            estimatedMax = boosted;
        }
        const isMicroRule = result.matchedRuleId?.startsWith('micro_') ?? false;
        if (isMicroRule && shareCapital < 10_000) {
            verdict = 'do_not_prioritize';
            revenueJustification += ` Capital social baixo (R$ ${formatMoney(shareCapital)}) reforça perfil micro/autônomo.`;
        }
        else if (!isMicroRule && shareCapital < 10_000 && estimatedMax > 25_000) {
            estimatedMax = Math.min(estimatedMax, 25_000);
            revenueJustification += ` Capital social muito baixo (R$ ${formatMoney(shareCapital)}) — teto ajustado para R$ ${formatMoney(estimatedMax)}/mês.`;
        }
        revenueJustification += ` Capital social declarado na Receita: R$ ${formatMoney(shareCapital)}.`;
    }
    const packageShare = exports.CW_MIN_PACKAGE_MONTHLY / estimatedMax;
    const affordability = affordabilityFromShare(packageShare);
    if (affordability === 'low' && verdict === 'medium') {
        verdict = 'low';
    }
    return {
        ...result,
        shareCapital,
        estimatedMonthlyRevenueMax: estimatedMax,
        estimatedRevenueBand: `até ~R$ ${estimatedMax.toLocaleString('pt-BR')}/mês (estimativa)`,
        packageSharePercent: Math.round(packageShare * 100),
        affordability,
        verdict,
        recommendedAction: verdictToAction(verdict),
        revenueJustification: revenueJustification.trim(),
        summary: buildSummary(result.segmentLabel, estimatedMax, affordability, verdict),
    };
}
function computeOperationalScore(input) {
    let score = 35;
    const bits = ['base 35'];
    if (input.phone?.trim()) {
        score += 15;
        bits.push('telefone +15');
    }
    if (input.email?.trim()) {
        score += 5;
        bits.push('e-mail +5');
    }
    return {
        score: Math.max(0, Math.min(100, score)),
        notes: `Operacional: ${bits.join(', ')}.`,
    };
}
function affordabilityFromShare(share) {
    if (share == null)
        return 'medium';
    if (share <= AFFORDABILITY_MAX_SHARE)
        return 'high';
    if (share <= 0.4)
        return 'medium';
    return 'low';
}
function verdictToAction(verdict) {
    if (verdict === 'high')
        return 'prioritize';
    if (verdict === 'do_not_prioritize')
        return 'do_not_prioritize';
    if (verdict === 'low')
        return 'nurture';
    return 'nurture';
}
function verdictToScore(verdict) {
    switch (verdict) {
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
function buildSummary(segment, estimatedMax, affordability, verdict) {
    const share = Math.round((exports.CW_MIN_PACKAGE_MONTHLY / estimatedMax) * 100);
    if (verdict === 'do_not_prioritize' || affordability === 'low') {
        return `${segment}: pacote mínimo (R$ ${exports.CW_MIN_PACKAGE_MONTHLY.toLocaleString('pt-BR')}) representa ~${share}% de um faturamento estimado de até R$ ${estimatedMax.toLocaleString('pt-BR')}/mês — baixa probabilidade de fechamento.`;
    }
    if (verdict === 'high') {
        return `${segment}: faturamento estimado compatível com investimento em marketing CW (pacote desde R$ ${exports.CW_MIN_PACKAGE_MONTHLY.toLocaleString('pt-BR')}/mês).`;
    }
    return `${segment}: fit comercial moderado; validar capacidade de investimento (~${share}% do faturamento estimado no pacote entrada).`;
}
function formatMoney(value) {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}
//# sourceMappingURL=registry-company-qualifier.js.map
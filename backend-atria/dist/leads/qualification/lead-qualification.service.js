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
exports.LeadQualificationService = void 0;
const common_1 = require("@nestjs/common");
const commercial_fit_service_1 = require("./commercial-fit.service");
const company_lookup_service_1 = require("../company-lookup/application/company-lookup.service");
const instagram_apify_enricher_1 = require("./instagram-apify.enricher");
const registry_signals_util_1 = require("./registry-signals.util");
const QUALIFIED_THRESHOLD = 60;
const INSTAGRAM_CACHE_MS = 72 * 60 * 60 * 1000;
const OPERATIONAL_WEIGHT = 0.4;
const COMMERCIAL_WEIGHT = 0.6;
let LeadQualificationService = class LeadQualificationService {
    instagramEnricher;
    commercialFit;
    companyLookup;
    constructor(instagramEnricher, commercialFit, companyLookup) {
        this.instagramEnricher = instagramEnricher;
        this.commercialFit = commercialFit;
        this.companyLookup = companyLookup;
    }
    async qualifyLead(lead, apifyToken) {
        const [instagramOutcome, enrichedLead] = await Promise.all([
            this.resolveInstagramData(lead, apifyToken),
            this.enrichLeadRegistry(lead),
        ]);
        const instagramData = instagramOutcome.data;
        const usedApify = instagramOutcome.usedApify;
        const commercialFit = await this.commercialFit.assess(enrichedLead, instagramData);
        const { score: operationalScore, factors: operationalFactors } = this.computeOperationalScoreBreakdown(enrichedLead, instagramData);
        let commercialScore = commercialFit.commercialScore;
        const commercialFactors = [
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
        const blended = Math.round(operationalScore * OPERATIONAL_WEIGHT + commercialScore * COMMERCIAL_WEIGHT);
        let score = Math.max(0, Math.min(100, blended));
        if (commercialFit.verdict === 'do_not_prioritize') {
            score = Math.min(score, 35);
        }
        const qualified = score >= QUALIFIED_THRESHOLD;
        const mergedRawData = this.mergeQualificationRawData(enrichedLead, {
            instagram: instagramData,
            commercialFit,
        });
        const notes = this.buildNotes(enrichedLead, instagramData, score, operationalScore, commercialScore, commercialFit, operationalFactors, commercialFactors, usedApify);
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
    async resolveInstagramData(lead, apifyToken) {
        const cached = this.readCachedInstagram(lead);
        if (cached) {
            return { data: cached, usedApify: cached.provider === 'apify' };
        }
        if (!apifyToken || !lead.instagram?.trim()) {
            return { data: null, usedApify: false };
        }
        try {
            const data = await this.instagramEnricher.fetchProfileSignals(lead.instagram, apifyToken);
            return { data, usedApify: Boolean(data) };
        }
        catch {
            return { data: null, usedApify: false };
        }
    }
    async enrichLeadRegistry(lead) {
        if ((0, registry_signals_util_1.readCachedRegistrySnapshot)(lead.rawData)) {
            return lead;
        }
        const cnpj = (0, registry_signals_util_1.extractCnpjFromLead)(lead);
        if (!cnpj) {
            return lead;
        }
        const capitalFromRaw = (0, registry_signals_util_1.readShareCapitalFromRawData)(lead.rawData);
        if (capitalFromRaw != null) {
            const snapshot = {
                cnpj,
                capitalSocial: capitalFromRaw,
                legalName: (0, registry_signals_util_1.readLegalNameFromRawData)(lead.rawData),
                fetchedAt: new Date().toISOString(),
            };
            return {
                ...lead,
                rawData: (0, registry_signals_util_1.mergeRegistrySnapshotIntoRawData)(lead.rawData, snapshot),
            };
        }
        try {
            const record = await this.companyLookup.lookup(cnpj);
            if (!record) {
                return lead;
            }
            const snapshot = {
                cnpj: record.cnpj,
                capitalSocial: record.shareCapital ??
                    (0, registry_signals_util_1.parseShareCapital)(record.rawData.capital_social) ??
                    null,
                legalName: record.legalName,
                fetchedAt: new Date().toISOString(),
            };
            return {
                ...lead,
                rawData: (0, registry_signals_util_1.mergeRegistrySnapshotIntoRawData)(lead.rawData, snapshot),
            };
        }
        catch {
            return lead;
        }
    }
    mergeQualificationRawData(lead, input) {
        const base = lead.rawData &&
            typeof lead.rawData === 'object' &&
            !Array.isArray(lead.rawData)
            ? { ...lead.rawData }
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
        return base;
    }
    mergeInstagramIntoRawData(lead, instagram) {
        return this.mergeQualificationRawData(lead, {
            instagram,
            commercialFit: null,
        });
    }
    computeOperationalScoreBreakdown(lead, instagram) {
        const factors = [{ label: 'Base operacional', delta: 35 }];
        let score = 35;
        if (lead.phone?.trim()) {
            score += 15;
            factors.push({ label: 'Telefone informado', delta: 15 });
        }
        else {
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
                }
                else if (days <= 45) {
                    score += 4;
                    factors.push({
                        label: `Instagram moderado — último post há ${days} dia(s)`,
                        delta: 4,
                    });
                }
                else {
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
                }
                else if (avgLikes >= 25) {
                    score += 5;
                    factors.push({
                        label: `Engajamento médio — média ${avgLikes} curtidas`,
                        delta: 5,
                    });
                }
                else if (avgLikes < 10) {
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
    buildNotes(lead, instagram, score, operationalScore, commercialScore, commercialFit, operationalFactors, commercialFactors, usedApify) {
        const lines = [];
        lines.push(`Score final ${score}/100 (operacional ${operationalScore}, comercial ${commercialScore}). Limite sugerido: ≥ ${QUALIFIED_THRESHOLD}.`);
        lines.push('');
        lines.push('Fit comercial CW:');
        lines.push(`• Segmento: ${commercialFit.segmentLabel}.`);
        lines.push(`• ${commercialFit.estimatedRevenueBand}.`);
        if (commercialFit.shareCapital != null) {
            lines.push(`• Capital social (Receita): R$ ${commercialFit.shareCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
        }
        if (commercialFit.revenueJustification?.trim()) {
            lines.push(`• Por que esse faturamento: ${commercialFit.revenueJustification}`);
        }
        lines.push(`• Pacote entrada Posicionamento: R$ ${commercial_fit_service_1.CW_MIN_PACKAGE_MONTHLY.toLocaleString('pt-BR')}/mês` +
            (commercialFit.packageSharePercent != null
                ? ` (~${commercialFit.packageSharePercent}% do faturamento estimado).`
                : '.'));
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
                lines.push(`• Seguidores: ${instagram.followersCount.toLocaleString('pt-BR')}` +
                    (instagram.businessCategoryName
                        ? ` | Categoria IG: ${instagram.businessCategoryName}`
                        : ''));
            }
            lines.push(`Posts recentes (2 mais novos, fixados ignorados) @${instagram.username}:`);
            const posts = instagram.recentPosts.slice(0, 2);
            if (posts.length === 0) {
                lines.push('• Nenhum post após filtrar fixados.');
            }
            else {
                posts.forEach((post, index) => {
                    const likes = post.likes != null ? `${post.likes} curtidas` : 'curtidas N/D';
                    const views = post.views != null ? `${post.views} views` : 'views N/D';
                    const when = post.timestamp
                        ? this.formatPostDate(post.timestamp)
                        : 'data N/D';
                    lines.push(`• Post ${index + 1}: ${likes}, ${views}, ${when}.`);
                });
            }
            if (instagram.daysSinceLastPost != null) {
                lines.push(`• Último post há ${instagram.daysSinceLastPost} dia(s).`);
            }
            if (usedApify) {
                lines.push('• Instagram via Apify.');
            }
        }
        else if (lead.instagram?.trim()) {
            lines.push('Instagram informado, mas sem dados (Apify indisponível ou perfil restrito).');
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
    formatFactor(factor) {
        const delta = factor.delta === 0
            ? ''
            : ` (${factor.delta > 0 ? '+' : ''}${factor.delta})`;
        return `• ${factor.label}${delta}`;
    }
    verdictLabel(verdict) {
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
    formatPostDate(iso) {
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
    readCachedInstagram(lead) {
        const raw = lead.rawData;
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return null;
        }
        const snapshot = raw.instagramQualification;
        if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
            return null;
        }
        const fetchedAt = snapshot.fetchedAt;
        if (!fetchedAt || Date.parse(fetchedAt) < Date.now() - INSTAGRAM_CACHE_MS) {
            return null;
        }
        const data = snapshot;
        if (!('biography' in data) || !('followersCount' in data)) {
            return null;
        }
        const posts = data.recentPosts;
        if (Array.isArray(posts) &&
            posts.some((post) => !post || !('views' in post))) {
            return null;
        }
        return data;
    }
};
exports.LeadQualificationService = LeadQualificationService;
exports.LeadQualificationService = LeadQualificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [instagram_apify_enricher_1.InstagramApifyEnricher,
        commercial_fit_service_1.CommercialFitService,
        company_lookup_service_1.CompanyLookupService])
], LeadQualificationService);
//# sourceMappingURL=lead-qualification.service.js.map
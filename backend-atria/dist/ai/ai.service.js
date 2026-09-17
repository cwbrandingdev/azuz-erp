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
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const VALID_FORMATS = [
    client_1.ContentPostFormat.CAROUSEL,
    client_1.ContentPostFormat.REELS,
    client_1.ContentPostFormat.STATIC,
    client_1.ContentPostFormat.STORY,
];
const FORMAT_ROTATION = [
    client_1.ContentPostFormat.CAROUSEL,
    client_1.ContentPostFormat.REELS,
    client_1.ContentPostFormat.STATIC,
    client_1.ContentPostFormat.STORY,
    client_1.ContentPostFormat.CAROUSEL,
];
let AiService = AiService_1 = class AiService {
    config;
    logger = new common_1.Logger(AiService_1.name);
    constructor(config) {
        this.config = config;
    }
    async generateContentPlan(input) {
        const platform = input.platform ?? client_1.ContentPlatform.INSTAGRAM;
        const openaiKey = this.config.get('OPENAI_API_KEY');
        const geminiKey = this.config.get('GEMINI_API_KEY');
        const provider = this.config.get('AI_PROVIDER') ?? 'openai';
        if (provider === 'gemini' && geminiKey) {
            try {
                return await this.generateWithGemini(input, platform, geminiKey);
            }
            catch (error) {
                this.logger.warn(`Gemini failed, trying fallback: ${error}`);
            }
        }
        if (openaiKey) {
            try {
                return await this.generateWithOpenAI(input, platform, openaiKey);
            }
            catch (error) {
                this.logger.warn(`OpenAI failed, trying fallback: ${error}`);
            }
        }
        if (geminiKey && provider !== 'gemini') {
            try {
                return await this.generateWithGemini(input, platform, geminiKey);
            }
            catch (error) {
                this.logger.warn(`Gemini fallback failed: ${error}`);
            }
        }
        return this.generateFallbackPlan(input, platform);
    }
    async qualifyLead(input) {
        const openaiKey = this.config.get('OPENAI_API_KEY');
        const geminiKey = this.config.get('GEMINI_API_KEY');
        const provider = this.config.get('AI_PROVIDER') ?? 'openai';
        if (provider === 'gemini' && geminiKey) {
            try {
                return await this.qualifyWithGemini(input, geminiKey);
            }
            catch (error) {
                this.logger.warn(`Gemini lead qualify failed: ${error}`);
            }
        }
        if (openaiKey) {
            try {
                return await this.qualifyWithOpenAI(input, openaiKey);
            }
            catch (error) {
                this.logger.warn(`OpenAI lead qualify failed: ${error}`);
            }
        }
        if (geminiKey && provider !== 'gemini') {
            try {
                return await this.qualifyWithGemini(input, geminiKey);
            }
            catch (error) {
                this.logger.warn(`Gemini lead qualify fallback failed: ${error}`);
            }
        }
        return this.qualifyFallback(input);
    }
    buildPrompt(input, platform) {
        const formats = VALID_FORMATS.join(', ');
        return `You are a senior social media strategist for a digital agency.
Parse the client brief below and generate a structured content plan.

Client: ${input.clientName}
Platform: ${platform}
${input.objective ? `Campaign objective: ${input.objective}` : ''}

Brief:
"""
${input.brief}
"""

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "summary": "1-2 sentence campaign summary in Portuguese",
  "ideas": [
    {
      "title": "Post title",
      "copy": "Full caption/copy draft in Portuguese with emojis where appropriate",
      "format": "one of: ${formats}",
      "mediaConcept": "Visual/production direction for designers",
      "suggestedDate": "ISO 8601 date-time string, spread across next 2-3 weeks on weekdays"
    }
  ]
}

Rules:
- Generate exactly 5 content ideas
- Vary formats across carousel, reels, static, story
- suggestedDate must be future dates, Mon-Fri preferred, 10:00 BRT
- All text in Brazilian Portuguese`;
    }
    async generateWithOpenAI(input, platform, apiKey) {
        const model = this.config.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                temperature: 0.7,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You are a JSON-only API. Respond with valid JSON matching the requested schema.',
                    },
                    { role: 'user', content: this.buildPrompt(input, platform) },
                ],
            }),
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`OpenAI API error ${response.status}: ${body}`);
        }
        const data = (await response.json());
        const content = data.choices?.[0]?.message?.content;
        if (!content)
            throw new Error('Empty OpenAI response');
        return this.parsePlanResponse(content, platform, 'openai');
    }
    async generateWithGemini(input, platform, apiKey) {
        const model = this.config.get('GEMINI_MODEL') ?? 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: this.buildPrompt(input, platform) }] }],
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: 'application/json',
                },
            }),
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Gemini API error ${response.status}: ${body}`);
        }
        const data = (await response.json());
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content)
            throw new Error('Empty Gemini response');
        return this.parsePlanResponse(content, platform, 'gemini');
    }
    parsePlanResponse(raw, platform, provider) {
        const jsonText = this.extractJson(raw);
        const parsed = JSON.parse(jsonText);
        const ideas = (parsed.ideas ?? [])
            .slice(0, 5)
            .map((idea, index) => this.normalizeIdea(idea, index));
        while (ideas.length < 5) {
            ideas.push(this.normalizeIdea({}, ideas.length));
        }
        return {
            summary: parsed.summary?.trim() || 'Plano de conteúdo gerado a partir do briefing.',
            platform,
            ideas,
            provider,
        };
    }
    extractJson(raw) {
        const trimmed = raw.trim();
        const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenced?.[1])
            return fenced[1].trim();
        const start = trimmed.indexOf('{');
        const end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start)
            return trimmed.slice(start, end + 1);
        return trimmed;
    }
    normalizeIdea(idea, index) {
        const format = this.normalizeFormat(idea.format, index);
        const suggestedDate = this.normalizeDate(idea.suggestedDate, index);
        return {
            title: idea.title?.trim() || `Ideia de conteúdo ${index + 1}`,
            copy: idea.copy?.trim() || 'Copy a ser refinada pela equipe criativa.',
            format,
            mediaConcept: idea.mediaConcept?.trim() ||
                'Conceito visual alinhado à identidade da marca.',
            suggestedDate,
        };
    }
    normalizeFormat(value, index) {
        const upper = value?.toUpperCase();
        if (VALID_FORMATS.includes(upper))
            return upper;
        return FORMAT_ROTATION[index % FORMAT_ROTATION.length];
    }
    normalizeDate(value, index) {
        if (value) {
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime()) && parsed > new Date()) {
                return parsed.toISOString();
            }
        }
        return this.defaultScheduleDate(index).toISOString();
    }
    defaultScheduleDate(index) {
        const date = new Date();
        date.setDate(date.getDate() + (index + 1) * 3);
        while (date.getDay() === 0 || date.getDay() === 6) {
            date.setDate(date.getDate() + 1);
        }
        date.setHours(10, 0, 0, 0);
        return date;
    }
    generateFallbackPlan(input, platform) {
        const briefSnippet = input.brief.trim().slice(0, 120);
        const themes = this.extractThemes(input.brief);
        const ideas = Array.from({ length: 5 }, (_, index) => {
            const theme = themes[index % themes.length];
            const format = FORMAT_ROTATION[index];
            const scheduled = this.defaultScheduleDate(index);
            return {
                title: `${theme} — ${input.clientName}`,
                copy: this.buildFallbackCopy(theme, input.clientName, briefSnippet, format),
                format,
                mediaConcept: this.buildFallbackMediaConcept(theme, format),
                suggestedDate: scheduled.toISOString(),
            };
        });
        return {
            summary: `Plano de conteúdo para ${input.clientName} com foco em: ${themes.slice(0, 3).join(', ')}.`,
            platform,
            ideas,
            provider: 'fallback',
        };
    }
    extractThemes(brief) {
        const cleaned = brief
            .replace(/\s+/g, ' ')
            .split(/[.!?\n]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 12);
        if (cleaned.length >= 3)
            return cleaned.slice(0, 5);
        return [
            'Apresentação da marca',
            'Benefícios do produto',
            'Bastidores e processo',
            'Depoimento e prova social',
            'Chamada para ação',
        ];
    }
    buildFallbackCopy(theme, clientName, briefSnippet, format) {
        const formatHint = format === client_1.ContentPostFormat.REELS
            ? '🎬 Vídeo curto e dinâmico'
            : format === client_1.ContentPostFormat.CAROUSEL
                ? '📸 Carrossel educativo'
                : format === client_1.ContentPostFormat.STORY
                    ? '✨ Story interativo'
                    : '📌 Post estático';
        return `${formatHint}\n\n${theme} — ${clientName}\n\n${briefSnippet}${briefSnippet.length >= 120 ? '...' : ''}\n\n👉 Saiba mais nos comentários ou no link da bio.\n\n#${clientName.replace(/\s+/g, '').toLowerCase()} #marketingdigital`;
    }
    buildFallbackMediaConcept(theme, format) {
        const base = `Visual clean com cores da marca. Tema: ${theme}.`;
        switch (format) {
            case client_1.ContentPostFormat.REELS:
                return `${base} Vídeo vertical 9:16, cortes rápidos, legendas on-screen.`;
            case client_1.ContentPostFormat.CAROUSEL:
                return `${base} 5 slides: capa impactante + 3 pontos-chave + CTA final.`;
            case client_1.ContentPostFormat.STORY:
                return `${base} Sequência de 3 stories com sticker de enquete ou link.`;
            default:
                return `${base} Imagem estática com tipografia forte e CTA visível.`;
        }
    }
    buildLeadQualifyPrompt(input) {
        return `You are a B2B sales analyst for a digital marketing agency in Brazil.
Qualify this Google Maps lead as a potential agency client.

Lead data:
- Name: ${input.name}
- Category: ${input.category ?? 'n/a'}
- City: ${input.city ?? 'n/a'}
- Neighborhood: ${input.neighborhood ?? 'n/a'}
- Address: ${input.address ?? 'n/a'}
- Phone: ${input.phone ?? 'n/a'}
- Email: ${input.email ?? 'n/a'}
- Website: ${input.website ?? 'n/a'}
- Rating: ${input.rating ?? 'n/a'}
- Reviews: ${input.reviewsCount ?? 'n/a'}

Return ONLY valid JSON (no markdown):
{
  "qualified": true,
  "score": 0,
  "notes": "2-3 sentences in Brazilian Portuguese explaining the qualification"
}

Rules:
- score must be an integer from 0 to 100
- qualified is true when score >= 60
- Prefer leads with phone/website and local businesses that likely need marketing
- Be concise and actionable in notes`;
    }
    async qualifyWithOpenAI(input, apiKey) {
        const model = this.config.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                temperature: 0.3,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You are a JSON-only API. Respond with valid JSON matching the requested schema.',
                    },
                    { role: 'user', content: this.buildLeadQualifyPrompt(input) },
                ],
            }),
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`OpenAI API error ${response.status}: ${body}`);
        }
        const data = (await response.json());
        const content = data.choices?.[0]?.message?.content;
        if (!content)
            throw new Error('Empty OpenAI response');
        return this.parseLeadQualification(content, 'openai');
    }
    async qualifyWithGemini(input, apiKey) {
        const model = this.config.get('GEMINI_MODEL') ?? 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { parts: [{ text: this.buildLeadQualifyPrompt(input) }] },
                ],
                generationConfig: {
                    temperature: 0.3,
                    responseMimeType: 'application/json',
                },
            }),
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Gemini API error ${response.status}: ${body}`);
        }
        const data = (await response.json());
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content)
            throw new Error('Empty Gemini response');
        return this.parseLeadQualification(content, 'gemini');
    }
    parseLeadQualification(content, provider) {
        const parsed = JSON.parse(content);
        const scoreRaw = typeof parsed.score === 'number' ? parsed.score : Number(parsed.score);
        const score = Number.isFinite(scoreRaw)
            ? Math.max(0, Math.min(100, Math.round(scoreRaw)))
            : 50;
        const qualified = typeof parsed.qualified === 'boolean'
            ? parsed.qualified
            : score >= 60;
        const notes = typeof parsed.notes === 'string' && parsed.notes.trim()
            ? parsed.notes.trim()
            : 'Qualificação concluída sem observações detalhadas.';
        return { qualified, score, notes, provider };
    }
    qualifyFallback(input) {
        let score = 40;
        if (input.phone)
            score += 15;
        if (input.website)
            score += 15;
        if (input.email)
            score += 10;
        if (typeof input.rating === 'number' && input.rating >= 4)
            score += 10;
        if (typeof input.reviewsCount === 'number' && input.reviewsCount >= 20) {
            score += 10;
        }
        score = Math.min(100, score);
        return {
            qualified: score >= 60,
            score,
            notes: `Qualificação automática de ${input.name}: ${score >= 60
                ? 'lead com sinais comerciais positivos (contato e presença digital).'
                : 'lead com dados incompletos; recomenda-se enriquecimento antes do contato.'}`,
            provider: 'fallback',
        };
    }
    async assessCommercialFit(input) {
        const openaiKey = this.config.get('OPENAI_API_KEY');
        const geminiKey = this.config.get('GEMINI_API_KEY');
        const provider = this.config.get('AI_PROVIDER') ?? 'openai';
        if (provider === 'gemini' && geminiKey) {
            try {
                return await this.commercialFitWithGemini(input, geminiKey);
            }
            catch (error) {
                this.logger.warn(`Gemini commercial fit failed: ${error}`);
            }
        }
        if (openaiKey) {
            try {
                return await this.commercialFitWithOpenAI(input, openaiKey);
            }
            catch (error) {
                this.logger.warn(`OpenAI commercial fit failed: ${error}`);
            }
        }
        if (geminiKey && provider !== 'gemini') {
            try {
                return await this.commercialFitWithGemini(input, geminiKey);
            }
            catch (error) {
                this.logger.warn(`Gemini commercial fit fallback failed: ${error}`);
            }
        }
        return null;
    }
    buildCommercialFitPrompt(input) {
        return `Analise o fit comercial deste lead para uma agência de marketing (CW Branding).

Pacotes mensais (referência):
- Projeto Posicionamento: R$ 5.699/mês
- Projeto Escala: R$ 7.999/mês
- Projeto Liderança: R$ 9.999/mês

Lead:
- Nome: ${input.name}
- Categoria cadastro/maps: ${input.category ?? 'não informada'}
- Bio Instagram: ${input.biography ?? 'não informada'}
- Categoria Instagram: ${input.businessCategoryName ?? 'não informada'}
- Seguidores: ${input.followersCount ?? 'não informado'}
- Avaliações Google: ${input.reviewsCount ?? 'não informado'}
- Capital social (Receita Federal, se conhecido): ${input.shareCapital != null
            ? `R$ ${input.shareCapital.toLocaleString('pt-BR')}`
            : 'não informado'} (não é faturamento mensal)

Estime o segmento (ex.: nail designer autônoma, clínica, restaurante) e se o negócio provavelmente sustenta o pacote mínimo (~R$ 5.699/mês recorrente). Microempreendedores de beleza solo costumam faturar até ~R$ 15k/mês e muitas vezes não sustentam esse ticket.

Responda JSON:
{
  "segmentLabel": "string curta",
  "estimatedRevenueBand": "ex: até R$ 15k/mês",
  "revenueJustification": "2-3 frases em português explicando POR QUE estimou essa faixa (tipo de negócio, tamanho, bio, ticket do pacote CW)",
  "recommendedAction": "prioritize" | "nurture" | "do_not_prioritize",
  "oneLineReason": "uma frase em português sobre fit comercial"
}`;
    }
    parseCommercialFitAi(content, provider) {
        const parsed = JSON.parse(content);
        const actionRaw = String(parsed.recommendedAction ?? '').toLowerCase();
        const recommendedAction = actionRaw === 'prioritize' ||
            actionRaw === 'nurture' ||
            actionRaw === 'do_not_prioritize'
            ? actionRaw
            : 'nurture';
        return {
            segmentLabel: typeof parsed.segmentLabel === 'string' && parsed.segmentLabel.trim()
                ? parsed.segmentLabel.trim()
                : 'Segmento indefinido',
            estimatedRevenueBand: typeof parsed.estimatedRevenueBand === 'string' &&
                parsed.estimatedRevenueBand.trim()
                ? parsed.estimatedRevenueBand.trim()
                : 'Não estimado',
            revenueJustification: typeof parsed.revenueJustification === 'string' &&
                parsed.revenueJustification.trim()
                ? parsed.revenueJustification.trim()
                : 'Estimativa baseada no perfil e nos pacotes CW.',
            recommendedAction,
            oneLineReason: typeof parsed.oneLineReason === 'string' && parsed.oneLineReason.trim()
                ? parsed.oneLineReason.trim()
                : 'Análise automática sem detalhe adicional.',
            provider,
        };
    }
    async commercialFitWithOpenAI(input, apiKey) {
        const model = this.config.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                temperature: 0.2,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You are a JSON-only API. Respond with valid JSON matching the requested schema.',
                    },
                    { role: 'user', content: this.buildCommercialFitPrompt(input) },
                ],
            }),
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`OpenAI API error ${response.status}: ${body}`);
        }
        const data = (await response.json());
        const content = data.choices?.[0]?.message?.content;
        if (!content)
            throw new Error('Empty OpenAI response');
        return this.parseCommercialFitAi(content, 'openai');
    }
    async commercialFitWithGemini(input, apiKey) {
        const model = this.config.get('GEMINI_MODEL') ?? 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { parts: [{ text: this.buildCommercialFitPrompt(input) }] },
                ],
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: 'application/json',
                },
            }),
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Gemini API error ${response.status}: ${body}`);
        }
        const data = (await response.json());
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content)
            throw new Error('Empty Gemini response');
        return this.parseCommercialFitAi(content, 'gemini');
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ContentPlatform,
  ContentPostFormat,
} from '@prisma/client';

export interface BriefContentIdea {
  title: string;
  copy: string;
  format: ContentPostFormat;
  mediaConcept: string;
  suggestedDate: string;
}

export interface BriefContentPlan {
  summary: string;
  platform: ContentPlatform;
  ideas: BriefContentIdea[];
  provider: 'openai' | 'gemini' | 'fallback';
}

export interface LeadQualificationInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  category?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
}

export interface LeadQualificationResult {
  qualified: boolean;
  score: number;
  notes: string;
  provider: 'openai' | 'gemini' | 'fallback';
}

export interface CommercialFitAiInput {
  name: string;
  category?: string | null;
  biography?: string | null;
  businessCategoryName?: string | null;
  followersCount?: number | null;
  reviewsCount?: number | null;
  shareCapital?: number | null;
}

export interface CommercialFitAiResult {
  segmentLabel: string;
  estimatedRevenueBand: string;
  revenueJustification: string;
  recommendedAction: 'prioritize' | 'nurture' | 'do_not_prioritize';
  oneLineReason: string;
  provider: 'openai' | 'gemini' | 'fallback';
}

interface GeneratePlanInput {
  brief: string;
  clientName: string;
  platform?: ContentPlatform;
  objective?: string;
}

const VALID_FORMATS: ContentPostFormat[] = [
  ContentPostFormat.CAROUSEL,
  ContentPostFormat.REELS,
  ContentPostFormat.STATIC,
  ContentPostFormat.STORY,
];

const FORMAT_ROTATION: ContentPostFormat[] = [
  ContentPostFormat.CAROUSEL,
  ContentPostFormat.REELS,
  ContentPostFormat.STATIC,
  ContentPostFormat.STORY,
  ContentPostFormat.CAROUSEL,
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly config: ConfigService) {}

  async generateContentPlan(input: GeneratePlanInput): Promise<BriefContentPlan> {
    const platform = input.platform ?? ContentPlatform.INSTAGRAM;
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');
    const provider = this.config.get<string>('AI_PROVIDER') ?? 'openai';

    if (provider === 'gemini' && geminiKey) {
      try {
        return await this.generateWithGemini(input, platform, geminiKey);
      } catch (error) {
        this.logger.warn(`Gemini failed, trying fallback: ${error}`);
      }
    }

    if (openaiKey) {
      try {
        return await this.generateWithOpenAI(input, platform, openaiKey);
      } catch (error) {
        this.logger.warn(`OpenAI failed, trying fallback: ${error}`);
      }
    }

    if (geminiKey && provider !== 'gemini') {
      try {
        return await this.generateWithGemini(input, platform, geminiKey);
      } catch (error) {
        this.logger.warn(`Gemini fallback failed: ${error}`);
      }
    }

    return this.generateFallbackPlan(input, platform);
  }

  async qualifyLead(
    input: LeadQualificationInput,
  ): Promise<LeadQualificationResult> {
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');
    const provider = this.config.get<string>('AI_PROVIDER') ?? 'openai';

    if (provider === 'gemini' && geminiKey) {
      try {
        return await this.qualifyWithGemini(input, geminiKey);
      } catch (error) {
        this.logger.warn(`Gemini lead qualify failed: ${error}`);
      }
    }

    if (openaiKey) {
      try {
        return await this.qualifyWithOpenAI(input, openaiKey);
      } catch (error) {
        this.logger.warn(`OpenAI lead qualify failed: ${error}`);
      }
    }

    if (geminiKey && provider !== 'gemini') {
      try {
        return await this.qualifyWithGemini(input, geminiKey);
      } catch (error) {
        this.logger.warn(`Gemini lead qualify fallback failed: ${error}`);
      }
    }

    return this.qualifyFallback(input);
  }

  private buildPrompt(input: GeneratePlanInput, platform: ContentPlatform) {
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

  private async generateWithOpenAI(
    input: GeneratePlanInput,
    platform: ContentPlatform,
    apiKey: string,
  ): Promise<BriefContentPlan> {
    const model =
      this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';

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
            content:
              'You are a JSON-only API. Respond with valid JSON matching the requested schema.',
          },
          { role: 'user', content: this.buildPrompt(input, platform) },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty OpenAI response');

    return this.parsePlanResponse(content, platform, 'openai');
  }

  private async generateWithGemini(
    input: GeneratePlanInput,
    platform: ContentPlatform,
    apiKey: string,
  ): Promise<BriefContentPlan> {
    const model =
      this.config.get<string>('GEMINI_MODEL') ?? 'gemini-1.5-flash';
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

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Empty Gemini response');

    return this.parsePlanResponse(content, platform, 'gemini');
  }

  private parsePlanResponse(
    raw: string,
    platform: ContentPlatform,
    provider: 'openai' | 'gemini',
  ): BriefContentPlan {
    const jsonText = this.extractJson(raw);
    const parsed = JSON.parse(jsonText) as {
      summary?: string;
      ideas?: Array<{
        title?: string;
        copy?: string;
        format?: string;
        mediaConcept?: string;
        suggestedDate?: string;
      }>;
    };

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

  private extractJson(raw: string): string {
    const trimmed = raw.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return fenced[1].trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
    return trimmed;
  }

  private normalizeIdea(
    idea: {
      title?: string;
      copy?: string;
      format?: string;
      mediaConcept?: string;
      suggestedDate?: string;
    },
    index: number,
  ): BriefContentIdea {
    const format = this.normalizeFormat(idea.format, index);
    const suggestedDate = this.normalizeDate(idea.suggestedDate, index);

    return {
      title: idea.title?.trim() || `Ideia de conteúdo ${index + 1}`,
      copy: idea.copy?.trim() || 'Copy a ser refinada pela equipe criativa.',
      format,
      mediaConcept:
        idea.mediaConcept?.trim() ||
        'Conceito visual alinhado à identidade da marca.',
      suggestedDate,
    };
  }

  private normalizeFormat(value: string | undefined, index: number): ContentPostFormat {
    const upper = value?.toUpperCase() as ContentPostFormat;
    if (VALID_FORMATS.includes(upper)) return upper;
    return FORMAT_ROTATION[index % FORMAT_ROTATION.length];
  }

  private normalizeDate(value: string | undefined, index: number): string {
    if (value) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime()) && parsed > new Date()) {
        return parsed.toISOString();
      }
    }
    return this.defaultScheduleDate(index).toISOString();
  }

  private defaultScheduleDate(index: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + (index + 1) * 3);
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
    date.setHours(10, 0, 0, 0);
    return date;
  }

  private generateFallbackPlan(
    input: GeneratePlanInput,
    platform: ContentPlatform,
  ): BriefContentPlan {
    const briefSnippet = input.brief.trim().slice(0, 120);
    const themes = this.extractThemes(input.brief);

    const ideas: BriefContentIdea[] = Array.from({ length: 5 }, (_, index) => {
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

  private extractThemes(brief: string): string[] {
    const cleaned = brief
      .replace(/\s+/g, ' ')
      .split(/[.!?\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 12);

    if (cleaned.length >= 3) return cleaned.slice(0, 5);

    return [
      'Apresentação da marca',
      'Benefícios do produto',
      'Bastidores e processo',
      'Depoimento e prova social',
      'Chamada para ação',
    ];
  }

  private buildFallbackCopy(
    theme: string,
    clientName: string,
    briefSnippet: string,
    format: ContentPostFormat,
  ): string {
    const formatHint =
      format === ContentPostFormat.REELS
        ? '🎬 Vídeo curto e dinâmico'
        : format === ContentPostFormat.CAROUSEL
          ? '📸 Carrossel educativo'
          : format === ContentPostFormat.STORY
            ? '✨ Story interativo'
            : '📌 Post estático';

    return `${formatHint}\n\n${theme} — ${clientName}\n\n${briefSnippet}${briefSnippet.length >= 120 ? '...' : ''}\n\n👉 Saiba mais nos comentários ou no link da bio.\n\n#${clientName.replace(/\s+/g, '').toLowerCase()} #marketingdigital`;
  }

  private buildFallbackMediaConcept(
    theme: string,
    format: ContentPostFormat,
  ): string {
    const base = `Visual clean com cores da marca. Tema: ${theme}.`;
    switch (format) {
      case ContentPostFormat.REELS:
        return `${base} Vídeo vertical 9:16, cortes rápidos, legendas on-screen.`;
      case ContentPostFormat.CAROUSEL:
        return `${base} 5 slides: capa impactante + 3 pontos-chave + CTA final.`;
      case ContentPostFormat.STORY:
        return `${base} Sequência de 3 stories com sticker de enquete ou link.`;
      default:
        return `${base} Imagem estática com tipografia forte e CTA visível.`;
    }
  }

  private buildLeadQualifyPrompt(input: LeadQualificationInput): string {
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

  private async qualifyWithOpenAI(
    input: LeadQualificationInput,
    apiKey: string,
  ): Promise<LeadQualificationResult> {
    const model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';

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
            content:
              'You are a JSON-only API. Respond with valid JSON matching the requested schema.',
          },
          { role: 'user', content: this.buildLeadQualifyPrompt(input) },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty OpenAI response');

    return this.parseLeadQualification(content, 'openai');
  }

  private async qualifyWithGemini(
    input: LeadQualificationInput,
    apiKey: string,
  ): Promise<LeadQualificationResult> {
    const model =
      this.config.get<string>('GEMINI_MODEL') ?? 'gemini-1.5-flash';
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

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Empty Gemini response');

    return this.parseLeadQualification(content, 'gemini');
  }

  private parseLeadQualification(
    content: string,
    provider: 'openai' | 'gemini',
  ): LeadQualificationResult {
    const parsed = JSON.parse(content) as {
      qualified?: unknown;
      score?: unknown;
      notes?: unknown;
    };

    const scoreRaw =
      typeof parsed.score === 'number' ? parsed.score : Number(parsed.score);
    const score = Number.isFinite(scoreRaw)
      ? Math.max(0, Math.min(100, Math.round(scoreRaw)))
      : 50;
    const qualified =
      typeof parsed.qualified === 'boolean'
        ? parsed.qualified
        : score >= 60;
    const notes =
      typeof parsed.notes === 'string' && parsed.notes.trim()
        ? parsed.notes.trim()
        : 'Qualificação concluída sem observações detalhadas.';

    return { qualified, score, notes, provider };
  }

  private qualifyFallback(
    input: LeadQualificationInput,
  ): LeadQualificationResult {
    let score = 40;
    if (input.phone) score += 15;
    if (input.website) score += 15;
    if (input.email) score += 10;
    if (typeof input.rating === 'number' && input.rating >= 4) score += 10;
    if (typeof input.reviewsCount === 'number' && input.reviewsCount >= 20) {
      score += 10;
    }
    score = Math.min(100, score);

    return {
      qualified: score >= 60,
      score,
      notes: `Qualificação automática de ${input.name}: ${
        score >= 60
          ? 'lead com sinais comerciais positivos (contato e presença digital).'
          : 'lead com dados incompletos; recomenda-se enriquecimento antes do contato.'
      }`,
      provider: 'fallback',
    };
  }

  async assessCommercialFit(
    input: CommercialFitAiInput,
  ): Promise<CommercialFitAiResult | null> {
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');
    const provider = this.config.get<string>('AI_PROVIDER') ?? 'openai';

    if (provider === 'gemini' && geminiKey) {
      try {
        return await this.commercialFitWithGemini(input, geminiKey);
      } catch (error) {
        this.logger.warn(`Gemini commercial fit failed: ${error}`);
      }
    }

    if (openaiKey) {
      try {
        return await this.commercialFitWithOpenAI(input, openaiKey);
      } catch (error) {
        this.logger.warn(`OpenAI commercial fit failed: ${error}`);
      }
    }

    if (geminiKey && provider !== 'gemini') {
      try {
        return await this.commercialFitWithGemini(input, geminiKey);
      } catch (error) {
        this.logger.warn(`Gemini commercial fit fallback failed: ${error}`);
      }
    }

    return null;
  }

  private buildCommercialFitPrompt(input: CommercialFitAiInput): string {
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
- Capital social (Receita Federal, se conhecido): ${
      input.shareCapital != null
        ? `R$ ${input.shareCapital.toLocaleString('pt-BR')}`
        : 'não informado'
    } (não é faturamento mensal)

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

  private parseCommercialFitAi(
    content: string,
    provider: 'openai' | 'gemini',
  ): CommercialFitAiResult {
    const parsed = JSON.parse(content) as {
      segmentLabel?: unknown;
      estimatedRevenueBand?: unknown;
      revenueJustification?: unknown;
      recommendedAction?: unknown;
      oneLineReason?: unknown;
    };

    const actionRaw = String(parsed.recommendedAction ?? '').toLowerCase();
    const recommendedAction =
      actionRaw === 'prioritize' ||
      actionRaw === 'nurture' ||
      actionRaw === 'do_not_prioritize'
        ? actionRaw
        : 'nurture';

    return {
      segmentLabel:
        typeof parsed.segmentLabel === 'string' && parsed.segmentLabel.trim()
          ? parsed.segmentLabel.trim()
          : 'Segmento indefinido',
      estimatedRevenueBand:
        typeof parsed.estimatedRevenueBand === 'string' &&
        parsed.estimatedRevenueBand.trim()
          ? parsed.estimatedRevenueBand.trim()
          : 'Não estimado',
      revenueJustification:
        typeof parsed.revenueJustification === 'string' &&
        parsed.revenueJustification.trim()
          ? parsed.revenueJustification.trim()
          : 'Estimativa baseada no perfil e nos pacotes CW.',
      recommendedAction,
      oneLineReason:
        typeof parsed.oneLineReason === 'string' && parsed.oneLineReason.trim()
          ? parsed.oneLineReason.trim()
          : 'Análise automática sem detalhe adicional.',
      provider,
    };
  }

  private async commercialFitWithOpenAI(
    input: CommercialFitAiInput,
    apiKey: string,
  ): Promise<CommercialFitAiResult> {
    const model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';

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
            content:
              'You are a JSON-only API. Respond with valid JSON matching the requested schema.',
          },
          { role: 'user', content: this.buildCommercialFitPrompt(input) },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty OpenAI response');

    return this.parseCommercialFitAi(content, 'openai');
  }

  private async commercialFitWithGemini(
    input: CommercialFitAiInput,
    apiKey: string,
  ): Promise<CommercialFitAiResult> {
    const model =
      this.config.get<string>('GEMINI_MODEL') ?? 'gemini-1.5-flash';
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

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Empty Gemini response');

    return this.parseCommercialFitAi(content, 'gemini');
  }
}

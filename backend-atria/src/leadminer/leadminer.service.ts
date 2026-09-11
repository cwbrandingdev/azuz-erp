import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Lead, LeadStatus, Prisma } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { LeadStagesService } from '../leads/lead-stages.service';
import { CrmScopeService } from '../leads/crm-scope.service';
import {
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
} from '../leads/lead-kanban.constants';
import { PrismaService } from '../prisma/prisma.service';
import { ImportLeadMinerLeadsDto } from './dto/import-leads.dto';
import { SearchLeadsDTO } from './dto/search-leads.dto';

export interface LeadMinerJobStartResponse {
  job_id: string;
  status: string;
}

export interface LeadMinerLead {
  title?: string;
  phone: string;
  address?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  category?: string;
}

export interface LeadMinerJobStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data?: LeadMinerLead[];
  error?: string;
}

@Injectable()
export class LeadminerService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly companySettings: CompanySettingsService,
    private readonly leadStages: LeadStagesService,
    private readonly crmScope: CrmScopeService,
  ) {}

  private getLeadMinerBaseUrl(): string {
    const baseURL = this.configService.get<string>('LEADMINER_API');
    if (!baseURL) {
      throw new InternalServerErrorException('LEADMINER_API is not defined');
    }
    return baseURL.replace(/\/$/, '');
  }

  async SearchLeads(
    payload: SearchLeadsDTO,
  ): Promise<LeadMinerJobStartResponse> {
    const url = `${this.getLeadMinerBaseUrl()}/leads/search`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as LeadMinerJobStartResponse;
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getJobStatus(jobId: string): Promise<LeadMinerJobStatusResponse> {
    const url = `${this.getLeadMinerBaseUrl()}/leads/job/${encodeURIComponent(jobId)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      if (response.status === 404) {
        throw new NotFoundException('Job ID not found');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as LeadMinerJobStatusResponse;
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      console.error(err);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async importLeads(dto: ImportLeadMinerLeadsDto) {
    const addToKanban = dto.addToKanban === true;

    if (addToKanban || dto.organizationId) {
      await this.crmScope.assertOrganizationAllowsLeadCreation(
        dto.organizationId,
      );
    }

    const created: Lead[] = [];

    for (const item of dto.leads) {
      const phone = item.phone?.trim();
      const name = item.title?.trim() || phone;
      if (!phone || !name) continue;

      const existing = await this.prisma.lead.findFirst({
        where: {
          deletedAt: null,
          phone,
          name: { equals: name, mode: 'insensitive' },
        },
      });

      if (existing) {
        if (addToKanban && !existing.kanbanTracked) {
          const tracked = await this.markLeadForKanban(existing.id);
          created.push(tracked);
        } else {
          created.push(existing);
        }
        continue;
      }

      const baseData = {
        name,
        phone,
        website: item.website,
        address: item.address,
        city: dto.city,
        neighborhood: dto.neighborhood,
        category: dto.category,
        rating: item.rating,
        reviewsCount: item.reviews,
        source: 'leadminer' as const,
        rawData: item as unknown as Prisma.InputJsonValue,
        organizationId: dto.organizationId ?? null,
      };

      if (addToKanban) {
        const stage = await this.leadStages.resolveStage();
        const status = this.leadStages.statusFromStage(stage);
        const maxOrder = await this.prisma.lead.aggregate({
          where: { kanbanTracked: true, status },
          _max: { kanbanOrder: true },
        });

        const lead = await this.prisma.lead.create({
          data: {
            ...baseData,
            status,
            stageId: stage.id,
            kanbanTracked: true,
            kanbanOrder: (maxOrder._max.kanbanOrder ?? -1) + 1,
          },
        });
        created.push(lead);
        continue;
      }

      const lead = await this.prisma.lead.create({ data: baseData });
      created.push(lead);
    }

    return created.map((lead) => this.toLeadResponse(lead));
  }

  private async markLeadForKanban(leadId: string): Promise<Lead> {
    const stage = await this.leadStages.resolveStage();
    const status = this.leadStages.statusFromStage(stage);
    const maxOrder = await this.prisma.lead.aggregate({
      where: { kanbanTracked: true, status },
      _max: { kanbanOrder: true },
    });

    return this.prisma.lead.update({
      where: { id: leadId },
      data: {
        kanbanTracked: true,
        status,
        stageId: stage.id,
        kanbanOrder: (maxOrder._max.kanbanOrder ?? -1) + 1,
      },
    });
  }

  private toLeadResponse(lead: Lead) {
    return {
      id: lead.id,
      companyId: lead.companyId,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      website: lead.website,
      address: lead.address,
      city: lead.city,
      neighborhood: lead.neighborhood,
      category: lead.category,
      placeId: lead.placeId,
      rating: lead.rating,
      reviewsCount: lead.reviewsCount,
      latitude: lead.latitude,
      longitude: lead.longitude,
      status: lead.status,
      statusLabel: LEAD_STATUS_LABELS[lead.status as LeadStatus],
      statusColor: LEAD_STATUS_COLORS[lead.status as LeadStatus],
      kanbanTracked: lead.kanbanTracked,
      kanbanOrder: lead.kanbanOrder,
      aiScore: lead.aiScore,
      aiNotes: lead.aiNotes,
      source: lead.source,
      rawData: lead.rawData,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    };
  }
}

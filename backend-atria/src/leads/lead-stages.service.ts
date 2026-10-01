import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadStage, LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLeadStageDto,
  ReorderLeadStagesDto,
  UpdateLeadStageDto,
} from './dto/lead-stage.dto';
import {
  LEAD_KANBAN_STATUSES,
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
} from './lead-kanban.constants';

@Injectable()
export class LeadStagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId?: string | null) {
    const stages = await this.ensureDefaults(organizationId);
    return stages.map((stage) => this.toResponse(stage));
  }

  async getById(id: string) {
    return this.requireStage(id);
  }

  async create(dto: CreateLeadStageDto) {
    const organizationId = this.normalizeOrganizationId(dto.organizationId);
    await this.ensureDefaults(organizationId);

    const name = dto.name.trim();
    await this.assertUniqueName(name, organizationId);

    const order =
      dto.order ??
      ((
        await this.prisma.leadStage.aggregate({
          where: this.scopeWhere(organizationId),
          _max: { order: true },
        })
      )._max.order ?? -1) + 1;

    const stage = await this.prisma.leadStage.create({
      data: {
        name,
        color: dto.color?.trim() || '#64748B',
        order,
        organizationId,
      },
    });

    return this.toResponse(stage);
  }

  async update(id: string, dto: UpdateLeadStageDto) {
    const existing = await this.requireStage(id);
    const name = dto.name?.trim();
    const organizationId = this.normalizeOrganizationId(
      existing.organizationId,
    );

    if (name && name !== existing.name) {
      await this.assertUniqueName(name, organizationId, id);
    }

    const stage = await this.prisma.leadStage.update({
      where: { id },
      data: {
        name,
        color: dto.color?.trim(),
        order: dto.order,
      },
    });

    return this.toResponse(stage);
  }

  async reorder(dto: ReorderLeadStagesDto) {
    const organizationId = this.normalizeOrganizationId(dto.organizationId);
    const stages = await this.ensureDefaults(organizationId);
    const knownIds = new Set(stages.map((stage) => stage.id));
    const uniqueIds = [...new Set(dto.ids)];

    if (
      uniqueIds.length !== stages.length ||
      uniqueIds.some((id) => !knownIds.has(id))
    ) {
      throw new BadRequestException(
        'A lista de estágios deve incluir todos os estágios do funil.',
      );
    }

    await this.prisma.$transaction(
      uniqueIds.map((id, order) =>
        this.prisma.leadStage.update({
          where: { id },
          data: { order },
        }),
      ),
    );

    const updated = await this.findScoped(organizationId);
    return updated.map((stage) => this.toResponse(stage));
  }

  async remove(id: string) {
    const existing = await this.requireStage(id);
    const organizationId = this.normalizeOrganizationId(
      existing.organizationId,
    );
    const remaining = await this.prisma.leadStage.findMany({
      where: {
        ...this.scopeWhere(organizationId),
        id: { not: id },
      },
      orderBy: { order: 'asc' },
    });

    if (remaining.length === 0) {
      throw new BadRequestException(
        'Não é possível excluir o último estágio do funil.',
      );
    }

    const fallback = remaining[0];
    await this.prisma.$transaction([
      this.prisma.lead.updateMany({
        where: { stageId: id },
        data: {
          stageId: fallback.id,
          status: this.statusFromStage(fallback),
        },
      }),
      this.prisma.leadStage.delete({ where: { id } }),
    ]);

    await this.normalizeOrder(organizationId);
    return { success: true };
  }

  async ensureDefaults(
    organizationId?: string | null,
  ): Promise<LeadStage[]> {
    const scopedOrganizationId = this.normalizeOrganizationId(organizationId);

    if (scopedOrganizationId) {
      return this.ensureOrganizationDefaults(scopedOrganizationId);
    }

    return this.ensureGlobalDefaults();
  }

  async resolveStage(input?: {
    stageId?: string | null;
    status?: string | null;
    organizationId?: string | null;
  }): Promise<LeadStage> {
    const organizationId = this.normalizeOrganizationId(input?.organizationId);
    const stages = await this.ensureDefaults(organizationId);
    const stageId = input?.stageId?.trim() || null;
    const status = input?.status?.trim() || null;

    if (stageId) {
      const inScope = stages.find((stage) => stage.id === stageId);
      if (inScope) return inScope;

      const foreign = await this.prisma.leadStage.findUnique({
        where: { id: stageId },
      });
      if (!foreign) {
        throw new NotFoundException('Estágio do funil não encontrado.');
      }

      const mapped = this.mapStageIntoScope(foreign, stages);
      if (mapped) return mapped;
    }

    if (status) {
      const normalized = status.toUpperCase();
      const byKey = this.isLeadStatus(normalized)
        ? stages.find((stage) => stage.key === normalized)
        : stages.find((stage) => stage.id === status || stage.key === status);
      if (byKey) return byKey;
    }

    return stages[0];
  }

  statusFromStage(stage: LeadStage): LeadStatus {
    if (stage.key && this.isLeadStatus(stage.key)) {
      return stage.key;
    }
    return LeadStatus.PRE_VENDA;
  }

  toResponse(stage: LeadStage) {
    return {
      id: stage.id,
      tenantId: stage.companyId,
      companyId: stage.companyId,
      organizationId: stage.organizationId,
      name: stage.name,
      order: stage.order,
      color: stage.color,
      key: stage.key,
      createdAt: stage.createdAt.toISOString(),
      updatedAt: stage.updatedAt.toISOString(),
    };
  }

  private async ensureGlobalDefaults(): Promise<LeadStage[]> {
    const existing = await this.findScoped(null);
    if (existing.length > 0) {
      await this.reconcileBuiltinStages(existing);
      return this.findScoped(null);
    }

    await this.prisma.leadStage.createMany({
      data: LEAD_KANBAN_STATUSES.map((status, order) => ({
        name: LEAD_STATUS_LABELS[status],
        color: LEAD_STATUS_COLORS[status],
        key: status,
        order,
        organizationId: null,
      })),
    });

    const created = await this.findScoped(null);

    await Promise.all(
      created
        .filter((stage) => stage.key && this.isLeadStatus(stage.key))
        .map((stage) =>
          this.prisma.lead.updateMany({
            where: { stageId: null, status: stage.key as LeadStatus },
            data: { stageId: stage.id },
          }),
        ),
    );

    return created;
  }

  private async ensureOrganizationDefaults(
    organizationId: string,
  ): Promise<LeadStage[]> {
    const existing = await this.findScoped(organizationId);
    if (existing.length > 0) {
      return existing;
    }

    const template = await this.ensureGlobalDefaults();

    try {
      await this.prisma.leadStage.createMany({
        data: template.map((stage) => ({
          name: stage.name,
          color: stage.color,
          key: stage.key,
          order: stage.order,
          companyId: stage.companyId,
          organizationId,
        })),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const raced = await this.findScoped(organizationId);
        if (raced.length > 0) return raced;
      }
      throw error;
    }

    const cloned = await this.findScoped(organizationId);
    await this.remapLeadsToClonedStages(organizationId, template, cloned);
    return cloned;
  }

  private async remapLeadsToClonedStages(
    organizationId: string,
    template: LeadStage[],
    cloned: LeadStage[],
  ) {
    const templateById = new Map(template.map((stage) => [stage.id, stage]));
    const leads = await this.prisma.lead.findMany({
      where: { organizationId },
      select: { id: true, stageId: true, status: true },
    });

    const updates = leads.map((lead) => {
      const previous = lead.stageId
        ? templateById.get(lead.stageId)
        : undefined;
      const next =
        this.mapStageIntoScope(previous ?? null, cloned, lead.status) ??
        cloned[0];

      if (!next || next.id === lead.stageId) {
        return null;
      }

      return this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          stageId: next.id,
          status: this.statusFromStage(next),
        },
      });
    });

    const pending = updates.filter(
      (update): update is ReturnType<typeof this.prisma.lead.update> =>
        Boolean(update),
    );
    if (pending.length === 0) return;
    await this.prisma.$transaction(pending);
  }

  private mapStageIntoScope(
    source: Pick<LeadStage, 'key' | 'name'> | null,
    stages: LeadStage[],
    status?: LeadStatus | string | null,
  ): LeadStage | undefined {
    if (source?.key) {
      const byKey = stages.find((stage) => stage.key === source.key);
      if (byKey) return byKey;
    }

    if (status) {
      const byStatus = stages.find((stage) => stage.key === status);
      if (byStatus) return byStatus;
    }

    if (source?.name) {
      const expected = source.name.trim().toLowerCase();
      const byName = stages.find(
        (stage) => stage.name.trim().toLowerCase() === expected,
      );
      if (byName) return byName;
    }

    return stages[0];
  }

  private async requireStage(id: string) {
    const stage = await this.prisma.leadStage.findUnique({
      where: { id },
    });
    if (!stage) {
      throw new NotFoundException('Estágio do funil não encontrado.');
    }
    return stage;
  }

  private async assertUniqueName(
    name: string,
    organizationId: string | null,
    excludeId?: string,
  ) {
    const duplicate = await this.prisma.leadStage.findFirst({
      where: {
        ...this.scopeWhere(organizationId),
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException('Já existe um estágio com este nome.');
    }
  }

  private async normalizeOrder(organizationId: string | null) {
    const stages = await this.findScoped(organizationId);
    await this.prisma.$transaction(
      stages.map((stage, order) =>
        this.prisma.leadStage.update({
          where: { id: stage.id },
          data: { order },
        }),
      ),
    );
  }

  private async findScoped(organizationId: string | null) {
    return this.prisma.leadStage.findMany({
      where: this.scopeWhere(organizationId),
      orderBy: { order: 'asc' },
    });
  }

  private scopeWhere(organizationId: string | null): Prisma.LeadStageWhereInput {
    return { organizationId };
  }

  private normalizeOrganizationId(
    organizationId?: string | null,
  ): string | null {
    const value = organizationId?.trim();
    return value ? value : null;
  }

  private isLeadStatus(value: string): value is LeadStatus {
    return (Object.values(LeadStatus) as string[]).includes(value);
  }

  /**
   * Migrates the retired POS_VENDA built-in stage onto VENDA_FINALIZADA.
   */
  private async reconcileBuiltinStages(existing: LeadStage[]) {
    const posVendaStage = existing.find(
      (stage) => stage.key === LeadStatus.POS_VENDA,
    );
    const vendaFinalizadaStage = existing.find(
      (stage) => stage.key === LeadStatus.VENDA_FINALIZADA,
    );
    if (!posVendaStage || !vendaFinalizadaStage) {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.lead.updateMany({
        where: { stageId: posVendaStage.id },
        data: {
          stageId: vendaFinalizadaStage.id,
          status: LeadStatus.VENDA_FINALIZADA,
        },
      }),
      this.prisma.lead.updateMany({
        where: { status: LeadStatus.POS_VENDA },
        data: {
          stageId: vendaFinalizadaStage.id,
          status: LeadStatus.VENDA_FINALIZADA,
        },
      }),
      this.prisma.leadStage.delete({ where: { id: posVendaStage.id } }),
    ]);
  }
}

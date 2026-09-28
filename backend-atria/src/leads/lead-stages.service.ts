import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadStage, LeadStatus } from '@prisma/client';
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

  async findAll() {
    const stages = await this.ensureDefaults();
    return stages.map((stage) => this.toResponse(stage));
  }

  async create(dto: CreateLeadStageDto) {
    await this.ensureDefaults();

    const name = dto.name.trim();
    await this.assertUniqueName(name);

    const order =
      dto.order ??
      ((
        await this.prisma.leadStage.aggregate({
          _max: { order: true },
        })
      )._max.order ?? -1) + 1;

    const stage = await this.prisma.leadStage.create({
      data: {
        name,
        color: dto.color?.trim() || '#64748B',
        order,
      },
    });

    return this.toResponse(stage);
  }

  async update(id: string, dto: UpdateLeadStageDto) {
    const existing = await this.requireStage(id);
    const name = dto.name?.trim();

    if (name && name !== existing.name) {
      await this.assertUniqueName(name, id);
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
    const stages = await this.ensureDefaults();
    const knownIds = new Set(stages.map((stage) => stage.id));
    const uniqueIds = [...new Set(dto.ids)];

    if (uniqueIds.length !== stages.length || uniqueIds.some((id) => !knownIds.has(id))) {
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

    const updated = await this.prisma.leadStage.findMany({
      orderBy: { order: 'asc' },
    });
    return updated.map((stage) => this.toResponse(stage));
  }

  async remove(id: string) {
    await this.requireStage(id);
    const remaining = await this.prisma.leadStage.findMany({
      where: { id: { not: id } },
      orderBy: { order: 'asc' },
    });

    if (remaining.length === 0) {
      throw new BadRequestException('Não é possível excluir o último estágio do funil.');
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

    await this.normalizeOrder();
    return { success: true };
  }

  async ensureDefaults(): Promise<LeadStage[]> {
    const existing = await this.prisma.leadStage.findMany({
      orderBy: { order: 'asc' },
    });
    if (existing.length > 0) {
      await this.reconcileBuiltinStages(existing);
      return this.prisma.leadStage.findMany({
        orderBy: { order: 'asc' },
      });
    }

    await this.prisma.leadStage.createMany({
      data: LEAD_KANBAN_STATUSES.map((status, order) => ({
        name: LEAD_STATUS_LABELS[status],
        color: LEAD_STATUS_COLORS[status],
        key: status,
        order,
      })),
    });

    const created = await this.prisma.leadStage.findMany({
      orderBy: { order: 'asc' },
    });

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

  async resolveStage(stageId?: string | null): Promise<LeadStage> {
    const stages = await this.ensureDefaults();
    if (stageId) {
      const match = stages.find((stage) => stage.id === stageId);
      if (!match) {
        throw new NotFoundException('Estágio do funil não encontrado.');
      }
      return match;
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
      name: stage.name,
      order: stage.order,
      color: stage.color,
      key: stage.key,
      createdAt: stage.createdAt.toISOString(),
      updatedAt: stage.updatedAt.toISOString(),
    };
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

  private async assertUniqueName(name: string, excludeId?: string) {
    const duplicate = await this.prisma.leadStage.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException('Já existe um estágio com este nome.');
    }
  }

  private async normalizeOrder() {
    const stages = await this.prisma.leadStage.findMany({
      orderBy: { order: 'asc' },
    });
    await this.prisma.$transaction(
      stages.map((stage, order) =>
        this.prisma.leadStage.update({
          where: { id: stage.id },
          data: { order },
        }),
      ),
    );
  }

  private isLeadStatus(value: string): value is LeadStatus {
    return (Object.values(LeadStatus) as string[]).includes(value);
  }

  /**
   * Keeps built-in funnel stages aligned with LEAD_KANBAN_STATUSES (order, labels, colors).
   */
  private async reconcileBuiltinStages(existing: LeadStage[]) {
    const byKey = new Map(
      existing
        .filter((stage) => stage.key)
        .map((stage) => [stage.key as string, stage]),
    );

    const posVendaStage = byKey.get(LeadStatus.POS_VENDA);
    const vendaFinalizadaStage = byKey.get(LeadStatus.VENDA_FINALIZADA);
    if (posVendaStage && vendaFinalizadaStage) {
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
      byKey.delete(LeadStatus.POS_VENDA);
    }

    const updates: Array<ReturnType<typeof this.prisma.leadStage.update>> = [];
    for (let order = 0; order < LEAD_KANBAN_STATUSES.length; order++) {
      const status = LEAD_KANBAN_STATUSES[order];
      const stage = byKey.get(status);
      if (!stage) continue;

      updates.push(
        this.prisma.leadStage.update({
          where: { id: stage.id },
          data: {
            order,
            name: LEAD_STATUS_LABELS[status],
            color: LEAD_STATUS_COLORS[status],
          },
        }),
      );
    }

    if (updates.length > 0) {
      await this.prisma.$transaction(updates);
    }
  }
}

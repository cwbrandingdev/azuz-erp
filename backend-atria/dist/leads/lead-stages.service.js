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
exports.LeadStagesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const lead_kanban_constants_1 = require("./lead-kanban.constants");
let LeadStagesService = class LeadStagesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(organizationId) {
        const stages = await this.ensureDefaults(organizationId);
        return stages.map((stage) => this.toResponse(stage));
    }
    async getById(id) {
        return this.requireStage(id);
    }
    async create(dto) {
        const organizationId = this.normalizeOrganizationId(dto.organizationId);
        await this.ensureDefaults(organizationId);
        const name = dto.name.trim();
        await this.assertUniqueName(name, organizationId);
        const order = dto.order ??
            ((await this.prisma.leadStage.aggregate({
                where: this.scopeWhere(organizationId),
                _max: { order: true },
            }))._max.order ?? -1) + 1;
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
    async update(id, dto) {
        const existing = await this.requireStage(id);
        const name = dto.name?.trim();
        const organizationId = this.normalizeOrganizationId(existing.organizationId);
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
    async reorder(dto) {
        const organizationId = this.normalizeOrganizationId(dto.organizationId);
        const stages = await this.ensureDefaults(organizationId);
        const knownIds = new Set(stages.map((stage) => stage.id));
        const uniqueIds = [...new Set(dto.ids)];
        if (uniqueIds.length !== stages.length ||
            uniqueIds.some((id) => !knownIds.has(id))) {
            throw new common_1.BadRequestException('A lista de estágios deve incluir todos os estágios do funil.');
        }
        await this.prisma.$transaction(uniqueIds.map((id, order) => this.prisma.leadStage.update({
            where: { id },
            data: { order },
        })));
        const updated = await this.findScoped(organizationId);
        return updated.map((stage) => this.toResponse(stage));
    }
    async remove(id) {
        const existing = await this.requireStage(id);
        if (existing.key === lead_kanban_constants_1.ORCAMENTO_STAGE_KEY) {
            throw new common_1.BadRequestException('A coluna Orçamento não pode ser excluída. Oculte-a em Personalizar colunas.');
        }
        const organizationId = this.normalizeOrganizationId(existing.organizationId);
        const remaining = await this.prisma.leadStage.findMany({
            where: {
                ...this.scopeWhere(organizationId),
                id: { not: id },
            },
            orderBy: { order: 'asc' },
        });
        if (remaining.length === 0) {
            throw new common_1.BadRequestException('Não é possível excluir o último estágio do funil.');
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
    async ensureDefaults(organizationId) {
        const scopedOrganizationId = this.normalizeOrganizationId(organizationId);
        if (scopedOrganizationId) {
            return this.ensureOrganizationDefaults(scopedOrganizationId);
        }
        return this.ensureGlobalDefaults();
    }
    async resolveStage(input) {
        const organizationId = this.normalizeOrganizationId(input?.organizationId);
        const stages = await this.ensureDefaults(organizationId);
        const stageId = input?.stageId?.trim() || null;
        const status = input?.status?.trim() || null;
        if (stageId) {
            const inScope = stages.find((stage) => stage.id === stageId);
            if (inScope)
                return inScope;
            const foreign = await this.prisma.leadStage.findUnique({
                where: { id: stageId },
            });
            if (!foreign) {
                throw new common_1.NotFoundException('Estágio do funil não encontrado.');
            }
            const mapped = this.mapStageIntoScope(foreign, stages);
            if (mapped)
                return mapped;
        }
        if (status) {
            const normalized = status.toUpperCase();
            const byKey = this.isLeadStatus(normalized)
                ? stages.find((stage) => stage.key === normalized)
                : stages.find((stage) => stage.id === status || stage.key === status);
            if (byKey)
                return byKey;
        }
        return stages[0];
    }
    statusFromStage(stage) {
        if (stage.key && this.isLeadStatus(stage.key)) {
            return stage.key;
        }
        return client_1.LeadStatus.PRE_VENDA;
    }
    toResponse(stage) {
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
    async ensureGlobalDefaults() {
        const existing = await this.findScoped(null);
        if (existing.length > 0) {
            await this.reconcileBuiltinStages(existing);
            await this.ensureOrcamentoStage(null);
            return this.findScoped(null);
        }
        await this.prisma.leadStage.createMany({
            data: this.defaultStageTemplates().map((stage, order) => ({
                ...stage,
                order,
                organizationId: null,
            })),
        });
        const created = await this.findScoped(null);
        await Promise.all(created
            .filter((stage) => stage.key && this.isLeadStatus(stage.key))
            .map((stage) => this.prisma.lead.updateMany({
            where: { stageId: null, status: stage.key },
            data: { stageId: stage.id },
        })));
        return created;
    }
    async ensureOrganizationDefaults(organizationId) {
        const existing = await this.findScoped(organizationId);
        if (existing.length > 0) {
            await this.ensureOrcamentoStage(organizationId);
            return this.findScoped(organizationId);
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
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                const raced = await this.findScoped(organizationId);
                if (raced.length > 0)
                    return raced;
            }
            throw error;
        }
        const cloned = await this.findScoped(organizationId);
        await this.remapLeadsToClonedStages(organizationId, template, cloned);
        return cloned;
    }
    async remapLeadsToClonedStages(organizationId, template, cloned) {
        const templateById = new Map(template.map((stage) => [stage.id, stage]));
        const leads = await this.prisma.lead.findMany({
            where: { organizationId },
            select: { id: true, stageId: true, status: true },
        });
        const updates = leads.map((lead) => {
            const previous = lead.stageId
                ? templateById.get(lead.stageId)
                : undefined;
            const next = this.mapStageIntoScope(previous ?? null, cloned, lead.status) ??
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
        const pending = updates.filter((update) => Boolean(update));
        if (pending.length === 0)
            return;
        await this.prisma.$transaction(pending);
    }
    mapStageIntoScope(source, stages, status) {
        if (source?.key) {
            const byKey = stages.find((stage) => stage.key === source.key);
            if (byKey)
                return byKey;
        }
        if (status) {
            const byStatus = stages.find((stage) => stage.key === status);
            if (byStatus)
                return byStatus;
        }
        if (source?.name) {
            const expected = source.name.trim().toLowerCase();
            const byName = stages.find((stage) => stage.name.trim().toLowerCase() === expected);
            if (byName)
                return byName;
        }
        return stages[0];
    }
    async requireStage(id) {
        const stage = await this.prisma.leadStage.findUnique({
            where: { id },
        });
        if (!stage) {
            throw new common_1.NotFoundException('Estágio do funil não encontrado.');
        }
        return stage;
    }
    async assertUniqueName(name, organizationId, excludeId) {
        const duplicate = await this.prisma.leadStage.findFirst({
            where: {
                ...this.scopeWhere(organizationId),
                name: { equals: name, mode: 'insensitive' },
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true },
        });
        if (duplicate) {
            throw new common_1.BadRequestException('Já existe um estágio com este nome.');
        }
    }
    async normalizeOrder(organizationId) {
        const stages = await this.findScoped(organizationId);
        await this.prisma.$transaction(stages.map((stage, order) => this.prisma.leadStage.update({
            where: { id: stage.id },
            data: { order },
        })));
    }
    async findScoped(organizationId) {
        return this.prisma.leadStage.findMany({
            where: this.scopeWhere(organizationId),
            orderBy: { order: 'asc' },
        });
    }
    scopeWhere(organizationId) {
        return { organizationId };
    }
    normalizeOrganizationId(organizationId) {
        const value = organizationId?.trim();
        return value ? value : null;
    }
    isLeadStatus(value) {
        return Object.values(client_1.LeadStatus).includes(value);
    }
    defaultStageTemplates() {
        const templates = [];
        for (const status of lead_kanban_constants_1.LEAD_KANBAN_STATUSES) {
            templates.push({
                name: lead_kanban_constants_1.LEAD_STATUS_LABELS[status],
                color: lead_kanban_constants_1.LEAD_STATUS_COLORS[status],
                key: status,
            });
            if (status === client_1.LeadStatus.APRESENTACAO) {
                templates.push({
                    name: lead_kanban_constants_1.ORCAMENTO_STAGE_NAME,
                    color: lead_kanban_constants_1.ORCAMENTO_STAGE_COLOR,
                    key: lead_kanban_constants_1.ORCAMENTO_STAGE_KEY,
                });
            }
        }
        return templates;
    }
    async ensureOrcamentoStage(organizationId) {
        const existing = await this.findScoped(organizationId);
        if (existing.some((stage) => stage.key === lead_kanban_constants_1.ORCAMENTO_STAGE_KEY)) {
            return;
        }
        const byName = existing.find((stage) => {
            const name = stage.name.trim().toLowerCase();
            return name === 'orçamento' || name === 'orcamento';
        });
        if (byName) {
            await this.prisma.leadStage.update({
                where: { id: byName.id },
                data: {
                    key: lead_kanban_constants_1.ORCAMENTO_STAGE_KEY,
                    name: byName.name.trim() || lead_kanban_constants_1.ORCAMENTO_STAGE_NAME,
                },
            });
            return;
        }
        const afterApresentacao = existing.findIndex((stage) => stage.key === client_1.LeadStatus.APRESENTACAO);
        const insertAt = afterApresentacao >= 0
            ? afterApresentacao + 1
            : Math.min(2, existing.length);
        const toShift = existing.slice(insertAt);
        try {
            await this.prisma.$transaction([
                ...toShift.map((stage) => this.prisma.leadStage.update({
                    where: { id: stage.id },
                    data: { order: stage.order + 1 },
                })),
                this.prisma.leadStage.create({
                    data: {
                        name: lead_kanban_constants_1.ORCAMENTO_STAGE_NAME,
                        color: lead_kanban_constants_1.ORCAMENTO_STAGE_COLOR,
                        key: lead_kanban_constants_1.ORCAMENTO_STAGE_KEY,
                        order: insertAt,
                        organizationId,
                        ...(existing[0] ? { companyId: existing[0].companyId } : {}),
                    },
                }),
            ]);
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                const raced = await this.findScoped(organizationId);
                if (raced.some((stage) => stage.key === lead_kanban_constants_1.ORCAMENTO_STAGE_KEY)) {
                    return;
                }
            }
            throw error;
        }
        await this.normalizeOrder(organizationId);
    }
    async reconcileBuiltinStages(existing) {
        const posVendaStage = existing.find((stage) => stage.key === client_1.LeadStatus.POS_VENDA);
        const vendaFinalizadaStage = existing.find((stage) => stage.key === client_1.LeadStatus.VENDA_FINALIZADA);
        if (!posVendaStage || !vendaFinalizadaStage) {
            return;
        }
        await this.prisma.$transaction([
            this.prisma.lead.updateMany({
                where: { stageId: posVendaStage.id },
                data: {
                    stageId: vendaFinalizadaStage.id,
                    status: client_1.LeadStatus.VENDA_FINALIZADA,
                },
            }),
            this.prisma.lead.updateMany({
                where: { status: client_1.LeadStatus.POS_VENDA },
                data: {
                    stageId: vendaFinalizadaStage.id,
                    status: client_1.LeadStatus.VENDA_FINALIZADA,
                },
            }),
            this.prisma.leadStage.delete({ where: { id: posVendaStage.id } }),
        ]);
    }
};
exports.LeadStagesService = LeadStagesService;
exports.LeadStagesService = LeadStagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeadStagesService);
//# sourceMappingURL=lead-stages.service.js.map
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
    async findAll() {
        const stages = await this.ensureDefaults();
        return stages.map((stage) => this.toResponse(stage));
    }
    async create(dto) {
        await this.ensureDefaults();
        const name = dto.name.trim();
        await this.assertUniqueName(name);
        const order = dto.order ??
            ((await this.prisma.leadStage.aggregate({
                _max: { order: true },
            }))._max.order ?? -1) + 1;
        const stage = await this.prisma.leadStage.create({
            data: {
                name,
                color: dto.color?.trim() || '#64748B',
                order,
            },
        });
        return this.toResponse(stage);
    }
    async update(id, dto) {
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
    async reorder(dto) {
        const stages = await this.ensureDefaults();
        const knownIds = new Set(stages.map((stage) => stage.id));
        const uniqueIds = [...new Set(dto.ids)];
        if (uniqueIds.length !== stages.length || uniqueIds.some((id) => !knownIds.has(id))) {
            throw new common_1.BadRequestException('A lista de estágios deve incluir todos os estágios do funil.');
        }
        await this.prisma.$transaction(uniqueIds.map((id, order) => this.prisma.leadStage.update({
            where: { id },
            data: { order },
        })));
        const updated = await this.prisma.leadStage.findMany({
            orderBy: { order: 'asc' },
        });
        return updated.map((stage) => this.toResponse(stage));
    }
    async remove(id) {
        await this.requireStage(id);
        const remaining = await this.prisma.leadStage.findMany({
            where: { id: { not: id } },
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
        await this.normalizeOrder();
        return { success: true };
    }
    async ensureDefaults() {
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
            data: lead_kanban_constants_1.LEAD_KANBAN_STATUSES.map((status, order) => ({
                name: lead_kanban_constants_1.LEAD_STATUS_LABELS[status],
                color: lead_kanban_constants_1.LEAD_STATUS_COLORS[status],
                key: status,
                order,
            })),
        });
        const created = await this.prisma.leadStage.findMany({
            orderBy: { order: 'asc' },
        });
        await Promise.all(created
            .filter((stage) => stage.key && this.isLeadStatus(stage.key))
            .map((stage) => this.prisma.lead.updateMany({
            where: { stageId: null, status: stage.key },
            data: { stageId: stage.id },
        })));
        return created;
    }
    async resolveStage(stageId) {
        const stages = await this.ensureDefaults();
        if (stageId) {
            const match = stages.find((stage) => stage.id === stageId);
            if (!match) {
                throw new common_1.NotFoundException('Estágio do funil não encontrado.');
            }
            return match;
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
            name: stage.name,
            order: stage.order,
            color: stage.color,
            key: stage.key,
            createdAt: stage.createdAt.toISOString(),
            updatedAt: stage.updatedAt.toISOString(),
        };
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
    async assertUniqueName(name, excludeId) {
        const duplicate = await this.prisma.leadStage.findFirst({
            where: {
                name: { equals: name, mode: 'insensitive' },
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true },
        });
        if (duplicate) {
            throw new common_1.BadRequestException('Já existe um estágio com este nome.');
        }
    }
    async normalizeOrder() {
        const stages = await this.prisma.leadStage.findMany({
            orderBy: { order: 'asc' },
        });
        await this.prisma.$transaction(stages.map((stage, order) => this.prisma.leadStage.update({
            where: { id: stage.id },
            data: { order },
        })));
    }
    isLeadStatus(value) {
        return Object.values(client_1.LeadStatus).includes(value);
    }
    async reconcileBuiltinStages(existing) {
        const byKey = new Map(existing
            .filter((stage) => stage.key)
            .map((stage) => [stage.key, stage]));
        const posVendaStage = byKey.get(client_1.LeadStatus.POS_VENDA);
        const vendaFinalizadaStage = byKey.get(client_1.LeadStatus.VENDA_FINALIZADA);
        if (posVendaStage && vendaFinalizadaStage) {
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
            byKey.delete(client_1.LeadStatus.POS_VENDA);
        }
        const updates = [];
        for (let order = 0; order < lead_kanban_constants_1.LEAD_KANBAN_STATUSES.length; order++) {
            const status = lead_kanban_constants_1.LEAD_KANBAN_STATUSES[order];
            const stage = byKey.get(status);
            if (!stage)
                continue;
            updates.push(this.prisma.leadStage.update({
                where: { id: stage.id },
                data: {
                    order,
                    name: lead_kanban_constants_1.LEAD_STATUS_LABELS[status],
                    color: lead_kanban_constants_1.LEAD_STATUS_COLORS[status],
                },
            }));
        }
        if (updates.length > 0) {
            await this.prisma.$transaction(updates);
        }
    }
};
exports.LeadStagesService = LeadStagesService;
exports.LeadStagesService = LeadStagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeadStagesService);
//# sourceMappingURL=lead-stages.service.js.map
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
exports.ClientGroupsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ClientGroupsService = class ClientGroupsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const groups = await this.prisma.clientGroup.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { clients: true } } },
        });
        return groups.map((group) => this.toResponse(group));
    }
    async findOne(id) {
        const group = await this.ensureExists(id);
        return this.toResponse(group);
    }
    async update(id, dto) {
        await this.ensureExists(id);
        try {
            const group = await this.prisma.clientGroup.update({
                where: { id },
                data: {
                    name: dto.name?.trim(),
                    description: dto.description?.trim(),
                    color: dto.color,
                },
                include: { _count: { select: { clients: true } } },
            });
            return this.toResponse(group);
        }
        catch (error) {
            if (this.isUniqueConstraintError(error)) {
                throw new common_1.ConflictException('Client group name already exists');
            }
            throw error;
        }
    }
    async remove(id) {
        await this.ensureExists(id);
        await this.prisma.clientGroup.delete({ where: { id } });
    }
    async ensureExists(id) {
        const group = await this.prisma.clientGroup.findUnique({
            where: { id },
            include: { _count: { select: { clients: true } } },
        });
        if (!group)
            throw new common_1.NotFoundException('Client group not found');
        return group;
    }
    toResponse(group) {
        return {
            id: group.id,
            name: group.name,
            description: group.description,
            color: group.color,
            clientCount: group._count?.clients ?? 0,
            createdAt: group.createdAt.toISOString(),
            updatedAt: group.updatedAt.toISOString(),
        };
    }
    isUniqueConstraintError(error) {
        return (typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'P2002');
    }
};
exports.ClientGroupsService = ClientGroupsService;
exports.ClientGroupsService = ClientGroupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClientGroupsService);
//# sourceMappingURL=client-groups.service.js.map
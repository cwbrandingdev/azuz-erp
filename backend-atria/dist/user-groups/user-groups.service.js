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
exports.UserGroupsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const memberInclude = {
    members: {
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                    category: true,
                    role: { select: { name: true } },
                },
            },
        },
        orderBy: { assignedAt: 'asc' },
    },
    _count: { select: { users: true, members: true } },
};
let UserGroupsService = class UserGroupsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const groups = await this.prisma.userGroup.findMany({
            orderBy: { name: 'asc' },
            include: memberInclude,
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
            const group = await this.prisma.userGroup.update({
                where: { id },
                data: {
                    name: dto.name?.trim(),
                    description: dto.description?.trim(),
                    color: dto.color,
                },
                include: memberInclude,
            });
            return this.toResponse(group);
        }
        catch (error) {
            if (this.isUniqueConstraintError(error)) {
                throw new common_1.ConflictException('User group name already exists');
            }
            throw error;
        }
    }
    async remove(id) {
        await this.ensureExists(id);
        await this.prisma.userGroup.delete({ where: { id } });
    }
    async addMembers(id, memberIds) {
        await this.ensureExists(id);
        const users = await this.prisma.user.findMany({
            where: { id: { in: memberIds } },
            select: { id: true, category: true },
        });
        if (users.length !== memberIds.length) {
            throw new common_1.NotFoundException('One or more users were not found');
        }
        if (users.some((user) => user.category === client_1.UserCategory.CLIENT)) {
            throw new common_1.BadRequestException('CLIENT users cannot be added to member groups');
        }
        await this.prisma.userGroupMember.createMany({
            data: memberIds.map((userId) => ({ userId, userGroupId: id })),
            skipDuplicates: true,
        });
        await this.prisma.user.updateMany({
            where: {
                id: { in: memberIds },
                category: client_1.UserCategory.MEMBER,
                userGroupId: null,
            },
            data: { userGroupId: id },
        });
        return this.findOne(id);
    }
    async ensureExists(id) {
        const group = await this.prisma.userGroup.findUnique({
            where: { id },
            include: memberInclude,
        });
        if (!group)
            throw new common_1.NotFoundException('User group not found');
        return group;
    }
    toResponse(group) {
        const members = (group.members ?? [])
            .filter((membership) => membership.user.category === client_1.UserCategory.MEMBER)
            .map((membership) => ({
            id: membership.user.id,
            name: membership.user.name,
            email: membership.user.email,
            avatarUrl: membership.user.avatarUrl,
            role: membership.user.role.name.toLowerCase(),
            category: membership.user.category.toLowerCase(),
            assignedAt: membership.assignedAt.toISOString(),
        }));
        return {
            id: group.id,
            name: group.name,
            description: group.description,
            color: group.color,
            userCount: members.length || group._count?.members || group._count?.users || 0,
            members,
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
exports.UserGroupsService = UserGroupsService;
exports.UserGroupsService = UserGroupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserGroupsService);
//# sourceMappingURL=user-groups.service.js.map
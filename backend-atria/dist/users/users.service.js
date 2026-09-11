"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const finance_service_1 = require("../finance/finance.service");
const crm_scope_service_1 = require("../leads/crm-scope.service");
const prisma_service_1 = require("../prisma/prisma.service");
const supabase_storage_service_1 = require("../supabase/supabase-storage.service");
const company_constants_1 = require("../company/company.constants");
const LOCAL_AVATAR_DIR = (0, path_1.join)(process.cwd(), 'uploads', 'avatars');
const SALT_ROUNDS = 12;
const userGroupSelect = {
    id: true,
    name: true,
    description: true,
    color: true,
};
function isCrmRole(role) {
    return role === client_1.RoleName.CRM;
}
function isClientRole(role) {
    return role === client_1.RoleName.CLIENT || role === client_1.RoleName.EXTERNAL_CLIENT_CRM;
}
function slugifyName(name) {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.replace(/[^a-z0-9]/g, ''))
        .filter(Boolean)
        .join('.');
}
function generateTemporaryPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const bytes = (0, crypto_1.randomBytes)(12);
    return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}
let UsersService = class UsersService {
    prisma;
    configService;
    financeService;
    storage;
    crmScope;
    constructor(prisma, configService, financeService, storage, crmScope) {
        this.prisma = prisma;
        this.configService = configService;
        this.financeService = financeService;
        this.storage = storage;
        this.crmScope = crmScope;
    }
    async findAll() {
        const users = await this.prisma.user.findMany({
            orderBy: { name: 'asc' },
            include: {
                role: true,
                userGroup: true,
                userGroups: { include: { userGroup: true } },
                client: { select: { id: true, companyName: true } },
                crmScopes: { select: { clientId: true, includeInternal: true } },
                sdrAssignments: { select: { organizationId: true } },
            },
        });
        return users.map((user) => this.toUserResponse(user, this.snapshotFromRelations(user.crmScopes, user.sdrAssignments.map((assignment) => assignment.organizationId))));
    }
    async findMembers() {
        const users = await this.prisma.user.findMany({
            where: { category: client_1.UserCategory.MEMBER },
            orderBy: { name: 'asc' },
            include: {
                role: true,
                userGroup: true,
                userGroups: { include: { userGroup: true } },
                client: { select: { id: true, companyName: true } },
                crmScopes: { select: { clientId: true, includeInternal: true } },
                sdrAssignments: { select: { organizationId: true } },
                _count: {
                    select: {
                        kanbanAssignments: {
                            where: { task: { deletedAt: null } },
                        },
                    },
                },
            },
        });
        return users.map((user) => ({
            ...this.toUserResponse(user, this.snapshotFromRelations(user.crmScopes, user.sdrAssignments.map((assignment) => assignment.organizationId))),
            activeTaskCount: user._count.kanbanAssignments,
        }));
    }
    async findClients() {
        const users = await this.prisma.user.findMany({
            where: { category: client_1.UserCategory.CLIENT },
            orderBy: { name: 'asc' },
            include: {
                role: true,
                userGroup: true,
                userGroups: { include: { userGroup: true } },
                client: {
                    select: {
                        id: true,
                        companyName: true,
                        _count: {
                            select: {
                                deliverables: {
                                    where: {
                                        approvalStatus: {
                                            in: ['DRAFT', 'PENDING_APPROVAL', 'REQUIRES_ADJUSTMENT'],
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        return users.map((user) => {
            const base = this.toUserResponse(user);
            const portalAccess = !user.clientId
                ? 'unlinked'
                : user.mustChangePassword
                    ? 'pending'
                    : 'active';
            return {
                ...base,
                portalAccess,
                activeDeliverableCount: user.client?._count.deliverables ?? 0,
            };
        });
    }
    async provision(dto, createdByUserId) {
        const role = await this.prisma.role.findUnique({
            where: { name: dto.role },
        });
        if (!role) {
            throw new common_1.BadRequestException(`Role ${dto.role} not found`);
        }
        if (isClientRole(dto.role) && !dto.clientId) {
            throw new common_1.BadRequestException('clientId is required when provisioning a client-facing user');
        }
        if (isCrmRole(dto.role)) {
            this.assertCrmScopeInput(dto.crmScopeClientIds ?? [], dto.crmIncludeInternal ?? false);
        }
        let clientId = null;
        if (dto.clientId) {
            const client = await this.prisma.client.findUnique({
                where: { id: dto.clientId },
                select: { id: true },
            });
            if (!client) {
                throw new common_1.NotFoundException('Client not found');
            }
            clientId = client.id;
        }
        const category = isClientRole(dto.role)
            ? client_1.UserCategory.CLIENT
            : client_1.UserCategory.MEMBER;
        const groupIds = category === client_1.UserCategory.CLIENT
            ? []
            : dto.userGroupIds?.length
                ? dto.userGroupIds
                : dto.userGroupId
                    ? [dto.userGroupId]
                    : [];
        for (const groupId of groupIds) {
            const group = await this.prisma.userGroup.findUnique({
                where: { id: groupId },
            });
            if (!group) {
                throw new common_1.NotFoundException('User group not found');
            }
        }
        const domain = dto.emailDomain?.trim().toLowerCase() ||
            this.configService.get('COMPANY_EMAIL_DOMAIN', 'atria.com');
        const email = dto.email?.trim().toLowerCase()
            ? dto.email.trim().toLowerCase()
            : await this.generateUniqueEmail(dto.name, domain);
        if (dto.email?.trim()) {
            const existing = await this.prisma.user.findFirst({
                where: { email },
            });
            if (existing) {
                throw new common_1.BadRequestException('Email already registered');
            }
        }
        const temporaryPassword = dto.password?.trim() || generateTemporaryPassword();
        const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);
        const monthlySalary = !isClientRole(dto.role) && dto.monthlySalary !== undefined
            ? new client_1.Prisma.Decimal(dto.monthlySalary)
            : null;
        const user = await this.prisma.user.create({
            data: {
                name: dto.name.trim(),
                email,
                passwordHash,
                temporaryPassword,
                roleId: role.id,
                category,
                clientId,
                avatarUrl: dto.avatarUrl?.trim() || null,
                userGroupId: groupIds[0] ?? null,
                monthlySalary,
                mustChangePassword: true,
                userGroups: groupIds.length
                    ? {
                        create: groupIds.map((userGroupId) => ({ userGroupId })),
                    }
                    : undefined,
            },
            include: {
                role: true,
                userGroup: true,
                userGroups: { include: { userGroup: true } },
                client: { select: { id: true, companyName: true } },
            },
        });
        if (monthlySalary && Number(monthlySalary) > 0) {
            await this.financeService.generateSalaryExpensesForEmployee({
                createdByUserId,
                employeeName: user.name,
                monthlySalary: Number(monthlySalary),
            });
        }
        if (isClientRole(dto.role)) {
            await this.ensureCompanyRepresentative(user.id, user.companyId);
        }
        if (isCrmRole(dto.role)) {
            await this.crmScope.replaceUserScopes(user.id, dto.crmScopeClientIds ?? [], dto.crmIncludeInternal ?? false);
        }
        const snapshot = await this.crmScope.getScopeSnapshot(user.id);
        return {
            user: this.toUserResponse(user, snapshot),
            credentials: {
                email,
                temporaryPassword,
            },
        };
    }
    async update(id, dto) {
        const existing = await this.prisma.user.findUnique({
            where: { id },
            include: {
                role: true,
                userGroup: true,
                userGroups: { include: { userGroup: true } },
                client: { select: { id: true, companyName: true } },
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException('User not found');
        }
        let roleId = existing.roleId;
        let nextRoleName = existing.role.name;
        if (dto.role) {
            const role = await this.prisma.role.findUnique({
                where: { name: dto.role },
            });
            if (!role) {
                throw new common_1.BadRequestException(`Role ${dto.role} not found`);
            }
            roleId = role.id;
            nextRoleName = role.name;
        }
        if (isCrmRole(nextRoleName)) {
            const snapshot = await this.crmScope.getScopeSnapshot(id);
            const scopeClientIds = dto.crmScopeClientIds ?? snapshot.clientIds;
            const includeInternal = dto.crmIncludeInternal ?? snapshot.includeInternal;
            this.assertCrmScopeInput(scopeClientIds, includeInternal);
        }
        const nextCategory = isClientRole(nextRoleName)
            ? client_1.UserCategory.CLIENT
            : client_1.UserCategory.MEMBER;
        const groupIds = nextCategory === client_1.UserCategory.CLIENT
            ? []
            : dto.userGroupIds ??
                (dto.userGroupId !== undefined
                    ? dto.userGroupId
                        ? [dto.userGroupId]
                        : []
                    : undefined);
        if (groupIds) {
            for (const groupId of groupIds) {
                const group = await this.prisma.userGroup.findUnique({
                    where: { id: groupId },
                });
                if (!group) {
                    throw new common_1.NotFoundException('User group not found');
                }
            }
        }
        let clientId = dto.clientId !== undefined ? dto.clientId : existing.clientId;
        if (nextCategory === client_1.UserCategory.CLIENT && !clientId) {
            throw new common_1.BadRequestException('clientId is required when category is CLIENT');
        }
        if (nextCategory === client_1.UserCategory.MEMBER && dto.role) {
            clientId = null;
        }
        if (dto.clientId) {
            const client = await this.prisma.client.findUnique({
                where: { id: dto.clientId },
                select: { id: true },
            });
            if (!client) {
                throw new common_1.NotFoundException('Client not found');
            }
        }
        if (dto.avatarUrl === null) {
            await this.deleteStoredAvatar(existing.avatarUrl);
        }
        const nextEmail = dto.email?.trim().toLowerCase();
        if (nextEmail && nextEmail !== existing.email.toLowerCase()) {
            const taken = await this.prisma.user.findFirst({
                where: { email: nextEmail, NOT: { id } },
            });
            if (taken) {
                throw new common_1.BadRequestException('Email already registered');
            }
        }
        const user = await this.prisma.$transaction(async (tx) => {
            if (groupIds) {
                await tx.userGroupMember.deleteMany({ where: { userId: id } });
                if (groupIds.length) {
                    await tx.userGroupMember.createMany({
                        data: groupIds.map((userGroupId) => ({ userId: id, userGroupId })),
                    });
                }
            }
            return tx.user.update({
                where: { id },
                data: {
                    email: nextEmail && nextEmail !== existing.email.toLowerCase()
                        ? nextEmail
                        : undefined,
                    userGroupId: nextCategory === client_1.UserCategory.CLIENT
                        ? null
                        : groupIds !== undefined
                            ? groupIds[0] ?? null
                            : dto.userGroupId === null
                                ? null
                                : dto.userGroupId !== undefined
                                    ? dto.userGroupId
                                    : undefined,
                    roleId,
                    category: nextCategory,
                    clientId,
                    avatarUrl: dto.avatarUrl === null
                        ? null
                        : dto.avatarUrl !== undefined
                            ? dto.avatarUrl.trim() || null
                            : undefined,
                    monthlySalary: nextCategory === client_1.UserCategory.CLIENT
                        ? null
                        : dto.monthlySalary === null
                            ? null
                            : dto.monthlySalary !== undefined
                                ? new client_1.Prisma.Decimal(dto.monthlySalary)
                                : undefined,
                },
                include: {
                    role: true,
                    userGroup: true,
                    userGroups: { include: { userGroup: true } },
                    client: { select: { id: true, companyName: true } },
                },
            });
        });
        if (isCrmRole(nextRoleName)) {
            if (dto.crmScopeClientIds !== undefined ||
                dto.crmIncludeInternal !== undefined ||
                dto.role === client_1.RoleName.CRM) {
                const snapshot = await this.crmScope.getScopeSnapshot(user.id);
                const scopeClientIds = dto.crmScopeClientIds ?? snapshot.clientIds;
                const includeInternal = dto.crmIncludeInternal ?? snapshot.includeInternal;
                await this.crmScope.replaceUserScopes(user.id, scopeClientIds, includeInternal);
            }
        }
        else {
            await this.crmScope.clearUserScopes(user.id);
        }
        return this.toUserResponse(user, await this.crmScope.getScopeSnapshot(user.id));
    }
    async uploadAvatar(id, file) {
        const existing = await this.prisma.user.findUnique({
            where: { id },
            select: { id: true, companyId: true, avatarUrl: true },
        });
        if (!existing) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!file.buffer?.length) {
            throw new common_1.BadRequestException('Arquivo obrigatório');
        }
        const companyId = existing.companyId ?? company_constants_1.DEFAULT_COMPANY_ID;
        const extension = this.resolveImageExtension(file);
        const objectPath = `${companyId}/${id}/${(0, crypto_1.randomUUID)()}${extension}`;
        const avatarUrl = await this.persistAvatarFile(objectPath, file);
        await this.deleteStoredAvatar(existing.avatarUrl);
        return this.updateAvatar(id, avatarUrl);
    }
    async removeAvatar(id) {
        return this.updateAvatar(id, null);
    }
    async deactivate(id) {
        const existing = await this.prisma.user.findUnique({
            where: { id },
            include: {
                role: true,
                userGroup: true,
                userGroups: { include: { userGroup: true } },
                client: { select: { id: true, companyName: true } },
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!existing.isActive) {
            return this.toUserResponse(existing);
        }
        const user = await this.prisma.$transaction(async (tx) => {
            await tx.authToken.deleteMany({ where: { userId: id } });
            return tx.user.update({
                where: { id },
                data: { isActive: false },
                include: {
                    role: true,
                    userGroup: true,
                    userGroups: { include: { userGroup: true } },
                    client: { select: { id: true, companyName: true } },
                },
            });
        });
        return this.toUserResponse(user);
    }
    async findRepresentatives() {
        const representatives = await this.prisma.companyRepresentative.findMany({
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            include: {
                user: {
                    include: {
                        role: true,
                        userGroup: true,
                        userGroups: { include: { userGroup: true } },
                        client: { select: { id: true, companyName: true } },
                    },
                },
            },
        });
        return representatives.map((entry) => ({
            id: entry.id,
            title: entry.title,
            isPrimary: entry.isPrimary,
            createdAt: entry.createdAt.toISOString(),
            updatedAt: entry.updatedAt.toISOString(),
            user: this.toUserResponse(entry.user),
        }));
    }
    async ensureCompanyRepresentative(userId, companyId) {
        await this.prisma.companyRepresentative.upsert({
            where: {
                companyId_userId: {
                    companyId,
                    userId,
                },
            },
            update: {},
            create: {
                companyId,
                userId,
                isPrimary: false,
            },
        });
    }
    async updateAvatar(id, avatarUrl) {
        const existing = await this.prisma.user.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!existing) {
            throw new common_1.NotFoundException('User not found');
        }
        if (avatarUrl === null) {
            const current = await this.prisma.user.findUnique({
                where: { id },
                select: { avatarUrl: true },
            });
            await this.deleteStoredAvatar(current?.avatarUrl ?? null);
        }
        const user = await this.prisma.user.update({
            where: { id },
            data: { avatarUrl },
            include: {
                role: true,
                userGroup: true,
                userGroups: { include: { userGroup: true } },
                client: { select: { id: true, companyName: true } },
            },
        });
        return this.toUserResponse(user);
    }
    async persistAvatarFile(objectPath, file) {
        if (this.storage.isConfigured) {
            return this.storage.uploadPublicObject({
                bucket: this.storage.getAvatarBucket(),
                path: objectPath,
                body: file.buffer,
                contentType: file.mimetype,
                upsert: true,
            });
        }
        if (!(0, fs_1.existsSync)(LOCAL_AVATAR_DIR)) {
            (0, fs_1.mkdirSync)(LOCAL_AVATAR_DIR, { recursive: true });
        }
        const filename = objectPath.replace(/\//g, '_');
        (0, fs_1.writeFileSync)((0, path_1.join)(LOCAL_AVATAR_DIR, filename), file.buffer);
        return `/uploads/avatars/${filename}`;
    }
    async deleteStoredAvatar(avatarUrl) {
        if (!avatarUrl)
            return;
        if (this.storage.isConfigured) {
            const bucket = this.storage.getAvatarBucket();
            const objectPath = this.storage.extractObjectPathFromPublicUrl(avatarUrl, bucket);
            if (objectPath) {
                try {
                    await this.storage.removeObject(bucket, objectPath);
                }
                catch {
                    return;
                }
            }
        }
    }
    resolveImageExtension(file) {
        const fromName = (0, path_1.extname)(file.originalname || '').toLowerCase();
        if (fromName && ['.png', '.jpg', '.jpeg', '.webp'].includes(fromName)) {
            return fromName === '.jpeg' ? '.jpg' : fromName;
        }
        switch (file.mimetype) {
            case 'image/png':
                return '.png';
            case 'image/webp':
                return '.webp';
            default:
                return '.jpg';
        }
    }
    assertCrmScopeInput(crmScopeClientIds, crmIncludeInternal) {
        if (!crmIncludeInternal && crmScopeClientIds.length === 0) {
            throw new common_1.BadRequestException('Usuários CRM precisam de escopo interno ou clientes vinculados.');
        }
    }
    snapshotFromRelations(scopes, assignmentOrganizationIds) {
        const clientIds = [
            ...(scopes
                ?.map((scope) => scope.clientId)
                .filter((id) => Boolean(id)) ?? []),
            ...(assignmentOrganizationIds ?? []),
        ];
        return {
            includeInternal: scopes?.some((scope) => scope.includeInternal) ?? false,
            clientIds: [...new Set(clientIds)],
        };
    }
    async generateUniqueEmail(name, domain) {
        const base = slugifyName(name);
        if (!base) {
            throw new common_1.BadRequestException('Unable to generate email from name');
        }
        let candidate = `${base}@${domain}`;
        let suffix = 1;
        while (await this.prisma.user.findFirst({ where: { email: candidate } })) {
            candidate = `${base}${suffix}@${domain}`;
            suffix += 1;
        }
        return candidate;
    }
    toUserResponse(user, crmScope) {
        const category = user.category ??
            (user.role?.name && isClientRole(user.role.name)
                ? client_1.UserCategory.CLIENT
                : client_1.UserCategory.MEMBER);
        const groups = category === client_1.UserCategory.CLIENT
            ? []
            : user.userGroups?.map((membership) => membership.userGroup) ??
                (user.userGroup ? [user.userGroup] : []);
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: (user.role?.name ?? client_1.RoleName.DESIGNER_JUNIOR).toLowerCase(),
            category: category.toLowerCase(),
            permissions: user.role?.permissions ?? [],
            avatarUrl: user.avatarUrl,
            clientId: user.clientId ?? null,
            client: user.client
                ? { id: user.client.id, companyName: user.client.companyName }
                : null,
            monthlySalary: user.monthlySalary ? Number(user.monthlySalary) : null,
            mustChangePassword: user.mustChangePassword,
            hasChangedPassword: !user.mustChangePassword,
            isActive: user.isActive ?? true,
            isFirstLogin: user.mustChangePassword,
            temporaryPassword: user.mustChangePassword
                ? user.temporaryPassword
                : null,
            userGroup: groups[0]
                ? {
                    id: groups[0].id,
                    name: groups[0].name,
                    description: groups[0].description,
                    color: groups[0].color,
                }
                : null,
            userGroups: groups.map((group) => ({
                id: group.id,
                name: group.name,
                description: group.description,
                color: group.color,
            })),
            ...(crmScope
                ? {
                    crmIncludeInternal: crmScope.includeInternal,
                    crmScopeClientIds: crmScope.clientIds,
                }
                : {
                    crmIncludeInternal: false,
                    crmScopeClientIds: [],
                }),
            createdAt: user.createdAt.toISOString(),
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        finance_service_1.FinanceService,
        supabase_storage_service_1.SupabaseStorageService,
        crm_scope_service_1.CrmScopeService])
], UsersService);
//# sourceMappingURL=users.service.js.map
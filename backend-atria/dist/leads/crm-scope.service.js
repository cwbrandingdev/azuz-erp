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
exports.CrmScopeService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const permissions_1 = require("../auth/constants/permissions");
const prisma_service_1 = require("../prisma/prisma.service");
const lead_pipeline_zones_1 = require("./lead-pipeline-zones");
let CrmScopeService = class CrmScopeService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getScopeSnapshot(userId) {
        const [scopes, assignments] = await Promise.all([
            this.prisma.userCrmScope.findMany({
                where: { userId },
                select: { clientId: true, includeInternal: true },
            }),
            this.prisma.crmSdrAssignment.findMany({
                where: { userId },
                select: { organizationId: true },
            }),
        ]);
        return {
            includeInternal: scopes.some((scope) => scope.includeInternal),
            clientIds: this.uniqueIds([
                ...scopes
                    .map((scope) => scope.clientId)
                    .filter((id) => Boolean(id)),
                ...assignments.map((assignment) => assignment.organizationId),
            ]),
        };
    }
    canAccessAllOrganizations(role) {
        const roleName = (0, permissions_1.normalizeRoleName)(role);
        return roleName === client_1.RoleName.MASTER || roleName === client_1.RoleName.ADMIN;
    }
    getMoveZone(role) {
        return (0, lead_pipeline_zones_1.resolveCrmMoveZone)(role);
    }
    crmEnabledLeadFilter() {
        return {
            OR: [
                { organizationId: null },
                {
                    organization: {
                        isActive: true,
                        hasCrmEnabled: true,
                    },
                },
            ],
        };
    }
    async buildLeadOrganizationFilter(user) {
        const enabledFilter = this.crmEnabledLeadFilter();
        if (this.canAccessAllOrganizations(user.role)) {
            return enabledFilter;
        }
        const roleName = (0, permissions_1.normalizeRoleName)(user.role);
        if (roleName === client_1.RoleName.EXTERNAL_CLIENT_CRM) {
            if (!user.clientId) {
                throw new common_1.ForbiddenException('Usuário sem organização vinculada não pode acessar leads do CRM.');
            }
            return this.mergeLeadFilters(enabledFilter, {
                organizationId: user.clientId,
            });
        }
        if (roleName === client_1.RoleName.CRM) {
            const scope = await this.getScopeSnapshot(user.userId);
            const conditions = [{ organizationId: null }];
            if (scope.clientIds.length > 0) {
                conditions.push({ organizationId: { in: scope.clientIds } });
            }
            return this.mergeLeadFilters(enabledFilter, { OR: conditions });
        }
        if (!user.clientId) {
            throw new common_1.ForbiddenException('Usuário sem organização vinculada não pode acessar leads do CRM.');
        }
        return this.mergeLeadFilters(enabledFilter, {
            organizationId: user.clientId,
        });
    }
    leadMatchesScope(lead, scope) {
        if (scope.includeInternal && lead.organizationId === null) {
            return true;
        }
        if (lead.organizationId && scope.clientIds.includes(lead.organizationId)) {
            return true;
        }
        return false;
    }
    async assertLeadAccess(user, lead) {
        if (lead.organizationId) {
            await this.assertOrganizationAllowsCrmAccess(lead.organizationId);
        }
        if (this.canAccessAllOrganizations(user.role)) {
            return;
        }
        const roleName = (0, permissions_1.normalizeRoleName)(user.role);
        if (roleName === client_1.RoleName.EXTERNAL_CLIENT_CRM) {
            if (!user.clientId || lead.organizationId !== user.clientId) {
                throw new common_1.ForbiddenException('Lead fora da organização do usuário.');
            }
            return;
        }
        if (roleName === client_1.RoleName.CRM) {
            if (lead.ownerUserId === user.userId) {
                return;
            }
            if (lead.kanbanTracked) {
                throw new common_1.ForbiddenException('Lead fora do escopo CRM do usuário.');
            }
            if (lead.organizationId === null) {
                return;
            }
            const scope = await this.getScopeSnapshot(user.userId);
            if (!this.leadMatchesScope(lead, scope)) {
                throw new common_1.ForbiddenException('Lead fora do escopo CRM do usuário.');
            }
            return;
        }
        if (!user.clientId || lead.organizationId !== user.clientId) {
            throw new common_1.ForbiddenException('Lead fora da organização do usuário.');
        }
    }
    async assertOrganizationAllowsLeadCreation(organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('organizationId is required');
        }
        const organization = await this.prisma.client.findUnique({
            where: { id: organizationId },
            select: { id: true, isActive: true, hasCrmEnabled: true },
        });
        if (!organization) {
            throw new common_1.NotFoundException('Organização não encontrada.');
        }
        if (!organization.isActive || !organization.hasCrmEnabled) {
            throw new common_1.BadRequestException('Esta organização não está habilitada para o CRM.');
        }
    }
    async assertUserCanManageOrganization(user, organizationId) {
        await this.assertOrganizationAllowsLeadCreation(organizationId);
        if (this.canAccessAllOrganizations(user.role)) {
            return;
        }
        const roleName = (0, permissions_1.normalizeRoleName)(user.role);
        if (roleName === client_1.RoleName.CRM) {
            const scope = await this.getScopeSnapshot(user.userId);
            if (!scope.clientIds.includes(organizationId)) {
                throw new common_1.ForbiddenException('Organização fora do escopo CRM do usuário.');
            }
            return;
        }
        if (roleName === client_1.RoleName.EXTERNAL_CLIENT_CRM) {
            if (user.clientId !== organizationId) {
                throw new common_1.ForbiddenException('Organização fora do escopo do usuário.');
            }
            return;
        }
        if (user.clientId !== organizationId) {
            throw new common_1.ForbiddenException('Organização fora do escopo do usuário.');
        }
    }
    async buildProspectingLeadOrganizationFilter(user, organizationId) {
        if (organizationId) {
            await this.assertUserCanManageOrganization(user, organizationId);
            return this.activeOrganizationLeadFilter(organizationId);
        }
        if (this.canAccessAllOrganizations(user.role)) {
            return this.crmEnabledLeadFilter();
        }
        const roleName = (0, permissions_1.normalizeRoleName)(user.role);
        if (roleName === client_1.RoleName.CRM) {
            const scope = await this.getScopeSnapshot(user.userId);
            const conditions = [{ organizationId: null }];
            if (scope.clientIds.length > 0) {
                conditions.push({
                    organizationId: { in: scope.clientIds },
                    organization: {
                        isActive: true,
                        hasCrmEnabled: true,
                    },
                });
            }
            return { OR: conditions };
        }
        if (roleName === client_1.RoleName.EXTERNAL_CLIENT_CRM) {
            if (!user.clientId) {
                throw new common_1.ForbiddenException('Usuário sem organização vinculada não pode acessar leads do CRM.');
            }
            return this.activeOrganizationLeadFilter(user.clientId);
        }
        if (!user.clientId) {
            throw new common_1.ForbiddenException('Usuário sem organização vinculada não pode acessar leads do CRM.');
        }
        return this.activeOrganizationLeadFilter(user.clientId);
    }
    async buildKanbanLeadOrganizationFilter(user, organizationId) {
        const roleName = (0, permissions_1.normalizeRoleName)(user.role);
        if (roleName === client_1.RoleName.CRM) {
            if (organizationId) {
                await this.assertOrganizationAllowsLeadCreation(organizationId);
                return this.activeOrganizationLeadFilter(organizationId);
            }
            return {};
        }
        if (this.canAccessAllOrganizations(user.role)) {
            if (organizationId) {
                await this.assertOrganizationAllowsLeadCreation(organizationId);
                return this.activeOrganizationLeadFilter(organizationId);
            }
            return this.activeOrganizationLeadFilter();
        }
        return this.buildProspectingLeadOrganizationFilter(user, organizationId);
    }
    buildKanbanOwnerFilter(user, ownerUserId) {
        if ((0, permissions_1.normalizeRoleName)(user.role) === client_1.RoleName.CRM) {
            return { ownerUserId: user.userId };
        }
        if (ownerUserId) {
            return { ownerUserId };
        }
        return {};
    }
    buildOwnedOrSharedLeadFilter(user, organizationFilter) {
        if ((0, permissions_1.normalizeRoleName)(user.role) !== client_1.RoleName.CRM) {
            return organizationFilter;
        }
        return {
            OR: [
                { ownerUserId: user.userId },
                this.mergeLeadFilters(organizationFilter, { kanbanTracked: false }),
            ],
        };
    }
    async resolveOwnerFilter(user, requestedOwnerUserId) {
        if (!this.canAccessAllOrganizations(user.role)) {
            return undefined;
        }
        const ownerUserId = requestedOwnerUserId?.trim();
        if (!ownerUserId) {
            return undefined;
        }
        await this.assertSdrUsers([ownerUserId]);
        return ownerUserId;
    }
    async resolveLeadOwnerUserId(user, requestedOwnerUserId) {
        const roleName = (0, permissions_1.normalizeRoleName)(user.role);
        if (roleName === client_1.RoleName.CRM) {
            return user.userId;
        }
        if (!this.canAccessAllOrganizations(user.role)) {
            if (requestedOwnerUserId?.trim()) {
                throw new common_1.ForbiddenException('Apenas Master ou Admin podem definir o responsável.');
            }
            return null;
        }
        const ownerUserId = requestedOwnerUserId?.trim();
        if (!ownerUserId) {
            throw new common_1.BadRequestException('Selecione o responsável pelo lead.');
        }
        await this.assertSdrUsers([ownerUserId]);
        return ownerUserId;
    }
    async listActiveCrmUsers() {
        return this.prisma.user.findMany({
            where: { isActive: true, role: { name: client_1.RoleName.CRM } },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });
    }
    async replaceUserScopes(userId, crmScopeClientIds, crmIncludeInternal) {
        const clientIds = this.uniqueIds(crmScopeClientIds);
        await this.assertClientsExist(clientIds);
        await this.prisma.$transaction(async (tx) => {
            await tx.userCrmScope.deleteMany({ where: { userId } });
            await tx.crmSdrAssignment.deleteMany({ where: { userId } });
            const scopeRows = [];
            if (crmIncludeInternal) {
                scopeRows.push({ userId, includeInternal: true, clientId: null });
            }
            for (const clientId of clientIds) {
                scopeRows.push({ userId, includeInternal: false, clientId });
            }
            if (scopeRows.length > 0) {
                await tx.userCrmScope.createMany({ data: scopeRows });
            }
            if (clientIds.length > 0) {
                await tx.crmSdrAssignment.createMany({
                    data: clientIds.map((organizationId) => ({
                        userId,
                        organizationId,
                    })),
                });
            }
        });
    }
    async clearUserScopes(userId) {
        await this.prisma.$transaction([
            this.prisma.userCrmScope.deleteMany({ where: { userId } }),
            this.prisma.crmSdrAssignment.deleteMany({ where: { userId } }),
        ]);
    }
    async replaceOrganizationSdrAssignments(organizationId, sdrUserIds) {
        const uniqueUserIds = this.uniqueIds(sdrUserIds);
        await this.assertSdrUsers(uniqueUserIds);
        await this.prisma.$transaction(async (tx) => {
            await tx.crmSdrAssignment.deleteMany({ where: { organizationId } });
            await tx.userCrmScope.deleteMany({
                where: {
                    clientId: organizationId,
                    ...(uniqueUserIds.length > 0
                        ? { userId: { notIn: uniqueUserIds } }
                        : {}),
                },
            });
            if (uniqueUserIds.length === 0) {
                return;
            }
            await tx.crmSdrAssignment.createMany({
                data: uniqueUserIds.map((userId) => ({
                    organizationId,
                    userId,
                })),
            });
            const existingScopes = await tx.userCrmScope.findMany({
                where: {
                    clientId: organizationId,
                    userId: { in: uniqueUserIds },
                },
                select: { userId: true },
            });
            const existingUserIds = new Set(existingScopes.map((scope) => scope.userId));
            const missingUserIds = uniqueUserIds.filter((userId) => !existingUserIds.has(userId));
            if (missingUserIds.length > 0) {
                await tx.userCrmScope.createMany({
                    data: missingUserIds.map((userId) => ({
                        userId,
                        clientId: organizationId,
                        includeInternal: false,
                    })),
                });
            }
        });
    }
    async listAssignedOrganizations(user) {
        if (this.canAccessAllOrganizations(user.role)) {
            return this.prisma.client.findMany({
                where: { isActive: true, hasCrmEnabled: true },
                orderBy: { companyName: 'asc' },
                select: {
                    id: true,
                    companyName: true,
                    isActive: true,
                    hasCrmEnabled: true,
                },
            });
        }
        const scope = await this.getScopeSnapshot(user.userId);
        if (scope.clientIds.length === 0) {
            return [];
        }
        return this.prisma.client.findMany({
            where: {
                id: { in: scope.clientIds },
                isActive: true,
                hasCrmEnabled: true,
            },
            orderBy: { companyName: 'asc' },
            select: {
                id: true,
                companyName: true,
                isActive: true,
                hasCrmEnabled: true,
            },
        });
    }
    async getSdrAssignedOrganizationIds(userId) {
        const assignments = await this.prisma.crmSdrAssignment.findMany({
            where: { userId },
            select: { organizationId: true },
        });
        return this.uniqueIds(assignments.map((assignment) => assignment.organizationId));
    }
    activeOrganizationLeadFilter(organizationId) {
        if (organizationId) {
            return {
                organizationId,
                organization: {
                    isActive: true,
                    hasCrmEnabled: true,
                },
            };
        }
        return {
            organizationId: { not: null },
            organization: {
                isActive: true,
                hasCrmEnabled: true,
            },
        };
    }
    async assertOrganizationCrmEnabled(organizationId) {
        await this.assertOrganizationAllowsCrmAccess(organizationId);
    }
    async assertOrganizationAllowsCrmAccess(organizationId) {
        const organization = await this.prisma.client.findUnique({
            where: { id: organizationId },
            select: { id: true, isActive: true, hasCrmEnabled: true },
        });
        if (!organization) {
            throw new common_1.NotFoundException('Organização não encontrada.');
        }
        if (!organization.isActive || !organization.hasCrmEnabled) {
            throw new common_1.ForbiddenException('CRM desabilitado para esta organização.');
        }
    }
    async assertClientsExist(clientIds) {
        if (clientIds.length === 0) {
            return;
        }
        const clients = await this.prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true },
        });
        if (clients.length !== clientIds.length) {
            throw new common_1.NotFoundException('Client not found');
        }
    }
    async assertSdrUsers(userIds) {
        if (userIds.length === 0) {
            return;
        }
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds }, isActive: true },
            select: { id: true, role: { select: { name: true } } },
        });
        if (users.length !== userIds.length) {
            throw new common_1.BadRequestException('Um ou mais SDRs informados são inválidos ou inativos.');
        }
        const invalid = users.filter((user) => user.role.name !== client_1.RoleName.CRM);
        if (invalid.length > 0) {
            throw new common_1.BadRequestException('Apenas usuários com papel CRM podem ser atribuídos como SDR.');
        }
    }
    mergeLeadFilters(...filters) {
        const defined = filters.filter((filter) => Object.keys(filter).length > 0);
        if (defined.length === 0) {
            return {};
        }
        if (defined.length === 1) {
            return defined[0];
        }
        return { AND: defined };
    }
    uniqueIds(ids) {
        return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    }
};
exports.CrmScopeService = CrmScopeService;
exports.CrmScopeService = CrmScopeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmScopeService);
//# sourceMappingURL=crm-scope.service.js.map
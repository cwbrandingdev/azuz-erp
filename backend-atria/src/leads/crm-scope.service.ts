import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { normalizeRoleName } from '../auth/constants/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { resolveCrmMoveZone, type CrmMoveZone } from './lead-pipeline-zones';

export interface UserCrmScopeSnapshot {
  includeInternal: boolean;
  clientIds: string[];
}

export interface AssignedOrganizationResponse {
  id: string;
  companyName: string;
  isActive: boolean;
  hasCrmEnabled: boolean;
}

@Injectable()
export class CrmScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async getScopeSnapshot(userId: string): Promise<UserCrmScopeSnapshot> {
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
          .filter((id): id is string => Boolean(id)),
        ...assignments.map((assignment) => assignment.organizationId),
      ]),
    };
  }

  canAccessAllOrganizations(role: string): boolean {
    const roleName = normalizeRoleName(role);
    return roleName === RoleName.MASTER || roleName === RoleName.ADMIN;
  }

  getMoveZone(role: string): CrmMoveZone {
    return resolveCrmMoveZone(role);
  }

  crmEnabledLeadFilter(): Prisma.LeadWhereInput {
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

  async buildLeadOrganizationFilter(
    user: AuthenticatedUser,
  ): Promise<Prisma.LeadWhereInput> {
    const enabledFilter = this.crmEnabledLeadFilter();

    if (this.canAccessAllOrganizations(user.role)) {
      return enabledFilter;
    }

    const roleName = normalizeRoleName(user.role);

    if (roleName === RoleName.EXTERNAL_CLIENT_CRM) {
      if (!user.clientId) {
        throw new ForbiddenException(
          'Usuário sem organização vinculada não pode acessar leads do CRM.',
        );
      }
      return this.mergeLeadFilters(enabledFilter, {
        organizationId: user.clientId,
      });
    }

    if (roleName === RoleName.CRM) {
      const scope = await this.getScopeSnapshot(user.userId);
      const conditions: Prisma.LeadWhereInput[] = [{ organizationId: null }];

      if (scope.clientIds.length > 0) {
        conditions.push({ organizationId: { in: scope.clientIds } });
      }

      return this.mergeLeadFilters(enabledFilter, { OR: conditions });
    }

    if (!user.clientId) {
      throw new ForbiddenException(
        'Usuário sem organização vinculada não pode acessar leads do CRM.',
      );
    }

    return this.mergeLeadFilters(enabledFilter, {
      organizationId: user.clientId,
    });
  }

  leadMatchesScope(
    lead: { organizationId: string | null },
    scope: UserCrmScopeSnapshot,
  ): boolean {
    if (scope.includeInternal && lead.organizationId === null) {
      return true;
    }

    if (lead.organizationId && scope.clientIds.includes(lead.organizationId)) {
      return true;
    }

    return false;
  }

  async assertLeadAccess(
    user: AuthenticatedUser,
    lead: {
      organizationId: string | null;
      ownerUserId?: string | null;
      kanbanTracked?: boolean;
    },
  ): Promise<void> {
    if (lead.organizationId) {
      await this.assertOrganizationAllowsCrmAccess(lead.organizationId);
    }

    if (this.canAccessAllOrganizations(user.role)) {
      return;
    }

    const roleName = normalizeRoleName(user.role);

    if (roleName === RoleName.EXTERNAL_CLIENT_CRM) {
      if (!user.clientId || lead.organizationId !== user.clientId) {
        throw new ForbiddenException('Lead fora da organização do usuário.');
      }
      return;
    }

    if (roleName === RoleName.CRM) {
      if (lead.ownerUserId === user.userId) {
        return;
      }

      if (lead.kanbanTracked) {
        throw new ForbiddenException('Lead fora do escopo CRM do usuário.');
      }

      if (lead.organizationId === null) {
        return;
      }

      const scope = await this.getScopeSnapshot(user.userId);
      if (!this.leadMatchesScope(lead, scope)) {
        throw new ForbiddenException('Lead fora do escopo CRM do usuário.');
      }
      return;
    }

    if (!user.clientId || lead.organizationId !== user.clientId) {
      throw new ForbiddenException('Lead fora da organização do usuário.');
    }
  }

  async assertOrganizationAllowsLeadCreation(
    organizationId: string | null | undefined,
  ): Promise<void> {
    if (!organizationId) {
      throw new BadRequestException('organizationId is required');
    }

    const organization = await this.prisma.client.findUnique({
      where: { id: organizationId },
      select: { id: true, isActive: true, hasCrmEnabled: true },
    });

    if (!organization) {
      throw new NotFoundException('Organização não encontrada.');
    }

    if (!organization.isActive || !organization.hasCrmEnabled) {
      throw new BadRequestException(
        'Esta organização não está habilitada para o CRM.',
      );
    }
  }

  async assertUserCanManageOrganization(
    user: AuthenticatedUser,
    organizationId: string,
  ): Promise<void> {
    await this.assertOrganizationAllowsLeadCreation(organizationId);

    if (this.canAccessAllOrganizations(user.role)) {
      return;
    }

    const roleName = normalizeRoleName(user.role);

    if (roleName === RoleName.CRM) {
      const scope = await this.getScopeSnapshot(user.userId);
      if (!scope.clientIds.includes(organizationId)) {
        throw new ForbiddenException(
          'Organização fora do escopo CRM do usuário.',
        );
      }
      return;
    }

    if (roleName === RoleName.EXTERNAL_CLIENT_CRM) {
      if (user.clientId !== organizationId) {
        throw new ForbiddenException('Organização fora do escopo do usuário.');
      }
      return;
    }

    if (user.clientId !== organizationId) {
      throw new ForbiddenException('Organização fora do escopo do usuário.');
    }
  }

  async buildProspectingLeadOrganizationFilter(
    user: AuthenticatedUser,
    organizationId?: string,
  ): Promise<Prisma.LeadWhereInput> {
    if (organizationId) {
      await this.assertUserCanManageOrganization(user, organizationId);
      return this.activeOrganizationLeadFilter(organizationId);
    }

    if (this.canAccessAllOrganizations(user.role)) {
      return this.crmEnabledLeadFilter();
    }

    const roleName = normalizeRoleName(user.role);

    if (roleName === RoleName.CRM) {
      const scope = await this.getScopeSnapshot(user.userId);
      const conditions: Prisma.LeadWhereInput[] = [{ organizationId: null }];

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

    if (roleName === RoleName.EXTERNAL_CLIENT_CRM) {
      if (!user.clientId) {
        throw new ForbiddenException(
          'Usuário sem organização vinculada não pode acessar leads do CRM.',
        );
      }
      return this.activeOrganizationLeadFilter(user.clientId);
    }

    if (!user.clientId) {
      throw new ForbiddenException(
        'Usuário sem organização vinculada não pode acessar leads do CRM.',
      );
    }

    return this.activeOrganizationLeadFilter(user.clientId);
  }

  async buildKanbanLeadOrganizationFilter(
    user: AuthenticatedUser,
    organizationId?: string,
  ): Promise<Prisma.LeadWhereInput> {
    const roleName = normalizeRoleName(user.role);

    if (roleName === RoleName.CRM) {
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

  /**
   * CRM users only see leads they own. Master and Admin can narrow by person.
   * A lead the user owns stays visible even when its company is outside their
   * SDR assignments.
   */
  buildKanbanOwnerFilter(
    user: AuthenticatedUser,
    ownerUserId?: string,
  ): Prisma.LeadWhereInput {
    if (normalizeRoleName(user.role) === RoleName.CRM) {
      return { ownerUserId: user.userId };
    }

    if (ownerUserId) {
      return { ownerUserId };
    }

    return {};
  }

  buildOwnedOrSharedLeadFilter(
    user: AuthenticatedUser,
    organizationFilter: Prisma.LeadWhereInput,
  ): Prisma.LeadWhereInput {
    if (normalizeRoleName(user.role) !== RoleName.CRM) {
      return organizationFilter;
    }

    return {
      OR: [
        { ownerUserId: user.userId },
        this.mergeLeadFilters(organizationFilter, { kanbanTracked: false }),
      ],
    };
  }

  async resolveOwnerFilter(
    user: AuthenticatedUser,
    requestedOwnerUserId?: string | null,
  ): Promise<string | undefined> {
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

  async resolveLeadOwnerUserId(
    user: AuthenticatedUser,
    requestedOwnerUserId?: string | null,
  ): Promise<string | null> {
    const roleName = normalizeRoleName(user.role);

    if (roleName === RoleName.CRM) {
      return user.userId;
    }

    if (!this.canAccessAllOrganizations(user.role)) {
      if (requestedOwnerUserId?.trim()) {
        throw new ForbiddenException(
          'Apenas Master ou Admin podem definir o responsável.',
        );
      }
      return null;
    }

    const ownerUserId = requestedOwnerUserId?.trim();
    if (!ownerUserId) {
      throw new BadRequestException('Selecione o responsável pelo lead.');
    }

    await this.assertSdrUsers([ownerUserId]);
    return ownerUserId;
  }

  async listActiveCrmUsers(): Promise<{ id: string; name: string }[]> {
    return this.prisma.user.findMany({
      where: { isActive: true, role: { name: RoleName.CRM } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async replaceUserScopes(
    userId: string,
    crmScopeClientIds: string[],
    crmIncludeInternal: boolean,
  ): Promise<void> {
    const clientIds = this.uniqueIds(crmScopeClientIds);
    await this.assertClientsExist(clientIds);

    await this.prisma.$transaction(async (tx) => {
      await tx.userCrmScope.deleteMany({ where: { userId } });
      await tx.crmSdrAssignment.deleteMany({ where: { userId } });

      const scopeRows: Prisma.UserCrmScopeCreateManyInput[] = [];
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

  async clearUserScopes(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userCrmScope.deleteMany({ where: { userId } }),
      this.prisma.crmSdrAssignment.deleteMany({ where: { userId } }),
    ]);
  }

  async replaceOrganizationSdrAssignments(
    organizationId: string,
    sdrUserIds: string[],
  ): Promise<void> {
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
      const existingUserIds = new Set(
        existingScopes.map((scope) => scope.userId),
      );
      const missingUserIds = uniqueUserIds.filter(
        (userId) => !existingUserIds.has(userId),
      );

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

  async listAssignedOrganizations(
    user: AuthenticatedUser,
  ): Promise<AssignedOrganizationResponse[]> {
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

  private async getSdrAssignedOrganizationIds(
    userId: string,
  ): Promise<string[]> {
    const assignments = await this.prisma.crmSdrAssignment.findMany({
      where: { userId },
      select: { organizationId: true },
    });

    return this.uniqueIds(
      assignments.map((assignment) => assignment.organizationId),
    );
  }

  private activeOrganizationLeadFilter(
    organizationId?: string,
  ): Prisma.LeadWhereInput {
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

  async assertOrganizationCrmEnabled(organizationId: string): Promise<void> {
    await this.assertOrganizationAllowsCrmAccess(organizationId);
  }

  private async assertOrganizationAllowsCrmAccess(
    organizationId: string,
  ): Promise<void> {
    const organization = await this.prisma.client.findUnique({
      where: { id: organizationId },
      select: { id: true, isActive: true, hasCrmEnabled: true },
    });

    if (!organization) {
      throw new NotFoundException('Organização não encontrada.');
    }

    if (!organization.isActive || !organization.hasCrmEnabled) {
      throw new ForbiddenException('CRM desabilitado para esta organização.');
    }
  }

  private async assertClientsExist(clientIds: string[]): Promise<void> {
    if (clientIds.length === 0) {
      return;
    }

    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true },
    });

    if (clients.length !== clientIds.length) {
      throw new NotFoundException('Client not found');
    }
  }

  private async assertSdrUsers(userIds: string[]): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true, role: { select: { name: true } } },
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException(
        'Um ou mais SDRs informados são inválidos ou inativos.',
      );
    }

    const invalid = users.filter((user) => user.role.name !== RoleName.CRM);
    if (invalid.length > 0) {
      throw new BadRequestException(
        'Apenas usuários com papel CRM podem ser atribuídos como SDR.',
      );
    }
  }

  private mergeLeadFilters(
    ...filters: Prisma.LeadWhereInput[]
  ): Prisma.LeadWhereInput {
    const defined = filters.filter((filter) => Object.keys(filter).length > 0);
    if (defined.length === 0) {
      return {};
    }
    if (defined.length === 1) {
      return defined[0];
    }
    return { AND: defined };
  }

  private uniqueIds(ids: string[]): string[] {
    return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  }
}

import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { type CrmMoveZone } from './lead-pipeline-zones';
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
export declare class CrmScopeService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getScopeSnapshot(userId: string): Promise<UserCrmScopeSnapshot>;
    canAccessAllOrganizations(role: string): boolean;
    getMoveZone(role: string): CrmMoveZone;
    crmEnabledLeadFilter(): Prisma.LeadWhereInput;
    buildLeadOrganizationFilter(user: AuthenticatedUser): Promise<Prisma.LeadWhereInput>;
    leadMatchesScope(lead: {
        organizationId: string | null;
    }, scope: UserCrmScopeSnapshot): boolean;
    assertLeadAccess(user: AuthenticatedUser, lead: {
        organizationId: string | null;
        ownerUserId?: string | null;
        kanbanTracked?: boolean;
    }): Promise<void>;
    assertOrganizationAllowsLeadCreation(organizationId: string | null | undefined): Promise<void>;
    assertUserCanManageOrganization(user: AuthenticatedUser, organizationId: string): Promise<void>;
    buildProspectingLeadOrganizationFilter(user: AuthenticatedUser, organizationId?: string): Promise<Prisma.LeadWhereInput>;
    buildKanbanLeadOrganizationFilter(user: AuthenticatedUser, organizationId?: string): Promise<Prisma.LeadWhereInput>;
    buildKanbanOwnerFilter(user: AuthenticatedUser, ownerUserId?: string): Prisma.LeadWhereInput;
    buildOwnedOrSharedLeadFilter(user: AuthenticatedUser, organizationFilter: Prisma.LeadWhereInput): Prisma.LeadWhereInput;
    resolveOwnerFilter(user: AuthenticatedUser, requestedOwnerUserId?: string | null): Promise<string | undefined>;
    resolveLeadOwnerUserId(user: AuthenticatedUser, requestedOwnerUserId?: string | null): Promise<string | null>;
    listActiveCrmUsers(): Promise<{
        id: string;
        name: string;
    }[]>;
    replaceUserScopes(userId: string, crmScopeClientIds: string[], crmIncludeInternal: boolean): Promise<void>;
    clearUserScopes(userId: string): Promise<void>;
    replaceOrganizationSdrAssignments(organizationId: string, sdrUserIds: string[]): Promise<void>;
    listAssignedOrganizations(user: AuthenticatedUser): Promise<AssignedOrganizationResponse[]>;
    private getSdrAssignedOrganizationIds;
    private activeOrganizationLeadFilter;
    assertOrganizationCrmEnabled(organizationId: string): Promise<void>;
    private assertOrganizationAllowsCrmAccess;
    private assertClientsExist;
    private assertSdrUsers;
    private mergeLeadFilters;
    private uniqueIds;
}

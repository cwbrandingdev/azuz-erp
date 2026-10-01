import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CrmScopeService } from '../leads/crm-scope.service';
import { CreateLeadStageDto, LeadStagesQueryDto, ReorderLeadStagesDto, UpdateLeadStageDto } from '../leads/dto/lead-stage.dto';
import { LeadStagesService } from '../leads/lead-stages.service';
export declare class CrmStagesController {
    private readonly leadStagesService;
    private readonly crmScope;
    constructor(leadStagesService: LeadStagesService, crmScope: CrmScopeService);
    findAll(user: AuthenticatedUser, query: LeadStagesQueryDto): Promise<{
        id: string;
        tenantId: string;
        companyId: string;
        organizationId: string | null;
        name: string;
        order: number;
        color: string;
        key: string | null;
        createdAt: string;
        updatedAt: string;
    }[]>;
    create(user: AuthenticatedUser, dto: CreateLeadStageDto): Promise<{
        id: string;
        tenantId: string;
        companyId: string;
        organizationId: string | null;
        name: string;
        order: number;
        color: string;
        key: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
    reorder(user: AuthenticatedUser, dto: ReorderLeadStagesDto): Promise<{
        id: string;
        tenantId: string;
        companyId: string;
        organizationId: string | null;
        name: string;
        order: number;
        color: string;
        key: string | null;
        createdAt: string;
        updatedAt: string;
    }[]>;
    update(user: AuthenticatedUser, id: string, dto: UpdateLeadStageDto): Promise<{
        id: string;
        tenantId: string;
        companyId: string;
        organizationId: string | null;
        name: string;
        order: number;
        color: string;
        key: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
    remove(user: AuthenticatedUser, id: string): Promise<{
        success: boolean;
    }>;
    private assertOrganizationAccess;
    private assertStageOrganizationAccess;
}

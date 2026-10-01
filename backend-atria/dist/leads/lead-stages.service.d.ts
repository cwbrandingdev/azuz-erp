import { LeadStage, LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadStageDto, ReorderLeadStagesDto, UpdateLeadStageDto } from './dto/lead-stage.dto';
export declare class LeadStagesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId?: string | null): Promise<{
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
    getById(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        name: string;
        order: number;
        color: string;
        organizationId: string | null;
        key: string | null;
    }>;
    create(dto: CreateLeadStageDto): Promise<{
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
    update(id: string, dto: UpdateLeadStageDto): Promise<{
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
    reorder(dto: ReorderLeadStagesDto): Promise<{
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
    remove(id: string): Promise<{
        success: boolean;
    }>;
    ensureDefaults(organizationId?: string | null): Promise<LeadStage[]>;
    resolveStage(input?: {
        stageId?: string | null;
        status?: string | null;
        organizationId?: string | null;
    }): Promise<LeadStage>;
    statusFromStage(stage: LeadStage): LeadStatus;
    toResponse(stage: LeadStage): {
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
    };
    private ensureGlobalDefaults;
    private ensureOrganizationDefaults;
    private remapLeadsToClonedStages;
    private mapStageIntoScope;
    private requireStage;
    private assertUniqueName;
    private normalizeOrder;
    private findScoped;
    private scopeWhere;
    private normalizeOrganizationId;
    private isLeadStatus;
    private reconcileBuiltinStages;
}

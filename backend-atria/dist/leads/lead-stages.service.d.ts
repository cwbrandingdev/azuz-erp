import { LeadStage, LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadStageDto, ReorderLeadStagesDto, UpdateLeadStageDto } from './dto/lead-stage.dto';
export declare class LeadStagesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        tenantId: string;
        companyId: string;
        name: string;
        order: number;
        color: string;
        key: string | null;
        createdAt: string;
        updatedAt: string;
    }[]>;
    create(dto: CreateLeadStageDto): Promise<{
        id: string;
        tenantId: string;
        companyId: string;
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
    ensureDefaults(): Promise<LeadStage[]>;
    resolveStage(stageId?: string | null): Promise<LeadStage>;
    statusFromStage(stage: LeadStage): LeadStatus;
    toResponse(stage: LeadStage): {
        id: string;
        tenantId: string;
        companyId: string;
        name: string;
        order: number;
        color: string;
        key: string | null;
        createdAt: string;
        updatedAt: string;
    };
    private requireStage;
    private assertUniqueName;
    private normalizeOrder;
    private isLeadStatus;
    private reconcileBuiltinStages;
}

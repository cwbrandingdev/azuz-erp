import { RoleName } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProductivityDto } from './dto/query-productivity.dto';
export interface ProductivityRow {
    userId: string;
    name: string;
    avatarUrl: string | null;
    role: RoleName;
    calls: number;
    callMinutes: number;
    messagesSent: number;
    leadsOnKanban: number;
    meetings: number;
    stageMoves: number;
    tasksCreated: number;
    uploads: number;
    tasksCompleted: number;
    comments: number;
    internalApprovals: number;
    internalRejections: number;
    clientApprovals: number;
    clientAdjustments: number;
}
export interface ProductivityReport {
    from: string | null;
    to: string | null;
    rows: ProductivityRow[];
}
export declare class ProductivityService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getReport(user: AuthenticatedUser, query: QueryProductivityDto): Promise<ProductivityReport>;
    private canSeeEveryone;
    private parseRoleFilter;
    private dateRange;
    private toMinutes;
    private countBy;
    private countPortalOutcomes;
}

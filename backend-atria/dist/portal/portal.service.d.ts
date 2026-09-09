import { Prisma } from '@prisma/client';
import { AssetsService } from '../assets/assets.service';
import { ContractsService } from '../contracts/contracts.service';
import { FinanceService } from '../finance/finance.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { KanbanService } from '../kanban/kanban.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SlaService } from '../sla/sla.service';
import { PortalBriefingDto, PortalRejectPostDto } from './dto/portal.dto';
export declare class PortalService {
    private readonly prisma;
    private readonly contractsService;
    private readonly assetsService;
    private readonly notifications;
    private readonly integrations;
    private readonly slaService;
    private readonly financeService;
    private readonly kanbanService;
    constructor(prisma: PrismaService, contractsService: ContractsService, assetsService: AssetsService, notifications: NotificationsService, integrations: IntegrationsService, slaService: SlaService, financeService: FinanceService, kanbanService: KanbanService);
    generatePortalToken(clientId: string): Promise<{
        clientId: string;
        companyName: string;
        token: string;
        portalUrl: string;
    }>;
    getPortalData(rawToken: string): Promise<{
        client: {
            id: string;
            companyName: string;
            contactName: string | null;
            email: string | null;
            instagram: string | null;
            avatarUrl: string | null;
            isActive: boolean;
            hasCrmEnabled: boolean;
        };
        accountStatus: {
            activeContracts: number;
            pendingApprovals: number;
            scheduledPosts: number;
            publishedPosts: number;
            status: "active" | "onboarding";
        };
        pendingApprovalPosts: {
            id: string;
            title: string;
            platform: string;
            format: string;
            scheduledDate: string | null;
            status: string;
            copy: string | undefined;
            attachments: {
                id: string;
                name: string;
                url: string;
                mimeType: string | null;
            }[] | undefined;
        }[];
        scheduledPosts: {
            id: string;
            title: string;
            platform: string;
            format: string;
            scheduledDate: string | null;
            status: string;
            copy: string | undefined;
            attachments: {
                id: string;
                name: string;
                url: string;
                mimeType: string | null;
            }[] | undefined;
        }[];
        contentPipeline: {
            updatedAt: string;
            latestFeedback: {
                comment: string;
                createdAt: string;
            } | null;
            id: string;
            title: string;
            platform: string;
            format: string;
            scheduledDate: string | null;
            status: string;
            copy: string | undefined;
            attachments: {
                id: string;
                name: string;
                url: string;
                mimeType: string | null;
            }[] | undefined;
        }[];
        recentReports: {
            id: string;
            title: string;
            month: number;
            year: number;
            periodLabel: string;
            createdAt: string;
        }[];
        contracts: {
            id: string;
            title: string;
            status: string;
            recurringValue: number;
            paymentFrequency: string;
            startDate: string;
            endDate: string | null;
            pdfUrl: string | null;
            hasTerms: boolean;
        }[];
        recentBriefs: {
            id: string;
            title: string;
            content: string;
            createdAt: string;
        }[];
    }>;
    getPortalDataForClient(clientId: string): Promise<{
        client: {
            id: string;
            companyName: string;
            contactName: string | null;
            email: string | null;
            instagram: string | null;
            avatarUrl: string | null;
            isActive: boolean;
            hasCrmEnabled: boolean;
        };
        accountStatus: {
            activeContracts: number;
            pendingApprovals: number;
            scheduledPosts: number;
            publishedPosts: number;
            status: "active" | "onboarding";
        };
        pendingApprovalPosts: {
            id: string;
            title: string;
            platform: string;
            format: string;
            scheduledDate: string | null;
            status: string;
            copy: string | undefined;
            attachments: {
                id: string;
                name: string;
                url: string;
                mimeType: string | null;
            }[] | undefined;
        }[];
        scheduledPosts: {
            id: string;
            title: string;
            platform: string;
            format: string;
            scheduledDate: string | null;
            status: string;
            copy: string | undefined;
            attachments: {
                id: string;
                name: string;
                url: string;
                mimeType: string | null;
            }[] | undefined;
        }[];
        contentPipeline: {
            updatedAt: string;
            latestFeedback: {
                comment: string;
                createdAt: string;
            } | null;
            id: string;
            title: string;
            platform: string;
            format: string;
            scheduledDate: string | null;
            status: string;
            copy: string | undefined;
            attachments: {
                id: string;
                name: string;
                url: string;
                mimeType: string | null;
            }[] | undefined;
        }[];
        recentReports: {
            id: string;
            title: string;
            month: number;
            year: number;
            periodLabel: string;
            createdAt: string;
        }[];
        contracts: {
            id: string;
            title: string;
            status: string;
            recurringValue: number;
            paymentFrequency: string;
            startDate: string;
            endDate: string | null;
            pdfUrl: string | null;
            hasTerms: boolean;
        }[];
        recentBriefs: {
            id: string;
            title: string;
            content: string;
            createdAt: string;
        }[];
    }>;
    getClientPortalCalendar(clientId: string, from?: string, to?: string): Promise<{
        events: {
            id: string;
            title: string;
            description: string | null;
            publicationDate: string;
            startAt: string;
            endAt: string;
            category: string;
            color: string | null;
            isPending: boolean;
            contentPostId: string | null;
            type: "event";
        }[];
        content: {
            id: string;
            title: string;
            status: string;
            platform: string;
            format: string;
            scheduledDate: string;
            type: "content";
        }[];
    }>;
    getPortalReport(rawToken: string, reportId: string): Promise<{
        id: string;
        clientId: string;
        client: {
            id: string;
            companyName: string;
            contactName: string | null;
            email: string | null;
            instagram: string | null;
            avatarUrl: string | null;
            isActive: boolean;
            hasCrmEnabled: boolean;
        };
        month: number;
        year: number;
        title: string;
        data: Prisma.JsonValue;
        generatedBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        createdAt: string;
    }>;
    getPortalPost(rawToken: string, postId: string): Promise<{
        copy: string;
        versions: {
            id: string;
            versionNumber: number;
            title: string;
            copyText: string;
            mediaUrls: string[];
            createdBy: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
            createdAt: string;
        }[];
        id: string;
        title: string;
        platform: string;
        format: string;
        scheduledDate: string | null;
        status: string;
        attachments: {
            id: string;
            name: string;
            url: string;
            mimeType: string | null;
        }[] | undefined;
    }>;
    approvePortalPost(rawToken: string, postId: string): Promise<{
        id: string;
        title: string;
        platform: string;
        format: string;
        scheduledDate: string | null;
        status: string;
        copy: string | undefined;
        attachments: {
            id: string;
            name: string;
            url: string;
            mimeType: string | null;
        }[] | undefined;
    }>;
    rejectPortalPost(rawToken: string, postId: string, dto: PortalRejectPostDto): Promise<{
        id: string;
        title: string;
        platform: string;
        format: string;
        scheduledDate: string | null;
        status: string;
        copy: string | undefined;
        attachments: {
            id: string;
            name: string;
            url: string;
            mimeType: string | null;
        }[] | undefined;
    }>;
    getPortalContract(rawToken: string, contractId: string): Promise<{
        id: string;
        clientId: string;
        client: {
            number: string | null;
            id: string;
            companyName: string;
            contactName: string | null;
            email: string | null;
            phone: string | null;
            street: string | null;
            city: string | null;
            state: string | null;
            zipCode: string | null;
            avatarUrl: string | null;
        };
        title: string;
        status: string;
        recurringValue: number;
        paymentFrequency: string;
        startDate: string;
        endDate: string | null;
        termsContent: string;
        pdfUrl: string | null;
        createdBy: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
        createdAt: string;
        updatedAt: string;
    }>;
    signPortalContract(rawToken: string, contractId: string): Promise<{
        contract: {
            id: string;
            clientId: string;
            client: {
                number: string | null;
                id: string;
                companyName: string;
                contactName: string | null;
                email: string | null;
                phone: string | null;
                street: string | null;
                city: string | null;
                state: string | null;
                zipCode: string | null;
                avatarUrl: string | null;
            };
            title: string;
            status: "draft" | "sent" | "signed" | "expired" | "cancelled";
            recurringValue: number;
            paymentFrequency: "monthly" | "one_time";
            startDate: string;
            endDate: string | null;
            termsContent: string;
            pdfUrl: string | null;
            createdBy: {
                id: string;
                name: string;
                email: string;
                avatarUrl: string | null;
            };
            receivablesCount: number;
            createdAt: string;
            updatedAt: string;
        };
        receivablesGenerated: number;
        receivables: {
            id: string;
            title: string;
            description: string;
            amount: number;
            type: "income" | "expense";
            status: "paid" | "pending" | "overdue";
            date: string;
            dueDate: string | null;
            categoryId: string;
            category: string;
            categoryColor: string;
            clientId: string | null;
            contractId: string | null;
            createdAt: string;
        }[];
    }>;
    uploadPortalAsset(rawToken: string, file: Express.Multer.File, fileType?: string): Promise<{
        id: string;
        clientId: string;
        client: {
            id: string;
            companyName: string;
            avatarUrl: string | null;
        };
        fileName: string;
        fileType: "image" | "logo" | "brand_guide" | "document";
        fileUrl: string;
        fileSize: number;
        uploadedBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        } | null;
        uploadedAt: string;
    }>;
    createBriefing(rawToken: string, dto: PortalBriefingDto): Promise<{
        id: string;
        title: string;
        content: string;
        createdAt: string;
    }>;
    getPortalReportForClient(clientId: string, reportId: string): Promise<{
        id: string;
        clientId: string;
        client: {
            id: string;
            companyName: string;
            contactName: string | null;
            email: string | null;
            instagram: string | null;
            avatarUrl: string | null;
            isActive: boolean;
            hasCrmEnabled: boolean;
        };
        month: number;
        year: number;
        title: string;
        data: Prisma.JsonValue;
        generatedBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        createdAt: string;
    }>;
    private getPortalReportByClientId;
    getPortalPostForClient(clientId: string, postId: string): Promise<{
        copy: string;
        versions: {
            id: string;
            versionNumber: number;
            title: string;
            copyText: string;
            mediaUrls: string[];
            createdBy: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
            createdAt: string;
        }[];
        id: string;
        title: string;
        platform: string;
        format: string;
        scheduledDate: string | null;
        status: string;
        attachments: {
            id: string;
            name: string;
            url: string;
            mimeType: string | null;
        }[] | undefined;
    }>;
    approvePortalPostForClient(clientId: string, postId: string): Promise<{
        id: string;
        title: string;
        platform: string;
        format: string;
        scheduledDate: string | null;
        status: string;
        copy: string | undefined;
        attachments: {
            id: string;
            name: string;
            url: string;
            mimeType: string | null;
        }[] | undefined;
    }>;
    private approvePortalPostByClientId;
    rejectPortalPostForClient(clientId: string, postId: string, dto: PortalRejectPostDto): Promise<{
        id: string;
        title: string;
        platform: string;
        format: string;
        scheduledDate: string | null;
        status: string;
        copy: string | undefined;
        attachments: {
            id: string;
            name: string;
            url: string;
            mimeType: string | null;
        }[] | undefined;
    }>;
    private rejectPortalPostByClientId;
    getPortalContractForClient(clientId: string, contractId: string): Promise<{
        id: string;
        clientId: string;
        client: {
            number: string | null;
            id: string;
            companyName: string;
            contactName: string | null;
            email: string | null;
            phone: string | null;
            street: string | null;
            city: string | null;
            state: string | null;
            zipCode: string | null;
            avatarUrl: string | null;
        };
        title: string;
        status: string;
        recurringValue: number;
        paymentFrequency: string;
        startDate: string;
        endDate: string | null;
        termsContent: string;
        pdfUrl: string | null;
        createdBy: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
        createdAt: string;
        updatedAt: string;
    }>;
    private getPortalContractByClientId;
    signPortalContractForClient(clientId: string, contractId: string): Promise<{
        contract: {
            id: string;
            clientId: string;
            client: {
                number: string | null;
                id: string;
                companyName: string;
                contactName: string | null;
                email: string | null;
                phone: string | null;
                street: string | null;
                city: string | null;
                state: string | null;
                zipCode: string | null;
                avatarUrl: string | null;
            };
            title: string;
            status: "draft" | "sent" | "signed" | "expired" | "cancelled";
            recurringValue: number;
            paymentFrequency: "monthly" | "one_time";
            startDate: string;
            endDate: string | null;
            termsContent: string;
            pdfUrl: string | null;
            createdBy: {
                id: string;
                name: string;
                email: string;
                avatarUrl: string | null;
            };
            receivablesCount: number;
            createdAt: string;
            updatedAt: string;
        };
        receivablesGenerated: number;
        receivables: {
            id: string;
            title: string;
            description: string;
            amount: number;
            type: "income" | "expense";
            status: "paid" | "pending" | "overdue";
            date: string;
            dueDate: string | null;
            categoryId: string;
            category: string;
            categoryColor: string;
            clientId: string | null;
            contractId: string | null;
            createdAt: string;
        }[];
    }>;
    getClientFinancesForClient(clientId: string): Promise<{
        clientId: string;
        pending: {
            id: string;
            title: string;
            description: string;
            amount: number;
            type: "income" | "expense";
            status: "paid" | "pending" | "overdue";
            date: string;
            dueDate: string | null;
            categoryId: string;
            category: string;
            categoryColor: string;
            clientId: string | null;
            contractId: string | null;
            createdAt: string;
        }[];
        paid: {
            id: string;
            title: string;
            description: string;
            amount: number;
            type: "income" | "expense";
            status: "paid" | "pending" | "overdue";
            date: string;
            dueDate: string | null;
            categoryId: string;
            category: string;
            categoryColor: string;
            clientId: string | null;
            contractId: string | null;
            createdAt: string;
        }[];
        overdue: {
            id: string;
            title: string;
            description: string;
            amount: number;
            type: "income" | "expense";
            status: "paid" | "pending" | "overdue";
            date: string;
            dueDate: string | null;
            categoryId: string;
            category: string;
            categoryColor: string;
            clientId: string | null;
            contractId: string | null;
            createdAt: string;
        }[];
        invoices: {
            id: string;
            title: string;
            description: string;
            amount: number;
            type: "income" | "expense";
            status: "paid" | "pending" | "overdue";
            date: string;
            dueDate: string | null;
            categoryId: string;
            category: string;
            categoryColor: string;
            clientId: string | null;
            contractId: string | null;
            createdAt: string;
        }[];
        totals: {
            totalDue: number;
            totalPaid: number;
            totalOverdue: number;
            pendingCount: number;
            paidCount: number;
            overdueCount: number;
        };
    }>;
    private signPortalContractByClientId;
    uploadPortalAssetForClient(clientId: string, file: Express.Multer.File, fileType?: string): Promise<{
        id: string;
        clientId: string;
        client: {
            id: string;
            companyName: string;
            avatarUrl: string | null;
        };
        fileName: string;
        fileType: "image" | "logo" | "brand_guide" | "document";
        fileUrl: string;
        fileSize: number;
        uploadedBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        } | null;
        uploadedAt: string;
    }>;
    createBriefingForClient(clientId: string, dto: PortalBriefingDto): Promise<{
        id: string;
        title: string;
        content: string;
        createdAt: string;
    }>;
    private createBriefingByClientId;
    private resolvePortalToken;
    private hashToken;
    private getContentOverview;
    private toPortalPost;
    private toPortalPostDetail;
}

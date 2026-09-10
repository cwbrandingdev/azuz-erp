import { AssetsService } from '../assets/assets.service';
import { PortalBriefingDto, PortalRejectPostDto } from './dto/portal.dto';
import { PortalService } from './portal.service';
export declare class PortalController {
    private readonly portalService;
    private readonly assetsService;
    constructor(portalService: PortalService, assetsService: AssetsService);
    getPortalData(token: string): Promise<{
        client: {
            id: string;
            email: string | null;
            avatarUrl: string | null;
            isActive: boolean;
            companyName: string;
            contactName: string | null;
            instagram: string | null;
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
    getPortalReport(token: string, reportId: string): Promise<{
        id: string;
        clientId: string;
        client: {
            id: string;
            email: string | null;
            avatarUrl: string | null;
            isActive: boolean;
            companyName: string;
            contactName: string | null;
            instagram: string | null;
            hasCrmEnabled: boolean;
        };
        month: number;
        year: number;
        title: string;
        data: import("@prisma/client/runtime/library").JsonValue;
        generatedBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        createdAt: string;
    }>;
    getPortalPost(token: string, postId: string): Promise<{
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
    approvePost(token: string, postId: string): Promise<{
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
    rejectPost(token: string, postId: string, dto: PortalRejectPostDto): Promise<{
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
    getPortalContract(token: string, contractId: string): Promise<{
        id: string;
        clientId: string;
        client: {
            number: string | null;
            id: string;
            email: string | null;
            avatarUrl: string | null;
            companyName: string;
            contactName: string | null;
            phone: string | null;
            street: string | null;
            city: string | null;
            state: string | null;
            zipCode: string | null;
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
    signContract(token: string, contractId: string): Promise<{
        contract: {
            id: string;
            clientId: string;
            client: {
                number: string | null;
                id: string;
                email: string | null;
                avatarUrl: string | null;
                companyName: string;
                contactName: string | null;
                phone: string | null;
                street: string | null;
                city: string | null;
                state: string | null;
                zipCode: string | null;
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
    uploadAsset(token: string, fileType: string | undefined, file: Express.Multer.File): Promise<{
        id: string;
        clientId: string;
        client: {
            id: string;
            avatarUrl: string | null;
            companyName: string;
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
    createBriefing(token: string, dto: PortalBriefingDto): Promise<{
        id: string;
        title: string;
        content: string;
        createdAt: string;
    }>;
}

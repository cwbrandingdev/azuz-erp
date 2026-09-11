import { ClientRequestsService } from '../client-requests/client-requests.service';
import { QueryClientRequestsDto } from '../client-requests/dto/client-request.dto';
import { Client360Service } from './client-360.service';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { BulkImportClientsDto } from './dto/bulk-import.dto';
import { QueryClient360Dto } from './dto/client-360.dto';
export declare class ClientsController {
    private readonly clientsService;
    private readonly client360Service;
    private readonly clientRequestsService;
    constructor(clientsService: ClientsService, client360Service: Client360Service, clientRequestsService: ClientRequestsService);
    findAll(clientGroupId?: string, activeOnly?: string): Promise<any>;
    getClientRequests(id: string, query: QueryClientRequestsDto): Promise<{
        id: string;
        tenantId: string;
        companyId: string;
        clientId: string;
        client: {
            id: string;
            companyName: string;
        } | null;
        title: string;
        description: string | null;
        contentType: string;
        referenceLinks: import("@prisma/client/runtime/library").JsonArray;
        attachments: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
        status: string;
        rejectionReason: string | null;
        relatedTaskId: string | null;
        comments: {
            id: string;
            requestId: string;
            body: string;
            parentId: string | null;
            author: {
                id: string;
                name: string;
                avatarUrl: string | null;
                role: string | null;
            } | null;
            createdAt: string;
            updatedAt: string;
        }[];
        createdAt: string;
        updatedAt: string;
    }[]>;
    getClient360(id: string, query: QueryClient360Dto): Promise<{
        section: string;
        overview: {
            drafts: number;
            pendingApproval: number;
            approved: number;
            scheduled: number;
            published: number;
            rejected: number;
            total: number;
        };
        posts: {
            id: string;
            title: string;
            platform: "instagram" | "tiktok" | "youtube" | "linkedin";
            format: "static" | "carousel" | "reels" | "story";
            status: "approved" | "rejected" | "draft" | "scheduled" | "published" | "pending_approval";
            scheduledDate: string | null;
            copy: string;
            referenceUrl: string | null;
            attachmentCount: number;
            previewUrl: string;
            previewMimeType: string | null;
            author: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
            assignee: {
                id: string;
                name: string;
                avatarUrl: string | null;
            } | null;
            updatedAt: string;
            platformColor: string;
        }[];
        versionHistory: {
            id: string;
            postId: string;
            postTitle: string;
            versionNumber: number;
            title: string;
            copyPreview: string;
            mediaUrls: string[];
            createdBy: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
            createdAt: string;
        }[];
    } | {
        section: string;
        mrr: number;
        contracts: {
            id: string;
            title: string;
            status: "draft" | "sent" | "signed" | "expired" | "cancelled";
            recurringValue: number;
            paymentFrequency: "monthly" | "one_time";
            startDate: string;
            endDate: string | null;
            pdfUrl: string | null;
            receivablesCount: number;
            updatedAt: string;
        }[];
        monthlyInvoicing: {
            month: number;
            year: number;
            total: number;
            paid: number;
            pending: number;
            items: {
                id: string;
                description: string;
                amount: number;
                status: "pending" | "paid" | "overdue";
                date: string;
                dueDate: string | null;
                contractId: string | null;
            }[];
        };
    } | {
        section: string;
        items: ({
            id: string;
            type: "event";
            title: string;
            category: "meeting" | "deadline" | "publish" | "other";
            startAt: string;
            endAt: string;
            referenceUrl: string | null;
            isPending: boolean;
            color: string;
            assignee: {
                id: string;
                name: string;
                avatarUrl: string | null;
            } | null;
        } | {
            id: string;
            type: "post";
            title: string;
            category: "publish";
            startAt: string;
            endAt: string;
            referenceUrl: string;
            isPending: boolean;
            color: string;
            platform: "instagram" | "tiktok" | "youtube" | "linkedin";
            format: "static" | "carousel" | "reels" | "story";
            status: "approved" | "rejected" | "draft" | "scheduled" | "published" | "pending_approval";
            assignee: null;
        })[];
        meetings: ({
            id: string;
            type: "event";
            title: string;
            category: "meeting" | "deadline" | "publish" | "other";
            startAt: string;
            endAt: string;
            referenceUrl: string | null;
            isPending: boolean;
            color: string;
            assignee: {
                id: string;
                name: string;
                avatarUrl: string | null;
            } | null;
        } | {
            id: string;
            type: "post";
            title: string;
            category: "publish";
            startAt: string;
            endAt: string;
            referenceUrl: string;
            isPending: boolean;
            color: string;
            platform: "instagram" | "tiktok" | "youtube" | "linkedin";
            format: "static" | "carousel" | "reels" | "story";
            status: "approved" | "rejected" | "draft" | "scheduled" | "published" | "pending_approval";
            assignee: null;
        })[];
        releases: ({
            id: string;
            type: "event";
            title: string;
            category: "meeting" | "deadline" | "publish" | "other";
            startAt: string;
            endAt: string;
            referenceUrl: string | null;
            isPending: boolean;
            color: string;
            assignee: {
                id: string;
                name: string;
                avatarUrl: string | null;
            } | null;
        } | {
            id: string;
            type: "post";
            title: string;
            category: "publish";
            startAt: string;
            endAt: string;
            referenceUrl: string;
            isPending: boolean;
            color: string;
            platform: "instagram" | "tiktok" | "youtube" | "linkedin";
            format: "static" | "carousel" | "reels" | "story";
            status: "approved" | "rejected" | "draft" | "scheduled" | "published" | "pending_approval";
            assignee: null;
        })[];
    } | {
        section: string;
        referenceLinks: {
            label: string;
            url: string;
            type: string;
        }[];
        assets: {
            id: string;
            fileName: string;
            fileType: "image";
            fileUrl: string;
            fileSize: number;
            uploadedAt: string;
            uploadedBy: {
                id: string;
                name: string;
                avatarUrl: string | null;
            } | null;
        }[];
        grouped: {
            logo: {
                id: string;
                fileName: string;
                fileType: "image";
                fileUrl: string;
                fileSize: number;
                uploadedAt: string;
                uploadedBy: {
                    id: string;
                    name: string;
                    avatarUrl: string | null;
                } | null;
            }[];
            brand_guide: {
                id: string;
                fileName: string;
                fileType: "image";
                fileUrl: string;
                fileSize: number;
                uploadedAt: string;
                uploadedBy: {
                    id: string;
                    name: string;
                    avatarUrl: string | null;
                } | null;
            }[];
            image: {
                id: string;
                fileName: string;
                fileType: "image";
                fileUrl: string;
                fileSize: number;
                uploadedAt: string;
                uploadedBy: {
                    id: string;
                    name: string;
                    avatarUrl: string | null;
                } | null;
            }[];
            document: {
                id: string;
                fileName: string;
                fileType: "image";
                fileUrl: string;
                fileSize: number;
                uploadedAt: string;
                uploadedBy: {
                    id: string;
                    name: string;
                    avatarUrl: string | null;
                } | null;
            }[];
        };
        totals: {
            all: number;
            logos: number;
            brandGuides: number;
            images: number;
            documents: number;
        };
    } | {
        section: string;
        tasks: {
            id: string;
            title: string;
            description: string | null;
            referenceUrl: string | null;
            priority: "critical" | "high" | "medium" | "low" | "planned";
            dueDate: string | null;
            column: {
                id: string;
                title: string;
                type: "to_do" | "in_progress" | "done" | "custom";
                color: string;
            };
            assignees: {
                id: string;
                name: string;
                avatarUrl: string | null;
            }[];
            isOverdue: boolean;
            updatedAt: string;
        }[];
    } | {
        section: string;
        client: {
            id: string;
            companyName: string;
            contactName: string | null;
            email: string | null;
            phone: string | null;
            instagram: string | null;
            website: string | null;
            notes: string | null;
            avatarUrl: string | null;
            clientGroup: {
                id: string;
                name: string;
                color: string;
            } | null;
            postCount: number;
            assetCount: number;
            contractCount: number;
        };
        metrics: {
            mrr: number;
            activeContractsCount: number;
            signedContractsCount: number;
            openTasks: number;
            pendingApprovals: number;
            scheduledPosts: number;
            overdueTasks: number;
        };
        health: "at_risk" | "attention" | "healthy";
        activeContracts: {
            id: string;
            title: string;
            status: "draft" | "sent" | "signed" | "expired" | "cancelled";
            recurringValue: number;
            paymentFrequency: "monthly" | "one_time";
            startDate: string;
            endDate: string | null;
        }[];
        insights: {
            reach: number;
            impressions: number;
            spend: number;
            engagement: number;
            engagementRate: number;
            conversions: number;
            roas: number;
            activeCampaigns: number;
            performanceChart: {
                date: string;
                spend: number;
                reach: number;
                engagement: number;
            }[];
        };
    }>;
    findOne(id: string): Promise<{
        id: string;
        companyName: string;
        contactName: string | null;
        document: string | null;
        email: string | null;
        phone: string | null;
        instagram: string | null;
        instagramUserId: string | null;
        hasMetaAccessToken: boolean;
        website: string | null;
        street: string | null;
        number: string | null;
        neighborhood: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        address: string | null;
        notes: string | null;
        avatarUrl: string | null;
        isActive: boolean;
        hasCrmEnabled: boolean;
        clientGroup: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        } | null;
        postCount: number;
        requestCount: number;
        pendingRequestCount: number;
        activeRequestCount: number;
        createdAt: string;
        updatedAt: string;
    }>;
    bulkImport(dto: BulkImportClientsDto): Promise<{
        created: number;
        errors: {
            index: number;
            message: string;
        }[];
    }>;
    create(dto: CreateClientDto): Promise<{
        id: string;
        companyName: string;
        contactName: string | null;
        document: string | null;
        email: string | null;
        phone: string | null;
        instagram: string | null;
        instagramUserId: string | null;
        hasMetaAccessToken: boolean;
        website: string | null;
        street: string | null;
        number: string | null;
        neighborhood: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        address: string | null;
        notes: string | null;
        avatarUrl: string | null;
        isActive: boolean;
        hasCrmEnabled: boolean;
        clientGroup: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        } | null;
        postCount: number;
        requestCount: number;
        pendingRequestCount: number;
        activeRequestCount: number;
        createdAt: string;
        updatedAt: string;
    }>;
    deactivate(id: string): Promise<{
        id: string;
        companyName: string;
        contactName: string | null;
        document: string | null;
        email: string | null;
        phone: string | null;
        instagram: string | null;
        instagramUserId: string | null;
        hasMetaAccessToken: boolean;
        website: string | null;
        street: string | null;
        number: string | null;
        neighborhood: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        address: string | null;
        notes: string | null;
        avatarUrl: string | null;
        isActive: boolean;
        hasCrmEnabled: boolean;
        clientGroup: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        } | null;
        postCount: number;
        requestCount: number;
        pendingRequestCount: number;
        activeRequestCount: number;
        createdAt: string;
        updatedAt: string;
    }>;
    activate(id: string): Promise<{
        id: string;
        companyName: string;
        contactName: string | null;
        document: string | null;
        email: string | null;
        phone: string | null;
        instagram: string | null;
        instagramUserId: string | null;
        hasMetaAccessToken: boolean;
        website: string | null;
        street: string | null;
        number: string | null;
        neighborhood: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        address: string | null;
        notes: string | null;
        avatarUrl: string | null;
        isActive: boolean;
        hasCrmEnabled: boolean;
        clientGroup: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        } | null;
        postCount: number;
        requestCount: number;
        pendingRequestCount: number;
        activeRequestCount: number;
        createdAt: string;
        updatedAt: string;
    }>;
    update(id: string, dto: UpdateClientDto): Promise<{
        id: string;
        companyName: string;
        contactName: string | null;
        document: string | null;
        email: string | null;
        phone: string | null;
        instagram: string | null;
        instagramUserId: string | null;
        hasMetaAccessToken: boolean;
        website: string | null;
        street: string | null;
        number: string | null;
        neighborhood: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        address: string | null;
        notes: string | null;
        avatarUrl: string | null;
        isActive: boolean;
        hasCrmEnabled: boolean;
        clientGroup: {
            id: string;
            name: string;
            description: string | null;
            color: string;
        } | null;
        postCount: number;
        requestCount: number;
        pendingRequestCount: number;
        activeRequestCount: number;
        createdAt: string;
        updatedAt: string;
    }>;
    remove(id: string): Promise<void>;
}

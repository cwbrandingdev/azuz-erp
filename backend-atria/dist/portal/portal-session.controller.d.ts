import { ClientPortalFinancialService } from '../client-portal-financial/client-portal-financial.service';
import { CreateClientFinancialAttachmentDto } from '../client-portal-financial/dto/create-client-financial-attachment.dto';
import { AssetsService } from '../assets/assets.service';
import { ClientRequestsService } from '../client-requests/client-requests.service';
import { CreateClientRequestCommentDto, CreateClientRequestDto, QueryClientRequestsDto } from '../client-requests/dto/client-request.dto';
import { DeliverablesService } from '../deliverables/deliverables.service';
import { QueryClientDeliverablesDto } from '../deliverables/dto/query-client-deliverables.dto';
import { RejectClientDeliverableDto } from '../deliverables/dto/client-review.dto';
import { RevisionDeliverableItemDto } from '../deliverables/dto/revision-item.dto';
import { PortalBriefingDto, PortalRejectPostDto } from './dto/portal.dto';
import { ProvisionPortalAccessDto, PortalLoginDto } from './dto/portal-auth.dto';
import { PortalAuthService } from './portal-auth.service';
import { PortalService } from './portal.service';
interface PortalRequest {
    portalUser: {
        id: string;
        clientId: string;
        email: string;
    };
}
export declare class PortalSessionController {
    private readonly portalService;
    private readonly assetsService;
    private readonly clientRequestsService;
    private readonly deliverablesService;
    private readonly financialService;
    constructor(portalService: PortalService, assetsService: AssetsService, clientRequestsService: ClientRequestsService, deliverablesService: DeliverablesService, financialService: ClientPortalFinancialService);
    getPortalData(req: PortalRequest): Promise<{
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
    getCalendar(req: PortalRequest, from?: string, to?: string): Promise<{
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
    getPortalReport(req: PortalRequest, reportId: string): Promise<{
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
    getPortalPost(req: PortalRequest, postId: string): Promise<{
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
    approvePost(req: PortalRequest, postId: string): Promise<{
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
    rejectPost(req: PortalRequest, postId: string, dto: PortalRejectPostDto): Promise<{
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
    getPortalContract(req: PortalRequest, contractId: string): Promise<{
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
    signContract(req: PortalRequest, contractId: string): Promise<{
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
    uploadAsset(req: PortalRequest, fileType: string | undefined, file: Express.Multer.File): Promise<{
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
    createBriefing(req: PortalRequest, dto: PortalBriefingDto): Promise<{
        id: string;
        title: string;
        content: string;
        createdAt: string;
    }>;
    listFinancialAttachments(req: PortalRequest): Promise<{
        id: string;
        clientId: string;
        organizationId: string;
        fileUrl: string;
        fileType: "invoice" | "receipt";
        description: string | null;
        uploadedAt: string;
    }[]>;
    uploadFinancialAttachment(req: PortalRequest, file: Express.Multer.File, dto: CreateClientFinancialAttachmentDto): Promise<{
        id: string;
        clientId: string;
        organizationId: string;
        fileUrl: string;
        fileType: "invoice" | "receipt";
        description: string | null;
        uploadedAt: string;
    }>;
    listRequests(req: PortalRequest, query: QueryClientRequestsDto): Promise<{
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
    createRequest(req: PortalRequest, dto: CreateClientRequestDto): Promise<{
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
    }>;
    addRequestComment(req: PortalRequest, id: string, dto: CreateClientRequestCommentDto): Promise<{
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
    }>;
    listDeliverables(req: PortalRequest, query: QueryClientDeliverablesDto): Promise<{
        id: string;
        title: string;
        approvalStatus: string;
        deliveryDate: string;
        updatedAt: string;
        createdAt: string;
        links: {
            kanbanTaskId: string | null;
            contentPostId: string | null;
        };
        revisionSummary: {
            total: number;
            pending: number;
            approved: number;
            requiresAdjustment: number;
        };
    }[]>;
    getDeliverableFullView(id: string): Promise<{
        id: string;
        title: string;
        copy: string | null;
        approval: {
            status: string;
            approvedAt: string | null;
            approvedBy: {
                id: string;
                name: string;
                avatarUrl: string | null;
            } | null;
        };
        workflow: {
            isBypassingInternalReview: boolean;
            kanbanStatus: string | null;
            internalReviewStatus: string | null;
            internalReviewNote: string | null;
            rejectionReason: string | null;
        };
        client: {
            id: string;
            companyName: string;
        } | null;
        links: {
            kanbanTaskId: string | null;
            contentPostId: string | null;
        };
        media: {
            images: {
                id: string;
                deliverableId: string;
                mediaUrl: string;
                mediaType: string;
                status: string;
                adjustmentNotes: string | null;
                feedbackNotes: string | null;
                fileName: string | null;
                fileSize: number | null;
                sourceAssetId: string | null;
                sortOrder: number;
                createdAt: string;
                updatedAt: string;
            }[];
            videos: {
                id: string;
                deliverableId: string;
                mediaUrl: string;
                mediaType: string;
                status: string;
                adjustmentNotes: string | null;
                feedbackNotes: string | null;
                fileName: string | null;
                fileSize: number | null;
                sourceAssetId: string | null;
                sortOrder: number;
                createdAt: string;
                updatedAt: string;
            }[];
            other: {
                id: string;
                deliverableId: string;
                mediaUrl: string;
                mediaType: string;
                status: string;
                adjustmentNotes: string | null;
                feedbackNotes: string | null;
                fileName: string | null;
                fileSize: number | null;
                sourceAssetId: string | null;
                sortOrder: number;
                createdAt: string;
                updatedAt: string;
            }[];
            all: {
                id: string;
                deliverableId: string;
                mediaUrl: string;
                mediaType: string;
                status: string;
                adjustmentNotes: string | null;
                feedbackNotes: string | null;
                fileName: string | null;
                fileSize: number | null;
                sourceAssetId: string | null;
                sortOrder: number;
                createdAt: string;
                updatedAt: string;
            }[];
        };
        revisionSummary: {
            total: number;
            pending: number;
            approved: number;
            requiresAdjustment: number;
        };
        updatedAt: string;
        createdAt: string;
    }>;
    approveDeliverable(id: string, req: PortalRequest): Promise<{
        id: string;
        title: string;
        copy: string | null;
        approval: {
            status: string;
            approvedAt: string | null;
            approvedBy: {
                id: string;
                name: string;
                avatarUrl: string | null;
            } | null;
        };
        workflow: {
            isBypassingInternalReview: boolean;
            kanbanStatus: string | null;
            internalReviewStatus: string | null;
            internalReviewNote: string | null;
            rejectionReason: string | null;
        };
        client: {
            id: string;
            companyName: string;
        } | null;
        links: {
            kanbanTaskId: string | null;
            contentPostId: string | null;
        };
        media: {
            images: {
                id: string;
                deliverableId: string;
                mediaUrl: string;
                mediaType: string;
                status: string;
                adjustmentNotes: string | null;
                feedbackNotes: string | null;
                fileName: string | null;
                fileSize: number | null;
                sourceAssetId: string | null;
                sortOrder: number;
                createdAt: string;
                updatedAt: string;
            }[];
            videos: {
                id: string;
                deliverableId: string;
                mediaUrl: string;
                mediaType: string;
                status: string;
                adjustmentNotes: string | null;
                feedbackNotes: string | null;
                fileName: string | null;
                fileSize: number | null;
                sourceAssetId: string | null;
                sortOrder: number;
                createdAt: string;
                updatedAt: string;
            }[];
            other: {
                id: string;
                deliverableId: string;
                mediaUrl: string;
                mediaType: string;
                status: string;
                adjustmentNotes: string | null;
                feedbackNotes: string | null;
                fileName: string | null;
                fileSize: number | null;
                sourceAssetId: string | null;
                sortOrder: number;
                createdAt: string;
                updatedAt: string;
            }[];
            all: {
                id: string;
                deliverableId: string;
                mediaUrl: string;
                mediaType: string;
                status: string;
                adjustmentNotes: string | null;
                feedbackNotes: string | null;
                fileName: string | null;
                fileSize: number | null;
                sourceAssetId: string | null;
                sortOrder: number;
                createdAt: string;
                updatedAt: string;
            }[];
        };
        revisionSummary: {
            total: number;
            pending: number;
            approved: number;
            requiresAdjustment: number;
        };
        updatedAt: string;
        createdAt: string;
    }>;
    rejectDeliverable(id: string, dto: RejectClientDeliverableDto, req: PortalRequest): Promise<{
        id: string;
        title: string;
        copy: string | null;
        approval: {
            status: string;
            approvedAt: string | null;
            approvedBy: {
                id: string;
                name: string;
                avatarUrl: string | null;
            } | null;
        };
        workflow: {
            isBypassingInternalReview: boolean;
            kanbanStatus: string | null;
            internalReviewStatus: string | null;
            internalReviewNote: string | null;
            rejectionReason: string | null;
        };
        client: {
            id: string;
            companyName: string;
        } | null;
        links: {
            kanbanTaskId: string | null;
            contentPostId: string | null;
        };
        media: {
            images: {
                id: string;
                deliverableId: string;
                mediaUrl: string;
                mediaType: string;
                status: string;
                adjustmentNotes: string | null;
                feedbackNotes: string | null;
                fileName: string | null;
                fileSize: number | null;
                sourceAssetId: string | null;
                sortOrder: number;
                createdAt: string;
                updatedAt: string;
            }[];
            videos: {
                id: string;
                deliverableId: string;
                mediaUrl: string;
                mediaType: string;
                status: string;
                adjustmentNotes: string | null;
                feedbackNotes: string | null;
                fileName: string | null;
                fileSize: number | null;
                sourceAssetId: string | null;
                sortOrder: number;
                createdAt: string;
                updatedAt: string;
            }[];
            other: {
                id: string;
                deliverableId: string;
                mediaUrl: string;
                mediaType: string;
                status: string;
                adjustmentNotes: string | null;
                feedbackNotes: string | null;
                fileName: string | null;
                fileSize: number | null;
                sourceAssetId: string | null;
                sortOrder: number;
                createdAt: string;
                updatedAt: string;
            }[];
            all: {
                id: string;
                deliverableId: string;
                mediaUrl: string;
                mediaType: string;
                status: string;
                adjustmentNotes: string | null;
                feedbackNotes: string | null;
                fileName: string | null;
                fileSize: number | null;
                sourceAssetId: string | null;
                sortOrder: number;
                createdAt: string;
                updatedAt: string;
            }[];
        };
        revisionSummary: {
            total: number;
            pending: number;
            approved: number;
            requiresAdjustment: number;
        };
        updatedAt: string;
        createdAt: string;
    }>;
    reviseDeliverableItemPost(itemId: string, dto: RevisionDeliverableItemDto, req: PortalRequest): Promise<{
        id: string;
        deliverableId: string;
        mediaUrl: string;
        mediaType: string;
        status: string;
        adjustmentNotes: string | null;
        feedbackNotes: string | null;
        fileName: string | null;
        fileSize: number | null;
        sourceAssetId: string | null;
        sortOrder: number;
        createdAt: string;
        updatedAt: string;
    }>;
    reviseDeliverableItem(itemId: string, dto: RevisionDeliverableItemDto, req: PortalRequest): Promise<{
        id: string;
        deliverableId: string;
        mediaUrl: string;
        mediaType: string;
        status: string;
        adjustmentNotes: string | null;
        feedbackNotes: string | null;
        fileName: string | null;
        fileSize: number | null;
        sourceAssetId: string | null;
        sortOrder: number;
        createdAt: string;
        updatedAt: string;
    }>;
}
export declare class PortalAuthRoutesController {
    private readonly portalAuthService;
    constructor(portalAuthService: PortalAuthService);
    login(dto: PortalLoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        client: {
            id: string;
            isActive: boolean;
            companyName: string;
        };
        mustChangePassword: boolean;
    }>;
    refresh(body: {
        refreshToken?: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        client: {
            id: string;
            isActive: boolean;
            companyName: string;
        };
        mustChangePassword: boolean;
    }>;
    logout(body: {
        refreshToken?: string;
    }): Promise<void> | {
        success: boolean;
    };
    provisionAccess(clientId: string, dto: ProvisionPortalAccessDto): Promise<{
        clientId: string;
        companyName: string;
        email: string;
        temporaryPassword: string;
        loginUrl: string;
    }>;
}
export {};

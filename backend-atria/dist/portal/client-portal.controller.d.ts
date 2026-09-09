import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ClientRequestsService } from '../client-requests/client-requests.service';
import { CreateClientRequestCommentDto, CreateClientRequestDto, QueryClientRequestsDto } from '../client-requests/dto/client-request.dto';
import { DeliverablesService } from '../deliverables/deliverables.service';
import { QueryClientDeliverablesDto } from '../deliverables/dto/query-client-deliverables.dto';
import { RejectClientDeliverableDto } from '../deliverables/dto/client-review.dto';
import { RevisionDeliverableItemDto } from '../deliverables/dto/revision-item.dto';
import { CrmScopeService } from '../leads/crm-scope.service';
import { CreateLeadCommentDto } from '../leads/dto/lead-comment.dto';
import { UpdateLeadStatusDto } from '../leads/dto/lead-kanban.dto';
import { LeadsService } from '../leads/leads.service';
import { ToggleLeadCollapseDto } from '../crm/dto/toggle-lead-collapse.dto';
import { PortalBriefingDto, PortalRejectPostDto } from './dto/portal.dto';
import { PortalService } from './portal.service';
export declare class ClientPortalController {
    private readonly portalService;
    private readonly clientRequestsService;
    private readonly deliverablesService;
    private readonly leadsService;
    private readonly crmScope;
    constructor(portalService: PortalService, clientRequestsService: ClientRequestsService, deliverablesService: DeliverablesService, leadsService: LeadsService, crmScope: CrmScopeService);
    private requireClientId;
    private requireCrmEnabled;
    getCrmKanbanBoard(user: AuthenticatedUser): Promise<{
        columns: {
            id: string;
            stageId: string;
            status: string;
            title: string;
            color: string;
            order: number;
            leads: {
                id: string;
                companyId: string;
                organizationId: string | null;
                name: string;
                phone: string | null;
                email: string | null;
                website: string | null;
                address: string | null;
                city: string | null;
                neighborhood: string | null;
                category: string | null;
                placeId: string | null;
                rating: number | null;
                reviewsCount: number | null;
                latitude: number | null;
                longitude: number | null;
                status: import("@prisma/client").$Enums.LeadStatus;
                stageId: string | null;
                statusLabel: string;
                statusColor: string;
                crmStatus: import("@prisma/client").$Enums.CrmLeadStatus;
                isMinimized: boolean;
                kanbanTracked: boolean;
                kanbanOrder: number;
                aiScore: number | null;
                aiNotes: string | null;
                source: string;
                rawData: import("@prisma/client/runtime/library").JsonValue;
                createdAt: string;
                updatedAt: string;
            }[];
        }[];
        total: number;
        crmMoveZone: import("../leads/lead-pipeline-zones").CrmMoveZone;
    }>;
    updateCrmLeadStage(user: AuthenticatedUser, id: string, dto: UpdateLeadStatusDto): Promise<{
        id: string;
        companyId: string;
        organizationId: string | null;
        name: string;
        phone: string | null;
        email: string | null;
        website: string | null;
        address: string | null;
        city: string | null;
        neighborhood: string | null;
        category: string | null;
        placeId: string | null;
        rating: number | null;
        reviewsCount: number | null;
        latitude: number | null;
        longitude: number | null;
        status: import("@prisma/client").$Enums.LeadStatus;
        stageId: string | null;
        statusLabel: string;
        statusColor: string;
        crmStatus: import("@prisma/client").$Enums.CrmLeadStatus;
        isMinimized: boolean;
        kanbanTracked: boolean;
        kanbanOrder: number;
        aiScore: number | null;
        aiNotes: string | null;
        source: string;
        rawData: import("@prisma/client/runtime/library").JsonValue;
        createdAt: string;
        updatedAt: string;
    }>;
    toggleCrmLeadCollapse(user: AuthenticatedUser, id: string, dto: ToggleLeadCollapseDto): Promise<{
        status: import("@prisma/client").$Enums.CrmLeadStatus;
        pipelineStatus: import("@prisma/client").$Enums.LeadStatus;
        pipelineStatusLabel: string;
        pipelineStatusColor: string;
        id: string;
        companyId: string;
        organizationId: string | null;
        name: string;
        phone: string | null;
        email: string | null;
        website: string | null;
        address: string | null;
        city: string | null;
        neighborhood: string | null;
        category: string | null;
        placeId: string | null;
        rating: number | null;
        reviewsCount: number | null;
        latitude: number | null;
        longitude: number | null;
        stageId: string | null;
        statusLabel: string;
        statusColor: string;
        crmStatus: import("@prisma/client").$Enums.CrmLeadStatus;
        isMinimized: boolean;
        kanbanTracked: boolean;
        kanbanOrder: number;
        aiScore: number | null;
        aiNotes: string | null;
        source: string;
        rawData: import("@prisma/client/runtime/library").JsonValue;
        createdAt: string;
        updatedAt: string;
    }>;
    getCrmLeadComments(user: AuthenticatedUser, id: string): Promise<{
        id: string;
        content: string;
        createdAt: string;
        updatedAt: string;
        user: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
    }[]>;
    createCrmLeadComment(user: AuthenticatedUser, id: string, dto: CreateLeadCommentDto): Promise<{
        id: string;
        content: string;
        createdAt: string;
        updatedAt: string;
        user: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        };
    }>;
    getPortalData(user: AuthenticatedUser): Promise<{
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
    getCalendar(user: AuthenticatedUser, from?: string, to?: string): Promise<{
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
    getPortalReport(user: AuthenticatedUser, reportId: string): Promise<{
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
        data: import("@prisma/client/runtime/library").JsonValue;
        generatedBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        createdAt: string;
    }>;
    getPortalPost(user: AuthenticatedUser, postId: string): Promise<{
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
    approvePost(user: AuthenticatedUser, postId: string): Promise<{
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
    rejectPost(user: AuthenticatedUser, postId: string, dto: PortalRejectPostDto): Promise<{
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
    getPortalContract(user: AuthenticatedUser, contractId: string): Promise<{
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
    signContract(user: AuthenticatedUser, contractId: string): Promise<{
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
    getFinances(user: AuthenticatedUser): Promise<{
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
    listRequests(user: AuthenticatedUser, query: QueryClientRequestsDto): Promise<{
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
    createRequest(user: AuthenticatedUser, dto: CreateClientRequestDto): Promise<{
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
    addRequestComment(user: AuthenticatedUser, id: string, dto: CreateClientRequestCommentDto): Promise<{
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
    listDeliverables(user: AuthenticatedUser, query: QueryClientDeliverablesDto): Promise<{
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
    approveDeliverable(id: string, user: AuthenticatedUser): Promise<{
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
    rejectDeliverable(id: string, dto: RejectClientDeliverableDto, user: AuthenticatedUser): Promise<{
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
    reviseDeliverableItemPost(itemId: string, dto: RevisionDeliverableItemDto, user: AuthenticatedUser): Promise<{
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
    reviseDeliverableItem(itemId: string, dto: RevisionDeliverableItemDto, user: AuthenticatedUser): Promise<{
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
    uploadAsset(user: AuthenticatedUser, fileType: string | undefined, file: Express.Multer.File): Promise<{
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
    createBriefing(user: AuthenticatedUser, dto: PortalBriefingDto): Promise<{
        id: string;
        title: string;
        content: string;
        createdAt: string;
    }>;
}

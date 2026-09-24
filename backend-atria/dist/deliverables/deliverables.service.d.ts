import { KanbanService } from '../kanban/kanban.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../supabase/supabase-storage.service';
import { RejectClientDeliverableDto } from './dto/client-review.dto';
import { QueryClientDeliverablesDto } from './dto/query-client-deliverables.dto';
import { RevisionDeliverableItemDto } from './dto/revision-item.dto';
export declare class DeliverablesService {
    private readonly prisma;
    private readonly storage;
    private readonly kanbanService;
    constructor(prisma: PrismaService, storage: SupabaseStorageService, kanbanService: KanbanService);
    syncFromKanbanTask(taskId: string): Promise<{
        client: {
            id: string;
            companyName: string;
        } | null;
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.DeliverableItemStatus;
            fileName: string | null;
            fileSize: number | null;
            deliverableId: string;
            mediaUrl: string;
            mediaType: import("@prisma/client").$Enums.DeliverableMediaType;
            adjustmentNotes: string | null;
            storageBucket: string | null;
            storagePath: string | null;
            sourceAssetId: string | null;
            sortOrder: number;
        }[];
        approvedBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        } | null;
    } & {
        id: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        clientId: string | null;
        contentPostId: string | null;
        kanbanTaskId: string | null;
        approvalStatus: import("@prisma/client").$Enums.DeliverableApprovalStatus;
        approvedAt: Date | null;
        approvedById: string | null;
    }>;
    findAllForClient(clientId: string, query?: QueryClientDeliverablesDto): Promise<{
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
    approveInternal(deliverableId: string, userId: string, role: string, note?: string): Promise<{
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
    requestInternalAdjustment(deliverableId: string, userId: string, role: string, note: string): Promise<{
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
    submit(deliverableId: string, userId: string, role: string, file: Express.Multer.File, caption?: string): Promise<{
        id: string;
        fileName: string;
        fileUrl: string;
        fileType: string;
        fileSize: number | null;
        caption: string | null;
        uploadedAt: string;
        uploadedBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
    }>;
    rejectClient(deliverableId: string, dto: RejectClientDeliverableDto, userId?: string | null): Promise<{
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
    approveClient(deliverableId: string, userId?: string | null): Promise<{
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
    markWaitingClientApproval(taskId: string): Promise<void>;
    markRequiresAdjustment(taskId: string): Promise<void>;
    markClientApproved(taskId: string, approvedById?: string | null): Promise<void>;
    reviseItem(itemId: string, dto: RevisionDeliverableItemDto, actorUserId?: string | null): Promise<{
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
    getDownload(itemId: string): Promise<{
        itemId: string;
        fileName: string;
        mediaType: string;
        downloadUrl: string;
        expiresAt: string;
        contentDisposition: string;
        source: "supabase";
    } | {
        itemId: string;
        fileName: string;
        mediaType: string;
        downloadUrl: string;
        expiresAt: null;
        contentDisposition: string;
        source: "local";
        streamPath: string;
    } | {
        itemId: string;
        fileName: string;
        mediaType: string;
        downloadUrl: string;
        expiresAt: null;
        contentDisposition: string;
        source: "external";
    }>;
    getFullView(deliverableId: string): Promise<{
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
    openLocalFileStream(absolutePath: string): import("fs").ReadStream;
    private resolveMonthDateRange;
    private toClientListResponse;
    private requireDeliverableWithTask;
    private refreshDeliverableApproval;
    private syncKanbanFromApproval;
    private getDeliverableRecord;
    private looksLikeTaskId;
    private resolveStorageLocation;
    private resolveMediaType;
    private mapInternalReviewToApproval;
    private resolveRejectionReason;
    private guessFileName;
    private toItemResponse;
}

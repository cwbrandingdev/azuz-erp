import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RejectClientDeliverableDto } from './dto/client-review.dto';
import { ReorderDeliverableItemsDto } from './dto/reorder-items.dto';
import { RevisionDeliverableItemDto } from './dto/revision-item.dto';
import { DeliverablesService } from './deliverables.service';
export declare class DeliverablesController {
    private readonly deliverablesService;
    constructor(deliverablesService: DeliverablesService);
    reviseItemPost(itemId: string, dto: RevisionDeliverableItemDto, user: AuthenticatedUser): Promise<{
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
    reviseItem(itemId: string, dto: RevisionDeliverableItemDto, user: AuthenticatedUser): Promise<{
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
    downloadItem(itemId: string, res: Response): Promise<StreamableFile | {
        itemId: string;
        fileName: string;
        mediaType: string;
        downloadUrl: string;
        expiresAt: string | null;
        contentDisposition: string;
        source: "supabase" | "local" | "external";
    }>;
    reorderItems(id: string, dto: ReorderDeliverableItemsDto): Promise<{
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
    submit(id: string, user: AuthenticatedUser, file: Express.Multer.File, caption?: string): Promise<{
        id: string;
        fileName: string;
        fileUrl: string;
        fileType: string;
        fileSize: number | null;
        caption: string | null;
        uploadedAt: string;
        uploadedBy: {
            id: string;
            avatarUrl: string | null;
            name: string;
        };
    }>;
    approveInternal(id: string, user: AuthenticatedUser): Promise<{
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
    rejectClient(id: string, dto: RejectClientDeliverableDto, user: AuthenticatedUser): Promise<{
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
    approveClient(id: string, user: AuthenticatedUser): Promise<{
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
    getFullView(id: string): Promise<{
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
}

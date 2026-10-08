import { DeliverablesService } from '../deliverables/deliverables.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveInternalApprovalDto } from './dto/approve-internal-approval.dto';
import { RequestAdjustmentDto } from './dto/request-adjustment.dto';
export declare class InternalApprovalsService {
    private readonly prisma;
    private readonly deliverablesService;
    constructor(prisma: PrismaService, deliverablesService: DeliverablesService);
    listPending(role: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        postCaption: string | null;
        kanbanTaskId: string;
        contentPostId: string | null;
        approvalStatus: string | null;
        internalReviewStatus: string;
        internalReviewNote: string | null;
        kanbanStatus: string;
        publicationDate: string | null;
        deliveryDate: string | null;
        dueDate: string | null;
        assetCount: number;
        client: {
            id: string;
            companyName: string;
            avatarUrl: string | null;
        } | null;
        createdBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        assignees: {
            id: string;
            name: string;
            avatarUrl: string | null;
        }[];
        revisionSummary: {
            total: number;
            pending: number;
            approved: number;
            requiresAdjustment: number;
        };
        updatedAt: string;
        createdAt: string;
    }[]>;
    approve(id: string, userId: string, role: string, dto?: ApproveInternalApprovalDto): Promise<{
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
    submitDelivery(id: string, userId: string, role: string, file: Express.Multer.File, caption?: string): Promise<{
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
    requestAdjustment(id: string, userId: string, role: string, dto: RequestAdjustmentDto): Promise<{
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
    private toPendingResponse;
}

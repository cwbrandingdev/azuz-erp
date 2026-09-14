import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreationService } from './creation.service';
import { CreateBriefPlanDto, GenerateBriefPlanDto } from './dto/brief-to-content.dto';
import { CreateDeliverableDto, QueryClientPipelineDto, UpdateItemStatusDto } from './dto/deliverable.dto';
import { InternalReviewDto } from '../kanban/dto/internal-review.dto';
export declare class CreationController {
    private readonly creationService;
    constructor(creationService: CreationService);
    getCommandCenter(): Promise<{
        weekRange: {
            start: string;
            end: string;
        };
        deliverables: {
            groups: {
                clientId: string;
                clientName: string;
                avatarUrl: string | null;
                items: ReturnType<any>[];
            }[];
            summary: {
                total: number;
                byFormat: Record<string, number>;
                byStatus: Record<string, number>;
            };
        };
        approvalsQueue: {
            id: string;
            title: string;
            clientId: string;
            clientName: string;
            clientAvatarUrl: string | null;
            platform: "instagram" | "tiktok" | "youtube" | "linkedin";
            format: "static" | "carousel" | "reels" | "story";
            status: "approved" | "rejected" | "draft" | "pending_approval" | "scheduled" | "published";
            assignee: {
                id: string;
                name: string;
                avatarUrl: string | null;
            } | null;
            updatedAt: string;
            scheduledDate: string | null;
            previewAttachment: {
                id: string;
                name: string;
                url: string;
                mimeType: string | null;
            } | null;
        }[];
        publishingSchedule: ({
            id: string;
            type: "post";
            title: string;
            clientId: string;
            clientName: string;
            platform: "instagram" | "tiktok" | "youtube" | "linkedin";
            format: "static" | "carousel" | "reels" | "story";
            status: "approved" | "rejected" | "draft" | "pending_approval" | "scheduled" | "published";
            scheduledAt: string;
            color: string;
        } | {
            id: string;
            type: "event";
            title: string;
            clientId: string | null;
            clientName: string;
            platform: null;
            format: null;
            status: string;
            scheduledAt: string;
            color: string;
            referenceUrl: string | null;
        })[];
        blockers: ({
            id: string;
            severity: "red";
            type: "overdue_task";
            title: string;
            description: string;
            clientId: string | null;
            clientName: string;
            dueDate: string | null;
            href: string;
        } | {
            id: string;
            severity: "amber";
            type: "missing_assets";
            title: string;
            description: string;
            clientId: string;
            clientName: string;
            dueDate: string | null;
            href: string;
        } | {
            id: string;
            severity: "red";
            type: "unsigned_contract";
            title: string;
            description: string;
            clientId: string;
            clientName: string;
            dueDate: string;
            href: string;
        })[];
        stats: {
            deliverablesThisWeek: number;
            pendingApprovals: number;
            scheduledReleases: number;
            activeBlockers: number;
        };
    }>;
    getClientPipeline(query: QueryClientPipelineDto): Promise<{
        client: {
            id: string;
            companyName: string;
            avatarUrl: string | null;
        };
        items: ({
            id: string;
            source: "post";
            postId: string;
            eventId: string | null;
            title: string;
            type: string;
            typeKey: string;
            scheduledAt: string;
            status: "pending" | "approved" | "draft";
            statusLabel: string;
            referenceUrl: string | null;
            clientId: string;
            clientName: string;
            href: string;
            kanbanTaskId: string | null;
            taskStatus: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
            taskStatusColor: string | null;
            taskStatusLabel: string | null;
            internalReviewStatus: string;
        } | {
            id: string;
            source: "event";
            postId: string | null;
            eventId: string;
            title: string;
            type: string;
            typeKey: string;
            scheduledAt: string;
            status: "pending" | "approved" | "draft";
            statusLabel: string;
            referenceUrl: string | null;
            clientId: string;
            clientName: string;
            href: string;
            kanbanTaskId: string | null;
            taskStatus: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
            taskStatusColor: string | null;
            taskStatusLabel: string | null;
            internalReviewStatus: string;
        })[];
        groups: {
            date: string;
            dateLabel: string;
            items: ({
                id: string;
                source: "post";
                postId: string;
                eventId: string | null;
                title: string;
                type: string;
                typeKey: string;
                scheduledAt: string;
                status: "pending" | "approved" | "draft";
                statusLabel: string;
                referenceUrl: string | null;
                clientId: string;
                clientName: string;
                href: string;
                kanbanTaskId: string | null;
                taskStatus: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
                taskStatusColor: string | null;
                taskStatusLabel: string | null;
                internalReviewStatus: string;
            } | {
                id: string;
                source: "event";
                postId: string | null;
                eventId: string;
                title: string;
                type: string;
                typeKey: string;
                scheduledAt: string;
                status: "pending" | "approved" | "draft";
                statusLabel: string;
                referenceUrl: string | null;
                clientId: string;
                clientName: string;
                href: string;
                kanbanTaskId: string | null;
                taskStatus: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
                taskStatusColor: string | null;
                taskStatusLabel: string | null;
                internalReviewStatus: string;
            })[];
        }[];
    }>;
    createDeliverable(user: AuthenticatedUser, dto: CreateDeliverableDto): Promise<{
        source: "post";
        item: {
            id: string;
            source: "post";
            postId: string;
            eventId: string | null;
            title: string;
            type: string;
            typeKey: string;
            scheduledAt: string;
            status: "pending" | "approved" | "draft";
            statusLabel: string;
            referenceUrl: string | null;
            clientId: string;
            clientName: string;
            href: string;
            kanbanTaskId: string | null;
            taskStatus: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
            taskStatusColor: string | null;
            taskStatusLabel: string | null;
            internalReviewStatus: string;
        };
    } | {
        source: "event";
        item: {
            id: string;
            source: "event";
            postId: string | null;
            eventId: string;
            title: string;
            type: string;
            typeKey: string;
            scheduledAt: string;
            status: "pending" | "approved" | "draft";
            statusLabel: string;
            referenceUrl: string | null;
            clientId: string;
            clientName: string;
            href: string;
            kanbanTaskId: string | null;
            taskStatus: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
            taskStatusColor: string | null;
            taskStatusLabel: string | null;
            internalReviewStatus: string;
        };
    }>;
    updatePipelineInternalReview(user: AuthenticatedUser, source: 'post' | 'event', id: string, dto: InternalReviewDto): Promise<{
        item: {
            id: string;
            source: "post";
            postId: string;
            eventId: string | null;
            title: string;
            type: string;
            typeKey: string;
            scheduledAt: string;
            status: "pending" | "approved" | "draft";
            statusLabel: string;
            referenceUrl: string | null;
            clientId: string;
            clientName: string;
            href: string;
            kanbanTaskId: string | null;
            taskStatus: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
            taskStatusColor: string | null;
            taskStatusLabel: string | null;
            internalReviewStatus: string;
        };
    } | {
        item: {
            id: string;
            source: "event";
            postId: string | null;
            eventId: string;
            title: string;
            type: string;
            typeKey: string;
            scheduledAt: string;
            status: "pending" | "approved" | "draft";
            statusLabel: string;
            referenceUrl: string | null;
            clientId: string;
            clientName: string;
            href: string;
            kanbanTaskId: string | null;
            taskStatus: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
            taskStatusColor: string | null;
            taskStatusLabel: string | null;
            internalReviewStatus: string;
        };
    }>;
    updateItemStatus(source: 'post' | 'event', id: string, dto: UpdateItemStatusDto): Promise<{
        item: {
            id: string;
            source: "post";
            postId: string;
            eventId: string | null;
            title: string;
            type: string;
            typeKey: string;
            scheduledAt: string;
            status: "pending" | "approved" | "draft";
            statusLabel: string;
            referenceUrl: string | null;
            clientId: string;
            clientName: string;
            href: string;
            kanbanTaskId: string | null;
            taskStatus: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
            taskStatusColor: string | null;
            taskStatusLabel: string | null;
            internalReviewStatus: string;
        };
    } | {
        item: {
            id: string;
            source: "event";
            postId: string | null;
            eventId: string;
            title: string;
            type: string;
            typeKey: string;
            scheduledAt: string;
            status: "pending" | "approved" | "draft";
            statusLabel: string;
            referenceUrl: string | null;
            clientId: string;
            clientName: string;
            href: string;
            kanbanTaskId: string | null;
            taskStatus: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
            taskStatusColor: string | null;
            taskStatusLabel: string | null;
            internalReviewStatus: string;
        };
    }>;
    generateFromBrief(dto: GenerateBriefPlanDto): Promise<{
        clientId: string;
        clientName: string;
        summary: string;
        platform: "instagram" | "tiktok" | "youtube" | "linkedin";
        ideas: {
            title: string;
            copy: string;
            format: "static" | "carousel" | "reels" | "story";
            mediaConcept: string;
            suggestedDate: string;
        }[];
        provider: "openai" | "gemini" | "fallback";
    }>;
    createFromBriefPlan(user: AuthenticatedUser, dto: CreateBriefPlanDto): Promise<{
        created: {
            posts: number;
            tasks: number;
        };
        posts: {
            id: string;
            title: string;
            clientId: string;
            client: {
                id: string;
                avatarUrl: string | null;
                companyName: string;
                instagram: string | null;
            };
            platform: "instagram" | "tiktok" | "youtube" | "linkedin";
            format: "carousel" | "reels" | "static" | "story";
            scheduledDate: string | null;
            status: "draft" | "pending_approval" | "approved" | "rejected" | "scheduled" | "published";
            internalReviewStatus: "not_required" | "pending" | "approved" | "rejected";
            internalReviewNote: string | null;
            copy: string;
            referenceUrl: string | null;
            attachments: {
                url: string;
                id: string;
                createdAt: Date;
                name: string;
                postId: string;
                mimeType: string | null;
            }[];
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
            platformColor: string;
            createdAt: string;
            updatedAt: string;
        }[];
        tasks: {
            postCaption: string | null;
            referenceUrl: string | null;
            columnId: string;
            column: {
                id: string;
                title: string;
                order: number;
                color: string;
                type: "to_do" | "in_progress" | "done" | "custom" | null;
                statusKey: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
            } | null;
            contentPostId: string | null;
            calendarEventId: string | null;
            internalReviewStatus: "not_required" | "pending" | "approved" | "rejected";
            internalReviewNote: string | null;
            isBypassingInternalReview: boolean;
            priority: "critical" | "high" | "medium" | "low" | "planned";
            order: number;
            slaResponseDueAt: string | null;
            slaResolutionDueAt: string | null;
            firstResponseAt: string | null;
            resolvedAt: string | null;
            slaStatus: import("../sla/sla.utils").SlaUiStatus;
            assignedGroupId: string | null;
            assignedGroup: {
                id: string;
                name: string;
                color: string;
            } | null;
            assignees: {
                id: string;
                name: string;
                avatarUrl: string | null;
            }[];
            createdBy: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
            assets: {
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
            }[];
            updatedAt: string;
            id: string;
            title: string;
            description: string | null;
            status: import("../kanban/kanban-status").KanbanTaskStatusApi;
            productionPhase: import("../kanban/production-phase").ProductionPhaseApi | null;
            contentType: import("../kanban/kanban-content-type").KanbanTaskContentTypeApi;
            statusColor: string;
            statusLabel: string;
            dueDate: string | null;
            publicationDate: string | null;
            deliveryDate: string | null;
            clientId: string | null;
            companyId: string;
            client: import("../kanban/kanban-task.mapper").UnifiedTaskClient | null;
            createdAt: string;
        }[];
    }>;
}

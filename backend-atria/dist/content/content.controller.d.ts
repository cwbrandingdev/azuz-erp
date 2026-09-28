import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ContentService } from './content.service';
import { CreateContentPostDto, QueryContentPostsDto, UpdateContentPostDto } from './dto/content-post.dto';
import { CreatePostVersionDto, RejectContentPostDto } from './dto/content-workflow.dto';
import { InternalReviewDto } from '../kanban/dto/internal-review.dto';
export declare class ContentController {
    private readonly contentService;
    constructor(contentService: ContentService);
    getManagementBoard(clientId?: string, status?: string): Promise<{
        overview: {
            drafts: number;
            pendingApproval: number;
            scheduled: number;
            published: number;
            total: number;
        };
        posts: {
            latestFeedback: {
                id: string;
                postId: string;
                versionId: string | null;
                versionLabel: string | null;
                comment: string;
                type: "rejection_reason" | "general_note";
                user: {
                    id: string;
                    name: string;
                    avatarUrl: string | null;
                };
                createdAt: string;
            } | null;
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
    }>;
    getOverview(clientId?: string): Promise<{
        drafts: number;
        pendingApproval: number;
        scheduled: number;
        published: number;
        total: number;
    }>;
    getCalendar(from?: string, to?: string, clientId?: string): Promise<{
        id: string;
        title: string;
        platform: string;
        scheduledDate: string;
        status: string;
        clientName: string;
        color: string;
    }[]>;
    getPosts(query: QueryContentPostsDto): Promise<{
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
    }[]>;
    getPostInsights(id: string): Promise<{
        postId: string;
        clientId: string;
        reach: number;
        impressions: number;
        engagement: number;
        engagementRate: number;
        platform: "instagram";
        isEstimated: boolean;
    }>;
    getPostHistory(id: string): Promise<{
        versions: {
            id: string;
            postId: string;
            versionNumber: number;
            versionLabel: string;
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
        feedback: {
            id: string;
            postId: string;
            versionId: string | null;
            versionLabel: string | null;
            comment: string;
            type: "rejection_reason" | "general_note";
            user: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
            createdAt: string;
        }[];
        timeline: ({
            kind: "version";
            id: string;
            createdAt: string;
            data: {
                id: string;
                postId: string;
                versionNumber: number;
                versionLabel: string;
                title: string;
                copyText: string;
                mediaUrls: string[];
                createdBy: {
                    id: string;
                    name: string;
                    avatarUrl: string | null;
                };
                createdAt: string;
            };
        } | {
            kind: "feedback";
            id: string;
            createdAt: string;
            data: {
                id: string;
                postId: string;
                versionId: string | null;
                versionLabel: string | null;
                comment: string;
                type: "rejection_reason" | "general_note";
                user: {
                    id: string;
                    name: string;
                    avatarUrl: string | null;
                };
                createdAt: string;
            };
        })[];
    }>;
    getPost(id: string): Promise<{
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
    }>;
    createPost(user: AuthenticatedUser, dto: CreateContentPostDto): Promise<{
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
    }>;
    updatePost(id: string, dto: UpdateContentPostDto): Promise<{
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
    }>;
    createVersion(id: string, user: AuthenticatedUser, dto: CreatePostVersionDto): Promise<{
        id: string;
        postId: string;
        versionNumber: number;
        versionLabel: string;
        title: string;
        copyText: string;
        mediaUrls: string[];
        createdBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        createdAt: string;
    }>;
    approvePost(id: string): Promise<{
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
    }>;
    rejectPost(id: string, user: AuthenticatedUser, dto: RejectContentPostDto): Promise<{
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
    }>;
    updateInternalReview(id: string, user: AuthenticatedUser, dto: InternalReviewDto): Promise<{
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
    }>;
    deletePost(id: string): Promise<void>;
}

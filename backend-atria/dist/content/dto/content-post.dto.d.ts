import { ContentPlatform, ContentPostFormat, ContentPostStatus } from '@prisma/client';
export declare class AttachmentDto {
    name: string;
    url: string;
    mimeType?: string;
}
export declare class CreateContentPostDto {
    title: string;
    clientId: string;
    platform: ContentPlatform;
    format?: ContentPostFormat;
    scheduledDate?: string;
    status?: ContentPostStatus;
    copy: string;
    referenceUrl?: string;
    assigneeId?: string;
    attachments?: AttachmentDto[];
    publishToInstagram?: boolean;
}
export declare class UpdateContentPostDto {
    title?: string;
    clientId?: string;
    platform?: ContentPlatform;
    format?: ContentPostFormat;
    scheduledDate?: string | null;
    status?: ContentPostStatus;
    copy?: string;
    referenceUrl?: string | null;
    assigneeId?: string | null;
    attachments?: AttachmentDto[];
    publishToInstagram?: boolean;
}
export declare class QueryContentPostsDto {
    clientId?: string;
    platform?: ContentPlatform;
    status?: ContentPostStatus;
    from?: string;
    to?: string;
}

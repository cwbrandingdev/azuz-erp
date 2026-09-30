import { ContentPostFormat } from '@prisma/client';
export type PublishReadinessIssue = {
    code: string;
    message: string;
};
export type TaskPublishReadinessInput = {
    clientId: string | null;
    clientHasInstagram: boolean;
    clientHasMetaToken: boolean;
    publicationDate: Date | null;
    format: ContentPostFormat;
    media: Array<{
        url: string;
        mimeType: string;
    }>;
    imageCount: number;
    videoCount: number;
    mediaUrlReachable: boolean | null;
};
export type TaskPublishReadiness = {
    ready: boolean;
    blockers: PublishReadinessIssue[];
    warnings: PublishReadinessIssue[];
};
export declare function evaluateTaskPublishReadiness(input: TaskPublishReadinessInput): TaskPublishReadiness;
export declare function humanizeMetaPublishError(message: string): string;

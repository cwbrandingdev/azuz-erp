import { KanbanTaskContentType } from '@prisma/client';
export declare const DEFAULT_TASK_CONTENT_TYPE: "VIDEO_WITH_SCRIPT";
export declare const SOCIAL_TASK_CONTENT_TYPES: ReadonlyArray<KanbanTaskContentType>;
export declare const TASK_CONTENT_TYPE_DEFINITIONS: ReadonlyArray<{
    value: KanbanTaskContentType;
    label: string;
}>;
export declare function isSocialTaskContentType(contentType?: KanbanTaskContentType | null): boolean;
export type KanbanTaskContentTypeApi = 'video_with_script' | 'static' | 'carousel' | 'stories_no_script' | 'presentation' | 'document' | 'mockup' | 'print';
export declare function contentTypeToApi(contentType: KanbanTaskContentType): KanbanTaskContentTypeApi;
export declare function isKanbanTaskContentType(value: unknown): value is KanbanTaskContentType;
export declare function resolveTaskContentType(value?: KanbanTaskContentType | null): KanbanTaskContentType;

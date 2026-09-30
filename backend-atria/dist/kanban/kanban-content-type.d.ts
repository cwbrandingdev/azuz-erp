import { ContentPostFormat, KanbanTaskContentType } from '@prisma/client';
export declare const DEFAULT_TASK_CONTENT_TYPE: "VIDEO_WITH_SCRIPT";
export declare const TASK_CONTENT_TYPE_DEFINITIONS: ReadonlyArray<{
    value: KanbanTaskContentType;
    label: string;
}>;
export type KanbanTaskContentTypeApi = 'video_with_script' | 'static' | 'carousel' | 'stories_no_script';
export declare function contentTypeToApi(contentType: KanbanTaskContentType): KanbanTaskContentTypeApi;
export declare function isKanbanTaskContentType(value: unknown): value is KanbanTaskContentType;
export declare function resolveTaskContentType(value?: KanbanTaskContentType | null): KanbanTaskContentType;
export declare function contentTypeToPostFormat(contentType: KanbanTaskContentType): ContentPostFormat;
export declare function postFormatLabel(format: ContentPostFormat): string;

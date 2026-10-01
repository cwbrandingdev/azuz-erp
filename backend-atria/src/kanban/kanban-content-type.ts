import { ContentPostFormat, KanbanTaskContentType } from '@prisma/client';

export const DEFAULT_TASK_CONTENT_TYPE = KanbanTaskContentType.VIDEO_WITH_SCRIPT;

export const TASK_CONTENT_TYPE_DEFINITIONS: ReadonlyArray<{
  value: KanbanTaskContentType;
  label: string;
}> = [
  {
    value: KanbanTaskContentType.VIDEO_WITH_SCRIPT,
    label: 'Vídeo',
  },
  {
    value: KanbanTaskContentType.STATIC,
    label: 'Estático',
  },
  {
    value: KanbanTaskContentType.CAROUSEL,
    label: 'Carrossel',
  },
  {
    value: KanbanTaskContentType.STORIES_NO_SCRIPT,
    label: 'Stories',
  },
];

export type KanbanTaskContentTypeApi =
  | 'video_with_script'
  | 'static'
  | 'carousel'
  | 'stories_no_script';

export function contentTypeToApi(
  contentType: KanbanTaskContentType,
): KanbanTaskContentTypeApi {
  return contentType.toLowerCase() as KanbanTaskContentTypeApi;
}

export function isKanbanTaskContentType(
  value: unknown,
): value is KanbanTaskContentType {
  return (
    value === KanbanTaskContentType.VIDEO_WITH_SCRIPT ||
    value === KanbanTaskContentType.STATIC ||
    value === KanbanTaskContentType.CAROUSEL ||
    value === KanbanTaskContentType.STORIES_NO_SCRIPT
  );
}

export function resolveTaskContentType(
  value?: KanbanTaskContentType | null,
): KanbanTaskContentType {
  return isKanbanTaskContentType(value) ? value : DEFAULT_TASK_CONTENT_TYPE;
}

export function contentTypeToPostFormat(
  contentType: KanbanTaskContentType,
): ContentPostFormat {
  switch (contentType) {
    case KanbanTaskContentType.VIDEO_WITH_SCRIPT:
      return ContentPostFormat.REELS;
    case KanbanTaskContentType.CAROUSEL:
      return ContentPostFormat.CAROUSEL;
    case KanbanTaskContentType.STORIES_NO_SCRIPT:
      return ContentPostFormat.STORY;
    default:
      return ContentPostFormat.STATIC;
  }
}

export function postFormatLabel(format: ContentPostFormat): string {
  switch (format) {
    case ContentPostFormat.REELS:
      return 'Reels';
    case ContentPostFormat.CAROUSEL:
      return 'Carrossel (feed)';
    case ContentPostFormat.STORY:
      return 'Stories';
    default:
      return 'Feed';
  }
}

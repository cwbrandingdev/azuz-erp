import { KanbanTaskContentType } from '@prisma/client';

export const DEFAULT_TASK_CONTENT_TYPE = KanbanTaskContentType.VIDEO_WITH_SCRIPT;

export const SOCIAL_TASK_CONTENT_TYPES: ReadonlyArray<KanbanTaskContentType> = [
  KanbanTaskContentType.VIDEO_WITH_SCRIPT,
  KanbanTaskContentType.STATIC,
  KanbanTaskContentType.CAROUSEL,
  KanbanTaskContentType.STORIES_NO_SCRIPT,
];

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
  {
    value: KanbanTaskContentType.PRESENTATION,
    label: 'Apresentação',
  },
  {
    value: KanbanTaskContentType.DOCUMENT,
    label: 'Documento',
  },
  {
    value: KanbanTaskContentType.MOCKUP,
    label: 'Mockup',
  },
  {
    value: KanbanTaskContentType.PRINT,
    label: 'Impresso',
  },
];

const SOCIAL_TASK_CONTENT_TYPE_SET = new Set<KanbanTaskContentType>(
  SOCIAL_TASK_CONTENT_TYPES,
);

export function isSocialTaskContentType(
  contentType?: KanbanTaskContentType | null,
) {
  return contentType == null || SOCIAL_TASK_CONTENT_TYPE_SET.has(contentType);
}

export type KanbanTaskContentTypeApi =
  | 'video_with_script'
  | 'static'
  | 'carousel'
  | 'stories_no_script'
  | 'presentation'
  | 'document'
  | 'mockup'
  | 'print';

export function contentTypeToApi(
  contentType: KanbanTaskContentType,
): KanbanTaskContentTypeApi {
  return contentType.toLowerCase() as KanbanTaskContentTypeApi;
}

const KANBAN_TASK_CONTENT_TYPE_SET = new Set<string>(
  TASK_CONTENT_TYPE_DEFINITIONS.map((item) => item.value),
);

export function isKanbanTaskContentType(
  value: unknown,
): value is KanbanTaskContentType {
  return (
    typeof value === 'string' && KANBAN_TASK_CONTENT_TYPE_SET.has(value)
  );
}

export function resolveTaskContentType(
  value?: KanbanTaskContentType | null,
): KanbanTaskContentType {
  return isKanbanTaskContentType(value) ? value : DEFAULT_TASK_CONTENT_TYPE;
}

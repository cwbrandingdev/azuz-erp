import { KanbanTaskContentType } from '@prisma/client';

export type InstagramMediaKind =
  | 'IMAGE'
  | 'VIDEO'
  | 'CAROUSEL_ALBUM'
  | 'STORY'
  | string;

export function mapInstagramMediaToContentType(
  mediaType?: string | null,
  mediaProductType?: string | null,
): KanbanTaskContentType {
  const product = (mediaProductType ?? '').toUpperCase();
  const type = (mediaType ?? '').toUpperCase();

  if (product === 'STORY' || type === 'STORY') {
    return KanbanTaskContentType.STORIES_NO_SCRIPT;
  }
  if (product === 'REELS' || type === 'VIDEO' || type === 'REELS') {
    return KanbanTaskContentType.VIDEO_WITH_SCRIPT;
  }
  if (type === 'CAROUSEL_ALBUM' || product === 'CAROUSEL') {
    return KanbanTaskContentType.CAROUSEL;
  }
  return KanbanTaskContentType.STATIC;
}

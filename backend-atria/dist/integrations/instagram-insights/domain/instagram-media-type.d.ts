import { KanbanTaskContentType } from '@prisma/client';
export type InstagramMediaKind = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'STORY' | string;
export declare function mapInstagramMediaToContentType(mediaType?: string | null, mediaProductType?: string | null): KanbanTaskContentType;

import type { Prisma } from '@prisma/client';
export interface MappedPlace {
    name: string;
    phone?: string;
    email?: string;
    website?: string;
    instagram?: string;
    address?: string;
    city?: string;
    neighborhood?: string;
    category?: string;
    placeId?: string;
    rating?: number;
    reviewsCount?: number;
    latitude?: number;
    longitude?: number;
    source: string;
    rawData: Prisma.InputJsonValue;
}

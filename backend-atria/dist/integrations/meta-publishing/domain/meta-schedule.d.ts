export declare const META_MIN_SCHEDULE_LEAD_MS: number;
export declare const META_MAX_SCHEDULE_LEAD_MS: number;
export declare function resolveMetaPublishAt(publicationDate: Date, now?: Date): {
    publishAtUnix: number | null;
    error?: string;
};

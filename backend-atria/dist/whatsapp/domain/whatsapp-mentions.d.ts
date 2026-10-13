export declare function mentionSlug(name: string): string;
export declare function extractMentionTokens(body: string): string[];
export declare function resolveMentionedUsers<T extends {
    id: string;
    name: string;
}>(body: string, members: T[], actorId?: string): T[];

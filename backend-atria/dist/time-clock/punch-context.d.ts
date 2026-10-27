import type { Request } from 'express';
export interface PunchContext {
    ipAddress: string | null;
    userAgent: string | null;
}
export declare function extractPunchContext(request: Request): PunchContext;

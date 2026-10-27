import type { Request } from 'express';

const MAX_USER_AGENT_LENGTH = 500;

export interface PunchContext {
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Express `trust proxy` is not enabled, so behind a load balancer the
 * socket address is the proxy's; the first X-Forwarded-For hop is used
 * instead. It is informational only, never used for authorization.
 */
export function extractPunchContext(request: Request): PunchContext {
  const forwardedFor = request.headers['x-forwarded-for'];
  const forwarded = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor;
  const ipAddress =
    forwarded?.split(',')[0]?.trim() || request.socket.remoteAddress || null;

  const userAgent = request.headers['user-agent'];
  return {
    ipAddress,
    userAgent: userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
  };
}

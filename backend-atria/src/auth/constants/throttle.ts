export const AUTH_THROTTLE = {
  default: { limit: 10, ttl: 60_000 },
} as const;

export const PUBLIC_THROTTLE = {
  default: { limit: 30, ttl: 60_000 },
} as const;

import { Prisma } from '@prisma/client';

export const latestCallInclude = {
  calls: {
    where: { outcome: { not: 'SKIPPED' } },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: {
      id: true,
      outcome: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.LeadInclude;

export type LeadWithLatestCall = Prisma.LeadGetPayload<{
  include: typeof latestCallInclude;
}>;

export function mapLeadLastCall(lead: LeadWithLatestCall) {
  const lastCall = lead.calls?.[0];
  if (!lastCall) {
    return null;
  }
  return {
    id: lastCall.id,
    outcome: lastCall.outcome,
    createdAt: lastCall.createdAt.toISOString(),
    user: lastCall.user,
  };
}
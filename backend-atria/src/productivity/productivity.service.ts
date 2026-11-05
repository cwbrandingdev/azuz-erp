import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DeliverableItemStatus,
  Prisma,
  RoleName,
  WhatsAppCrmEventType,
  WhatsAppMessageDirection,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { normalizeRoleName } from '../auth/constants/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProductivityDto } from './dto/query-productivity.dto';

const REPORT_ROLES: RoleName[] = [
  RoleName.MASTER,
  RoleName.CRM,
  RoleName.DESIGNER_MASTER,
  RoleName.DESIGNER_JUNIOR,
];

const INTERNAL_APPROVAL_ACTION = 'Revisão interna: aprovada (Aprovar Jhonatan)';
const INTERNAL_REJECTION_ACTION = 'Revisão interna: rejeitada internamente';

export interface ProductivityRow {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: RoleName;
  calls: number;
  callMinutes: number;
  messagesSent: number;
  leadsOnKanban: number;
  meetings: number;
  stageMoves: number;
  tasksCreated: number;
  uploads: number;
  tasksCompleted: number;
  comments: number;
  internalApprovals: number;
  internalRejections: number;
  clientApprovals: number;
  clientAdjustments: number;
}

export interface ProductivityReport {
  from: string | null;
  to: string | null;
  rows: ProductivityRow[];
}

@Injectable()
export class ProductivityService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(
    user: AuthenticatedUser,
    query: QueryProductivityDto,
  ): Promise<ProductivityReport> {
    const range = this.dateRange(query.from, query.to);
    const seeEveryone = this.canSeeEveryone(user.role);
    const roleFilter = seeEveryone
      ? this.parseRoleFilter(query.role)
      : undefined;
    const nameQuery = seeEveryone ? query.q?.trim() : undefined;

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(seeEveryone ? {} : { id: user.userId }),
        role: { name: roleFilter ?? { in: REPORT_ROLES } },
        ...(nameQuery
          ? { name: { contains: nameQuery, mode: 'insensitive' as const } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        role: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    if (users.length === 0) {
      return { from: query.from ?? null, to: query.to ?? null, rows: [] };
    }

    const userIds = users.map((person) => person.id);
    const createdAt = range ? { createdAt: range } : {};
    const startedAt = range ? { startedAt: range } : {};
    const uploadedAt = range ? { uploadedAt: range } : {};
    const resolvedAt = range
      ? { resolvedAt: range }
      : { resolvedAt: { not: null } };

    const [
      calls,
      messages,
      leads,
      meetings,
      stageMoves,
      tasksCreated,
      uploads,
      tasksCompleted,
      comments,
      reviews,
      portal,
    ] = await Promise.all([
      this.prisma.leadCall.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, ...startedAt },
        _count: { _all: true },
        _sum: { durationSeconds: true },
      }),
      this.prisma.whatsAppMessage.groupBy({
        by: ['sentByUserId'],
        where: {
          sentByUserId: { in: userIds },
          direction: WhatsAppMessageDirection.OUTBOUND,
          isPrivate: false,
          ...createdAt,
        },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['ownerUserId'],
        where: {
          ownerUserId: { in: userIds },
          kanbanTracked: true,
          ...createdAt,
        },
        _count: { _all: true },
      }),
      this.prisma.leadMeeting.groupBy({
        by: ['createdById'],
        where: { createdById: { in: userIds }, ...createdAt },
        _count: { _all: true },
      }),
      this.prisma.whatsAppCrmEvent.groupBy({
        by: ['actorUserId'],
        where: {
          actorUserId: { in: userIds },
          type: WhatsAppCrmEventType.STAGE_CHANGE,
          ...createdAt,
        },
        _count: { _all: true },
      }),
      this.prisma.kanbanTask.groupBy({
        by: ['createdById'],
        where: {
          createdById: { in: userIds },
          deletedAt: null,
          ...createdAt,
        },
        _count: { _all: true },
      }),
      this.prisma.kanbanTaskAsset.groupBy({
        by: ['uploadedById'],
        where: { uploadedById: { in: userIds }, ...uploadedAt },
        _count: { _all: true },
      }),
      this.prisma.kanbanTaskAssignee.groupBy({
        by: ['userId'],
        where: {
          userId: { in: userIds },
          task: { deletedAt: null, ...resolvedAt },
        },
        _count: { _all: true },
      }),
      this.prisma.taskComment.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, ...createdAt },
        _count: { _all: true },
      }),
      this.prisma.taskHistory.groupBy({
        by: ['userId', 'action'],
        where: {
          userId: { in: userIds },
          action: {
            in: [INTERNAL_APPROVAL_ACTION, INTERNAL_REJECTION_ACTION],
          },
          ...createdAt,
        },
        _count: { _all: true },
      }),
      this.countPortalOutcomes(userIds, range),
    ]);

    const callCounts = this.countBy(calls, 'userId');
    const callSeconds = new Map<string, number>();
    for (const row of calls) {
      callSeconds.set(row.userId, row._sum.durationSeconds ?? 0);
    }

    const messageCounts = this.countBy(messages, 'sentByUserId');
    const leadCounts = this.countBy(leads, 'ownerUserId');
    const meetingCounts = this.countBy(meetings, 'createdById');
    const stageCounts = this.countBy(stageMoves, 'actorUserId');
    const createdCounts = this.countBy(tasksCreated, 'createdById');
    const uploadCounts = this.countBy(uploads, 'uploadedById');
    const completedCounts = this.countBy(tasksCompleted, 'userId');
    const commentCounts = this.countBy(comments, 'userId');

    const approvalCounts = new Map<string, number>();
    const rejectionCounts = new Map<string, number>();
    for (const row of reviews) {
      const target =
        row.action === INTERNAL_APPROVAL_ACTION
          ? approvalCounts
          : rejectionCounts;
      target.set(row.userId, row._count._all);
    }

    const rows: ProductivityRow[] = users.map((person) => ({
      userId: person.id,
      name: person.name,
      avatarUrl: person.avatarUrl,
      role: person.role.name,
      calls: callCounts.get(person.id) ?? 0,
      callMinutes: this.toMinutes(callSeconds.get(person.id) ?? 0),
      messagesSent: messageCounts.get(person.id) ?? 0,
      leadsOnKanban: leadCounts.get(person.id) ?? 0,
      meetings: meetingCounts.get(person.id) ?? 0,
      stageMoves: stageCounts.get(person.id) ?? 0,
      tasksCreated: createdCounts.get(person.id) ?? 0,
      uploads: uploadCounts.get(person.id) ?? 0,
      tasksCompleted: completedCounts.get(person.id) ?? 0,
      comments: commentCounts.get(person.id) ?? 0,
      internalApprovals: approvalCounts.get(person.id) ?? 0,
      internalRejections: rejectionCounts.get(person.id) ?? 0,
      clientApprovals: portal.approvals.get(person.id) ?? 0,
      clientAdjustments: portal.adjustments.get(person.id) ?? 0,
    }));

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      rows,
    };
  }

  private canSeeEveryone(role: string): boolean {
    const name = normalizeRoleName(role);
    return name === RoleName.MASTER || name === RoleName.ADMIN;
  }

  private parseRoleFilter(role?: string): RoleName | undefined {
    const trimmed = role?.trim();
    if (!trimmed) return undefined;
    const normalized = normalizeRoleName(trimmed);
    if (!normalized || !REPORT_ROLES.includes(normalized)) {
      throw new BadRequestException('Cargo inválido.');
    }
    return normalized;
  }

  private dateRange(
    from?: string,
    to?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    const filter: Prisma.DateTimeFilter = {};
    if (from) filter.gte = new Date(from);
    if (to) filter.lte = new Date(to);
    if (
      filter.gte instanceof Date &&
      filter.lte instanceof Date &&
      filter.gte.getTime() > filter.lte.getTime()
    ) {
      throw new BadRequestException(
        'A data inicial precisa ser anterior à data final.',
      );
    }
    return filter;
  }

  private toMinutes(seconds: number): number {
    return Math.round((seconds / 60) * 10) / 10;
  }

  private countBy<T extends Record<string, unknown>>(
    rows: T[],
    key: keyof T & string,
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of rows) {
      const id = row[key];
      if (typeof id !== 'string' || !id) continue;
      const count = row._count;
      const total =
        count &&
        typeof count === 'object' &&
        '_all' in count &&
        typeof count._all === 'number'
          ? count._all
          : 0;
      map.set(id, total);
    }
    return map;
  }

  private async countPortalOutcomes(
    userIds: string[],
    range: Prisma.DateTimeFilter | undefined,
  ): Promise<{
    approvals: Map<string, number>;
    adjustments: Map<string, number>;
  }> {
    const approvals = new Map<string, number>();
    const adjustments = new Map<string, number>();
    if (userIds.length === 0) {
      return { approvals, adjustments };
    }

    const from = range?.gte instanceof Date ? range.gte : undefined;
    const to = range?.lte instanceof Date ? range.lte : undefined;

    const outcomeRows = await this.prisma.$queryRaw<
      Array<{ userId: string; status: string; count: number }>
    >(Prisma.sql`
      SELECT a."uploadedById" AS "userId",
             i.status::text AS status,
             COUNT(*)::int AS count
      FROM deliverable_items i
      INNER JOIN "KanbanTaskAsset" a ON a.id = i."sourceAssetId"
      WHERE i.status::text IN (
        ${DeliverableItemStatus.APPROVED},
        ${DeliverableItemStatus.REQUIRES_ADJUSTMENT}
      )
        AND a."uploadedById" IN (${Prisma.join(userIds)})
        ${from ? Prisma.sql`AND i."updatedAt" >= ${from}` : Prisma.empty}
        ${to ? Prisma.sql`AND i."updatedAt" <= ${to}` : Prisma.empty}
      GROUP BY a."uploadedById", i.status
    `);

    for (const row of outcomeRows) {
      const total = Number(row.count) || 0;
      const target =
        row.status === DeliverableItemStatus.APPROVED ? approvals : adjustments;
      target.set(row.userId, total);
    }

    return { approvals, adjustments };
  }
}

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductivityService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const permissions_1 = require("../auth/constants/permissions");
const prisma_service_1 = require("../prisma/prisma.service");
const REPORT_ROLES = [
    client_1.RoleName.MASTER,
    client_1.RoleName.CRM,
    client_1.RoleName.DESIGNER_MASTER,
    client_1.RoleName.DESIGNER_JUNIOR,
];
const INTERNAL_APPROVAL_ACTION = 'Revisão interna: aprovada (Aprovar Jhonatan)';
const INTERNAL_REJECTION_ACTION = 'Revisão interna: rejeitada internamente';
let ProductivityService = class ProductivityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getReport(user, query) {
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
                    ? { name: { contains: nameQuery, mode: 'insensitive' } }
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
        const [calls, messages, leads, meetings, stageMoves, tasksCreated, uploads, tasksCompleted, comments, reviews, portal,] = await Promise.all([
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
                    direction: client_1.WhatsAppMessageDirection.OUTBOUND,
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
                    type: client_1.WhatsAppCrmEventType.STAGE_CHANGE,
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
        const callSeconds = new Map();
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
        const approvalCounts = new Map();
        const rejectionCounts = new Map();
        for (const row of reviews) {
            const target = row.action === INTERNAL_APPROVAL_ACTION
                ? approvalCounts
                : rejectionCounts;
            target.set(row.userId, row._count._all);
        }
        const rows = users.map((person) => ({
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
    canSeeEveryone(role) {
        const name = (0, permissions_1.normalizeRoleName)(role);
        return name === client_1.RoleName.MASTER || name === client_1.RoleName.ADMIN;
    }
    parseRoleFilter(role) {
        const trimmed = role?.trim();
        if (!trimmed)
            return undefined;
        const normalized = (0, permissions_1.normalizeRoleName)(trimmed);
        if (!normalized || !REPORT_ROLES.includes(normalized)) {
            throw new common_1.BadRequestException('Cargo inválido.');
        }
        return normalized;
    }
    dateRange(from, to) {
        if (!from && !to)
            return undefined;
        const filter = {};
        if (from)
            filter.gte = new Date(from);
        if (to)
            filter.lte = new Date(to);
        if (filter.gte instanceof Date &&
            filter.lte instanceof Date &&
            filter.gte.getTime() > filter.lte.getTime()) {
            throw new common_1.BadRequestException('A data inicial precisa ser anterior à data final.');
        }
        return filter;
    }
    toMinutes(seconds) {
        return Math.round((seconds / 60) * 10) / 10;
    }
    countBy(rows, key) {
        const map = new Map();
        for (const row of rows) {
            const id = row[key];
            if (typeof id !== 'string' || !id)
                continue;
            const count = row._count;
            const total = count &&
                typeof count === 'object' &&
                '_all' in count &&
                typeof count._all === 'number'
                ? count._all
                : 0;
            map.set(id, total);
        }
        return map;
    }
    async countPortalOutcomes(userIds, range) {
        const approvals = new Map();
        const adjustments = new Map();
        if (userIds.length === 0) {
            return { approvals, adjustments };
        }
        const from = range?.gte instanceof Date ? range.gte : undefined;
        const to = range?.lte instanceof Date ? range.lte : undefined;
        const outcomeRows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT a."uploadedById" AS "userId",
             i.status::text AS status,
             COUNT(*)::int AS count
      FROM deliverable_items i
      INNER JOIN "KanbanTaskAsset" a ON a.id = i."sourceAssetId"
      WHERE i.status::text IN (
        ${client_1.DeliverableItemStatus.APPROVED},
        ${client_1.DeliverableItemStatus.REQUIRES_ADJUSTMENT}
      )
        AND a."uploadedById" IN (${client_1.Prisma.join(userIds)})
        ${from ? client_1.Prisma.sql `AND i."updatedAt" >= ${from}` : client_1.Prisma.empty}
        ${to ? client_1.Prisma.sql `AND i."updatedAt" <= ${to}` : client_1.Prisma.empty}
      GROUP BY a."uploadedById", i.status
    `);
        for (const row of outcomeRows) {
            const total = Number(row.count) || 0;
            const target = row.status === client_1.DeliverableItemStatus.APPROVED ? approvals : adjustments;
            target.set(row.userId, total);
        }
        return { approvals, adjustments };
    }
};
exports.ProductivityService = ProductivityService;
exports.ProductivityService = ProductivityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductivityService);
//# sourceMappingURL=productivity.service.js.map
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const rbac_1 = require("../auth/utils/rbac");
const prisma_service_1 = require("../prisma/prisma.service");
const kanban_service_1 = require("../kanban/kanban.service");
const kanban_defaults_1 = require("../kanban/kanban-defaults");
const kanban_status_1 = require("../kanban/kanban-status");
const production_phase_1 = require("../kanban/production-phase");
const kanban_task_mapper_1 = require("../kanban/kanban-task.mapper");
const calendar_event_query_1 = require("./calendar-event-query");
const CATEGORY_COLORS = {
    MEETING: '#004949',
    DEADLINE: '#E8C39E',
    PUBLISH: '#006666',
    OTHER: '#8B7355',
};
const MEMBER_COLORS = [
    '#004949',
    '#E8C39E',
    '#006666',
    '#2D6A6A',
    '#8B7355',
    '#C4A882',
];
const CLIENT_COLORS = [
    '#8B5CF6',
    '#06B6D4',
    '#3B82F6',
    '#F97316',
    '#EC4899',
    '#10B981',
    '#F59E0B',
    '#6366F1',
    '#14B8A6',
    '#EF4444',
];
const eventInclude = {
    createdBy: { select: { id: true, name: true, avatarUrl: true } },
    assignee: { select: { id: true, name: true, avatarUrl: true } },
    assignedGroup: {
        select: {
            id: true,
            name: true,
            color: true,
            members: { select: { userId: true } },
            users: { select: { id: true } },
        },
    },
    client: {
        select: {
            id: true,
            companyName: true,
            avatarUrl: true,
        },
    },
    kanbanTask: {
        select: {
            id: true,
            title: true,
            description: true,
            status: true,
            productionPhase: true,
            contentType: true,
            dueDate: true,
            publicationDate: true,
            deliveryDate: true,
            clientId: true,
            companyId: true,
            createdAt: true,
            deletedAt: true,
            client: {
                select: {
                    id: true,
                    companyName: true,
                    avatarUrl: true,
                },
            },
        },
    },
};
let CalendarService = class CalendarService {
    prisma;
    kanbanService;
    constructor(prisma, kanbanService) {
        this.prisma = prisma;
        this.kanbanService = kanbanService;
    }
    async getTeamMembers() {
        const users = await this.prisma.user.findMany({
            where: {
                category: client_1.UserCategory.MEMBER,
                isActive: true,
            },
            select: { id: true, name: true, email: true, avatarUrl: true },
            orderBy: { name: 'asc' },
        });
        return users.map((user, index) => ({
            ...user,
            color: MEMBER_COLORS[index % MEMBER_COLORS.length],
        }));
    }
    async getEvents(query) {
        const events = await this.prisma.calendarEvent.findMany({
            where: (0, calendar_event_query_1.buildCalendarGridWhere)({
                from: query.from,
                to: query.to,
                clientId: query.clientId,
            }),
            include: eventInclude,
        });
        const mapped = events
            .filter((event) => !event.kanbanTask?.deletedAt)
            .map((event) => this.toEventResponse(event))
            .sort((left, right) => new Date(left.publicationDate).getTime() -
            new Date(right.publicationDate).getTime());
        if (!query.includeUnmapped) {
            return mapped;
        }
        const unmappedTasks = await this.prisma.kanbanTask.findMany({
            where: (0, calendar_event_query_1.buildUnmappedCalendarTasksWhere)({ clientId: query.clientId }),
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                productionPhase: true,
                contentType: true,
                dueDate: true,
                publicationDate: true,
                deliveryDate: true,
                clientId: true,
                companyId: true,
                createdAt: true,
                client: {
                    select: {
                        id: true,
                        companyName: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return {
            events: mapped,
            unmapped: unmappedTasks.map((task) => (0, kanban_task_mapper_1.toUnifiedTaskCore)(task)),
        };
    }
    async createEvent(userId, dto) {
        if (dto.clientId) {
            await this.ensureClientExists(dto.clientId);
        }
        if (dto.assignedGroupId) {
            await this.ensureGroupExists(dto.assignedGroupId);
        }
        const status = kanban_defaults_1.DEFAULT_TASK_STATUS;
        const color = dto.color ?? kanban_status_1.STATUS_COLORS[status];
        const event = await this.prisma.calendarEvent.create({
            data: {
                title: dto.title,
                description: dto.description,
                startAt: new Date(dto.startAt),
                endAt: new Date(dto.endAt),
                category: dto.category,
                color,
                referenceUrl: dto.referenceUrl,
                isPending: dto.isPending ?? false,
                assigneeId: dto.assigneeId,
                assignedGroupId: dto.assignedGroupId,
                clientId: dto.clientId,
                createdById: userId,
            },
            include: eventInclude,
        });
        if (dto.createKanbanTask !== false) {
            await this.kanbanService.getColumns();
            const column = await this.prisma.kanbanColumn.findFirst({
                where: { statusKey: status },
                orderBy: { order: 'asc' },
            });
            if (column) {
                await this.kanbanService.createTask(userId, {
                    title: dto.title,
                    description: dto.description,
                    columnId: column.id,
                    status,
                    clientId: dto.clientId,
                    dueDate: dto.endAt,
                    publicationDate: dto.startAt,
                    deliveryDate: dto.endAt,
                    assigneeIds: dto.assigneeId ? [dto.assigneeId] : undefined,
                    assignedGroupId: dto.assignedGroupId,
                    referenceUrl: dto.referenceUrl,
                    calendarEventId: event.id,
                });
            }
        }
        const refreshed = await this.prisma.calendarEvent.findUnique({
            where: { id: event.id },
            include: eventInclude,
        });
        return this.toEventResponse(refreshed ?? event);
    }
    async updateEvent(id, userId, role, dto) {
        const existing = await this.ensureEventExists(id);
        (0, rbac_1.assertCalendarEventEditAccess)(role, userId, existing);
        if (dto.clientId) {
            await this.ensureClientExists(dto.clientId);
        }
        if (dto.assignedGroupId) {
            await this.ensureGroupExists(dto.assignedGroupId);
        }
        const { status, ...rest } = dto;
        const linkedTask = await this.prisma.kanbanTask.findFirst({
            where: { calendarEventId: id },
            select: { id: true },
        });
        if (status && linkedTask) {
            await this.kanbanService.updateTask(userId, role, linkedTask.id, {
                status,
            });
        }
        if (linkedTask && (rest.startAt || rest.endAt)) {
            await this.prisma.kanbanTask.update({
                where: { id: linkedTask.id },
                data: {
                    ...(rest.startAt
                        ? { publicationDate: new Date(rest.startAt) }
                        : {}),
                    ...(rest.endAt
                        ? {
                            deliveryDate: new Date(rest.endAt),
                            dueDate: new Date(rest.endAt),
                        }
                        : {}),
                },
            });
        }
        const eventData = {
            title: rest.title,
            description: rest.description,
            startAt: rest.startAt ? new Date(rest.startAt) : undefined,
            endAt: rest.endAt ? new Date(rest.endAt) : undefined,
            category: rest.category,
            color: status ? kanban_status_1.STATUS_COLORS[status] : rest.color,
            isPending: rest.isPending,
            assigneeId: rest.assigneeId === null ? null : rest.assigneeId,
            assignedGroupId: rest.assignedGroupId === null ? null : rest.assignedGroupId,
            clientId: rest.clientId === null ? null : rest.clientId,
            referenceUrl: rest.referenceUrl === null || rest.referenceUrl === ''
                ? null
                : rest.referenceUrl,
        };
        const hasEventUpdates = status !== undefined ||
            Object.values(rest).some((value) => value !== undefined);
        if (hasEventUpdates) {
            await this.prisma.calendarEvent.update({
                where: { id },
                data: eventData,
            });
        }
        const event = await this.prisma.calendarEvent.findUnique({
            where: { id },
            include: eventInclude,
        });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        return this.toEventResponse(event);
    }
    async deleteEvent(id, userId, role) {
        const existing = await this.ensureEventExists(id);
        (0, rbac_1.assertCalendarEventEditAccess)(role, userId, existing);
        await this.prisma.calendarEvent.delete({ where: { id } });
    }
    async syncEventFromPost(post, userId) {
        if (!post.scheduledDate) {
            await this.prisma.calendarEvent.deleteMany({
                where: { contentPostId: post.id },
            });
            return null;
        }
        const startAt = new Date(post.scheduledDate);
        const endAt = new Date(startAt);
        endAt.setHours(endAt.getHours() + 1);
        const existing = await this.prisma.calendarEvent.findFirst({
            where: { contentPostId: post.id },
        });
        const data = {
            title: post.title,
            startAt,
            endAt,
            category: client_1.EventCategory.PUBLISH,
            clientId: post.clientId,
            referenceUrl: post.referenceUrl,
            isPending: false,
            color: kanban_status_1.STATUS_COLORS[kanban_defaults_1.DEFAULT_TASK_STATUS],
        };
        if (existing) {
            const event = await this.prisma.calendarEvent.update({
                where: { id: existing.id },
                data,
                include: eventInclude,
            });
            return this.toEventResponse(event);
        }
        const event = await this.prisma.calendarEvent.create({
            data: {
                ...data,
                contentPostId: post.id,
                createdById: userId,
            },
            include: eventInclude,
        });
        return this.toEventResponse(event);
    }
    async ensureEventExists(id) {
        const event = await this.prisma.calendarEvent.findUnique({
            where: { id },
            include: {
                assignedGroup: {
                    select: {
                        members: { select: { userId: true } },
                        users: { select: { id: true } },
                    },
                },
            },
        });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        return event;
    }
    async ensureGroupExists(id) {
        const group = await this.prisma.userGroup.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        return group;
    }
    async ensureClientExists(id) {
        const client = await this.prisma.client.findUnique({ where: { id } });
        if (!client)
            throw new common_1.NotFoundException('Client not found');
        return client;
    }
    getClientColor(clientId) {
        let hash = 0;
        for (let i = 0; i < clientId.length; i++) {
            hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return CLIENT_COLORS[Math.abs(hash) % CLIENT_COLORS.length];
    }
    toEventResponse(event) {
        const clientColor = event.client
            ? this.getClientColor(event.client.id)
            : null;
        const taskStatus = event.kanbanTask?.status
            ? (0, kanban_status_1.statusToApi)(event.kanbanTask.status)
            : this.resolveStatusFromColor(event.color);
        const productionPhase = event.kanbanTask?.productionPhase
            ? (0, production_phase_1.phaseToApi)(event.kanbanTask.productionPhase)
            : null;
        const taskStatusColor = taskStatus
            ? (0, production_phase_1.resolveTaskDisplayColor)(event.kanbanTask?.status ??
                kanban_status_1.KANBAN_STATUS_DEFINITIONS.find((def) => (0, kanban_status_1.statusToApi)(def.status) === taskStatus).status, event.kanbanTask?.productionPhase, kanban_status_1.STATUS_COLORS)
            : null;
        const publicationDate = event.kanbanTask?.publicationDate ?? event.startAt;
        return {
            id: event.id,
            title: event.title,
            description: event.description,
            publicationDate: publicationDate.toISOString(),
            startAt: publicationDate.toISOString(),
            endAt: event.endAt.toISOString(),
            category: event.category.toLowerCase(),
            color: taskStatusColor ??
                clientColor ??
                event.color ??
                CATEGORY_COLORS[event.category] ??
                '#004949',
            referenceUrl: event.referenceUrl,
            isPending: event.isPending,
            kanbanTaskId: event.kanbanTask?.id ?? null,
            taskStatus,
            productionPhase,
            taskStatusColor,
            task: event.kanbanTask ? (0, kanban_task_mapper_1.toUnifiedTaskCore)(event.kanbanTask) : null,
            clientId: event.clientId,
            client: event.client
                ? {
                    id: event.client.id,
                    name: event.client.companyName,
                    companyName: event.client.companyName,
                    avatarUrl: event.client.avatarUrl,
                    color: clientColor,
                }
                : null,
            createdBy: event.createdBy,
            assignee: event.assignee,
            assignedGroupId: event.assignedGroupId,
            assignedGroup: event.assignedGroup
                ? {
                    id: event.assignedGroup.id,
                    name: event.assignedGroup.name,
                    color: event.assignedGroup.color,
                }
                : null,
        };
    }
    resolveStatusFromColor(color) {
        if (!color)
            return null;
        const normalized = color.toLowerCase();
        const match = kanban_status_1.KANBAN_STATUS_DEFINITIONS.find((def) => def.color.toLowerCase() === normalized);
        return match ? (0, kanban_status_1.statusToApi)(match.status) : null;
    }
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => kanban_service_1.KanbanService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        kanban_service_1.KanbanService])
], CalendarService);
//# sourceMappingURL=calendar.service.js.map
import { ContentPost } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KanbanService } from '../kanban/kanban.service';
import { type UnifiedTaskCore } from '../kanban/kanban-task.mapper';
import { CreateEventDto, QueryEventsDto, UpdateEventDto } from './dto/event.dto';
type CalendarEventResponse = ReturnType<CalendarService['toEventResponse']>;
export type CalendarEventsResult = CalendarEventResponse[] | {
    events: CalendarEventResponse[];
    unmapped: UnifiedTaskCore[];
};
export declare class CalendarService {
    private readonly prisma;
    private readonly kanbanService;
    constructor(prisma: PrismaService, kanbanService: KanbanService);
    getTeamMembers(): Promise<{
        color: string;
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
    }[]>;
    getEvents(query: QueryEventsDto & {
        includeUnmapped: true;
    }): Promise<{
        events: CalendarEventResponse[];
        unmapped: UnifiedTaskCore[];
    }>;
    getEvents(query: QueryEventsDto): Promise<CalendarEventResponse[]>;
    createEvent(userId: string, dto: CreateEventDto): Promise<{
        id: string;
        title: string;
        description: string | null;
        publicationDate: string;
        startAt: string;
        endAt: string;
        category: string;
        color: string;
        referenceUrl: string | null;
        isPending: boolean;
        kanbanTaskId: string | null;
        taskStatus: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
        productionPhase: import("../kanban/production-phase").ProductionPhaseApi | null;
        taskStatusColor: string | null;
        task: UnifiedTaskCore | null;
        clientId: string | null;
        client: {
            id: string;
            name: string;
            companyName: string;
            avatarUrl: string | null;
            color: string;
        } | null;
        createdBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        assignee: {
            id: string;
            name: string;
            avatarUrl: string | null;
        } | null;
        assignedGroupId: string | null;
        assignedGroup: {
            id: string;
            name: string;
            color: string;
        } | null;
    }>;
    updateEvent(id: string, userId: string, role: string, dto: UpdateEventDto): Promise<{
        id: string;
        title: string;
        description: string | null;
        publicationDate: string;
        startAt: string;
        endAt: string;
        category: string;
        color: string;
        referenceUrl: string | null;
        isPending: boolean;
        kanbanTaskId: string | null;
        taskStatus: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
        productionPhase: import("../kanban/production-phase").ProductionPhaseApi | null;
        taskStatusColor: string | null;
        task: UnifiedTaskCore | null;
        clientId: string | null;
        client: {
            id: string;
            name: string;
            companyName: string;
            avatarUrl: string | null;
            color: string;
        } | null;
        createdBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        assignee: {
            id: string;
            name: string;
            avatarUrl: string | null;
        } | null;
        assignedGroupId: string | null;
        assignedGroup: {
            id: string;
            name: string;
            color: string;
        } | null;
    }>;
    deleteEvent(id: string, userId: string, role: string): Promise<void>;
    syncEventFromPost(post: ContentPost, userId: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        publicationDate: string;
        startAt: string;
        endAt: string;
        category: string;
        color: string;
        referenceUrl: string | null;
        isPending: boolean;
        kanbanTaskId: string | null;
        taskStatus: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
        productionPhase: import("../kanban/production-phase").ProductionPhaseApi | null;
        taskStatusColor: string | null;
        task: UnifiedTaskCore | null;
        clientId: string | null;
        client: {
            id: string;
            name: string;
            companyName: string;
            avatarUrl: string | null;
            color: string;
        } | null;
        createdBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        assignee: {
            id: string;
            name: string;
            avatarUrl: string | null;
        } | null;
        assignedGroupId: string | null;
        assignedGroup: {
            id: string;
            name: string;
            color: string;
        } | null;
    } | null>;
    private ensureEventExists;
    private ensureGroupExists;
    private ensureClientExists;
    private getClientColor;
    private toEventResponse;
    private resolveStatusFromColor;
}
export {};

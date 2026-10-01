import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CalendarService } from './calendar.service';
import { CreateEventDto, QueryEventsDto, UpdateEventDto } from './dto/event.dto';
export declare class CalendarController {
    private readonly calendarService;
    constructor(calendarService: CalendarService);
    getTeamMembers(): Promise<{
        color: string;
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
    }[]>;
    getEvents(query: QueryEventsDto): Promise<{
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
        task: import("../kanban/kanban-task.mapper").UnifiedTaskCore | null;
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
    }[]>;
    createEvent(user: AuthenticatedUser, dto: CreateEventDto): Promise<{
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
        task: import("../kanban/kanban-task.mapper").UnifiedTaskCore | null;
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
    updateEvent(user: AuthenticatedUser, id: string, dto: UpdateEventDto): Promise<{
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
        task: import("../kanban/kanban-task.mapper").UnifiedTaskCore | null;
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
    deleteEvent(user: AuthenticatedUser, id: string): Promise<void>;
}

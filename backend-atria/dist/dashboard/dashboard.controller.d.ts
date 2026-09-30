import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getOverview(user: AuthenticatedUser): Promise<{
        user: {
            name: string;
            notificationCount: number;
        };
        finance: {
            revenue: number;
            expenses: number;
            netProfit: number;
            monthlyTrend: Array<{
                month: string;
                income: number;
                expense: number;
            }>;
        };
        contentAndMeta: {
            topCampaign: {
                id: string;
                name: string;
                roas: number;
                spend: number;
                ctr: number;
                status: import("../meta-insights/meta-insights.service").CampaignStatus;
            } | null;
            scheduledPosts: {
                id: string;
                title: string;
                platform: string;
                scheduledDate: string;
            }[];
        };
        calendar: {
            todayMeetings: {
                id: string;
                title: string;
                startAt: string;
                endAt: string;
                category: string;
                color: string;
                isPending: boolean;
            }[];
        };
        kanban: {
            myTasks: {
                id: string;
                title: string;
                column: string;
                priority: string;
            }[];
        };
    }>;
    getTvMonitoring(): Promise<{
        generatedAt: string;
        tasks: {
            delivery: {
                tasks: {
                    taskCreated: Array<{
                        id: string;
                        title: string;
                        status: string;
                        priority: string;
                        dueDate: string | null;
                        clientName: string | null;
                    }>;
                    awaitingJhonatan: Array<{
                        id: string;
                        title: string;
                        status: string;
                        priority: string;
                        dueDate: string | null;
                        clientName: string | null;
                    }>;
                    awaitingClient: Array<{
                        id: string;
                        title: string;
                        status: string;
                        priority: string;
                        dueDate: string | null;
                        clientName: string | null;
                    }>;
                };
                taskCreated: number;
                awaitingJhonatan: number;
                awaitingClient: number;
                total: number;
            };
            urgent: {
                id: string;
                title: string;
                status: import("../kanban/kanban-status").KanbanTaskStatusApi;
                priority: string;
                dueDate: string | null;
                slaResolutionDueAt: string | null;
                clientName: string | null;
                urgency: string;
            }[];
        };
        leads: {
            stages: {
                count: number;
                status: string;
                label: string;
                color: string;
            }[];
            totalActive: number;
        };
        finance: {
            period: {
                month: number;
                year: number;
            };
            totalRevenue: number;
            totalExpenses: number;
            netProfit: number;
            profitMargin: number;
            pendingReceivables: number;
            pendingPayables: number;
            pendingReceivablesCount: number;
            pendingPayablesCount: number;
            overdueReceivables: number;
            overduePayables: number;
            overdueReceivablesCount: number;
            overduePayablesCount: number;
        };
    }>;
}

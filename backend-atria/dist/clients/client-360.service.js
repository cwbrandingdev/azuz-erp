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
exports.Client360Service = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const meta_insights_service_1 = require("../meta-insights/meta-insights.service");
const prisma_service_1 = require("../prisma/prisma.service");
const client_360_dto_1 = require("./dto/client-360.dto");
const PLATFORM_COLORS = {
    INSTAGRAM: '#E1306C',
    TIKTOK: '#000000',
    YOUTUBE: '#FF0000',
    LINKEDIN: '#0A66C2',
};
const userSelect = { id: true, name: true, avatarUrl: true };
function toLowerEnum(value) {
    return value.toLowerCase();
}
function computeMrr(contracts) {
    return contracts
        .filter((c) => c.status === client_1.ContractStatus.SIGNED)
        .reduce((sum, contract) => {
        const value = Number(contract.recurringValue);
        return (sum +
            (contract.paymentFrequency === 'MONTHLY' ? value : value / 12));
    }, 0);
}
function computeHealth(input) {
    if (input.overdueTasks > 2 ||
        (input.signedContracts === 0 && input.unsignedContracts > 0)) {
        return 'at_risk';
    }
    if (input.overdueTasks > 0 ||
        input.unsignedContracts > 0 ||
        input.pendingApprovals > 3) {
        return 'attention';
    }
    return 'healthy';
}
let Client360Service = class Client360Service {
    prisma;
    metaInsights;
    constructor(prisma, metaInsights) {
        this.prisma = prisma;
        this.metaInsights = metaInsights;
    }
    async getSection(clientId, section = client_360_dto_1.Client360Section.SUMMARY) {
        await this.ensureClientExists(clientId);
        switch (section) {
            case client_360_dto_1.Client360Section.PIPELINE:
                return this.getPipeline(clientId);
            case client_360_dto_1.Client360Section.FINANCIAL:
                return this.getFinancial(clientId);
            case client_360_dto_1.Client360Section.CALENDAR:
                return this.getCalendar(clientId);
            case client_360_dto_1.Client360Section.ASSETS:
                return this.getAssets(clientId);
            case client_360_dto_1.Client360Section.TASKS:
                return this.getTasks(clientId);
            case client_360_dto_1.Client360Section.SUMMARY:
            default:
                return this.getSummary(clientId);
        }
    }
    async getSummary(clientId) {
        const now = new Date();
        const [client, contracts, overdueTasks, pendingApprovals, openTasks, scheduledPosts,] = await Promise.all([
            this.prisma.client.findUnique({
                where: { id: clientId },
                include: {
                    clientGroup: true,
                    _count: { select: { posts: true, assets: true, contracts: true } },
                },
            }),
            this.prisma.contract.findMany({
                where: { clientId },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    recurringValue: true,
                    paymentFrequency: true,
                    startDate: true,
                    endDate: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.kanbanTask.count({
                where: {
                    clientId,
                    dueDate: { lt: now },
                    column: { type: { not: client_1.KanbanColumnType.DONE } },
                },
            }),
            this.prisma.contentPost.count({
                where: { clientId, status: client_1.ContentPostStatus.PENDING_APPROVAL },
            }),
            this.prisma.kanbanTask.count({
                where: {
                    clientId,
                    column: { type: { not: client_1.KanbanColumnType.DONE } },
                },
            }),
            this.prisma.contentPost.count({
                where: {
                    clientId,
                    status: {
                        in: [client_1.ContentPostStatus.SCHEDULED, client_1.ContentPostStatus.APPROVED],
                    },
                },
            }),
        ]);
        if (!client)
            throw new common_1.NotFoundException('Client not found');
        const signedContracts = contracts.filter((c) => c.status === client_1.ContractStatus.SIGNED);
        const activeContracts = contracts.filter((c) => c.status === client_1.ContractStatus.SIGNED ||
            c.status === client_1.ContractStatus.SENT);
        const unsignedContracts = contracts.filter((c) => c.status === client_1.ContractStatus.DRAFT ||
            c.status === client_1.ContractStatus.SENT);
        const mrr = Math.round(computeMrr(contracts) * 100) / 100;
        const health = computeHealth({
            signedContracts: signedContracts.length,
            unsignedContracts: unsignedContracts.length,
            overdueTasks,
            pendingApprovals,
        });
        return {
            section: 'summary',
            client: {
                id: client.id,
                companyName: client.companyName,
                contactName: client.contactName,
                email: client.email,
                phone: client.phone,
                instagram: client.instagram,
                website: client.website,
                notes: client.notes,
                avatarUrl: client.avatarUrl,
                clientGroup: client.clientGroup
                    ? {
                        id: client.clientGroup.id,
                        name: client.clientGroup.name,
                        color: client.clientGroup.color,
                    }
                    : null,
                postCount: client._count.posts,
                assetCount: client._count.assets,
                contractCount: client._count.contracts,
            },
            metrics: {
                mrr,
                activeContractsCount: activeContracts.length,
                signedContractsCount: signedContracts.length,
                openTasks,
                pendingApprovals,
                scheduledPosts,
                overdueTasks,
            },
            health,
            activeContracts: activeContracts.map((c) => ({
                id: c.id,
                title: c.title,
                status: toLowerEnum(c.status),
                recurringValue: Number(c.recurringValue),
                paymentFrequency: toLowerEnum(c.paymentFrequency),
                startDate: c.startDate.toISOString(),
                endDate: c.endDate?.toISOString() ?? null,
            })),
            insights: this.metaInsights.getClientInsights(clientId),
        };
    }
    async getPipeline(clientId) {
        const [overview, posts, recentVersions] = await Promise.all([
            this.getContentOverview(clientId),
            this.prisma.contentPost.findMany({
                where: { clientId },
                include: {
                    attachments: true,
                    assignee: { select: userSelect },
                    user: { select: userSelect },
                },
                orderBy: { updatedAt: 'desc' },
                take: 30,
            }),
            this.prisma.postVersion.findMany({
                where: { post: { clientId } },
                include: {
                    post: { select: { id: true, title: true } },
                    createdBy: { select: userSelect },
                },
                orderBy: { createdAt: 'desc' },
                take: 15,
            }),
        ]);
        return {
            section: 'pipeline',
            overview,
            posts: posts.map((post) => ({
                id: post.id,
                title: post.title,
                platform: toLowerEnum(post.platform),
                format: toLowerEnum(post.format),
                status: toLowerEnum(post.status),
                scheduledDate: post.scheduledDate?.toISOString() ?? null,
                copy: post.copy.slice(0, 200),
                referenceUrl: post.referenceUrl,
                attachmentCount: post.attachments.length,
                previewUrl: post.attachments[0]?.previewUrl ?? post.attachments[0]?.url ?? null,
                previewMimeType: post.attachments[0]?.mimeType ?? null,
                author: post.user,
                assignee: post.assignee,
                updatedAt: post.updatedAt.toISOString(),
                platformColor: PLATFORM_COLORS[post.platform] ?? '#004949',
            })),
            versionHistory: recentVersions.map((version) => ({
                id: version.id,
                postId: version.postId,
                postTitle: version.post.title,
                versionNumber: version.versionNumber,
                title: version.title,
                copyPreview: version.copyText.slice(0, 160),
                mediaUrls: version.mediaUrls,
                createdBy: version.createdBy,
                createdAt: version.createdAt.toISOString(),
            })),
        };
    }
    async getFinancial(clientId) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const [contracts, monthlyInvoices] = await Promise.all([
            this.prisma.contract.findMany({
                where: { clientId },
                include: {
                    _count: { select: { transactions: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.financialTransaction.findMany({
                where: {
                    deletedAt: null,
                    type: client_1.TransactionType.INCOME,
                    contract: { clientId },
                    date: { gte: monthStart, lte: monthEnd },
                },
                select: {
                    id: true,
                    description: true,
                    amount: true,
                    status: true,
                    date: true,
                    dueDate: true,
                    contractId: true,
                },
                orderBy: { date: 'asc' },
            }),
        ]);
        const mrr = Math.round(computeMrr(contracts) * 100) / 100;
        return {
            section: 'financial',
            mrr,
            contracts: contracts.map((contract) => ({
                id: contract.id,
                title: contract.title,
                status: toLowerEnum(contract.status),
                recurringValue: Number(contract.recurringValue),
                paymentFrequency: toLowerEnum(contract.paymentFrequency),
                startDate: contract.startDate.toISOString(),
                endDate: contract.endDate?.toISOString() ?? null,
                pdfUrl: contract.pdfUrl,
                receivablesCount: contract._count.transactions,
                updatedAt: contract.updatedAt.toISOString(),
            })),
            monthlyInvoicing: {
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                total: monthlyInvoices.reduce((sum, tx) => sum + Number(tx.amount), 0),
                paid: monthlyInvoices
                    .filter((tx) => tx.status === 'PAID')
                    .reduce((sum, tx) => sum + Number(tx.amount), 0),
                pending: monthlyInvoices
                    .filter((tx) => tx.status === 'PENDING')
                    .reduce((sum, tx) => sum + Number(tx.amount), 0),
                items: monthlyInvoices.map((tx) => ({
                    id: tx.id,
                    description: tx.description,
                    amount: Number(tx.amount),
                    status: toLowerEnum(tx.status),
                    date: tx.date.toISOString(),
                    dueDate: tx.dueDate?.toISOString() ?? null,
                    contractId: tx.contractId,
                })),
            },
        };
    }
    async getCalendar(clientId) {
        const now = new Date();
        const horizon = new Date(now);
        horizon.setDate(horizon.getDate() + 60);
        const [events, scheduledPosts] = await Promise.all([
            this.prisma.calendarEvent.findMany({
                where: {
                    clientId,
                    startAt: { gte: now, lte: horizon },
                },
                include: {
                    assignee: { select: userSelect },
                },
                orderBy: { startAt: 'asc' },
                take: 30,
            }),
            this.prisma.contentPost.findMany({
                where: {
                    clientId,
                    scheduledDate: { gte: now, lte: horizon },
                    status: {
                        in: [
                            client_1.ContentPostStatus.SCHEDULED,
                            client_1.ContentPostStatus.APPROVED,
                            client_1.ContentPostStatus.PENDING_APPROVAL,
                        ],
                    },
                },
                select: {
                    id: true,
                    title: true,
                    platform: true,
                    format: true,
                    status: true,
                    scheduledDate: true,
                },
                orderBy: { scheduledDate: 'asc' },
                take: 30,
            }),
        ]);
        const items = [
            ...events.map((event) => ({
                id: event.id,
                type: 'event',
                title: event.title,
                category: toLowerEnum(event.category),
                startAt: event.startAt.toISOString(),
                endAt: event.endAt.toISOString(),
                referenceUrl: event.referenceUrl,
                isPending: event.isPending,
                color: event.color ?? '#004949',
                assignee: event.assignee,
            })),
            ...scheduledPosts.map((post) => ({
                id: post.id,
                type: 'post',
                title: post.title,
                category: 'publish',
                startAt: post.scheduledDate.toISOString(),
                endAt: post.scheduledDate.toISOString(),
                referenceUrl: `/content/${post.id}`,
                isPending: post.status === client_1.ContentPostStatus.PENDING_APPROVAL,
                color: PLATFORM_COLORS[post.platform] ?? '#004949',
                platform: toLowerEnum(post.platform),
                format: toLowerEnum(post.format),
                status: toLowerEnum(post.status),
                assignee: null,
            })),
        ].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        return {
            section: 'calendar',
            items,
            meetings: items.filter((item) => item.type === 'event' && item.category === 'meeting'),
            releases: items.filter((item) => item.type === 'post' ||
                (item.type === 'event' && item.category === 'publish')),
        };
    }
    async getAssets(clientId) {
        const [client, assets] = await Promise.all([
            this.prisma.client.findUnique({
                where: { id: clientId },
                select: {
                    website: true,
                    instagram: true,
                    notes: true,
                },
            }),
            this.prisma.asset.findMany({
                where: { clientId },
                include: {
                    uploadedBy: { select: userSelect },
                },
                orderBy: { uploadedAt: 'desc' },
            }),
        ]);
        const referenceLinks = [];
        if (client?.website) {
            referenceLinks.push({
                label: 'Website',
                url: client.website,
                type: 'website',
            });
        }
        if (client?.instagram) {
            referenceLinks.push({
                label: 'Instagram',
                url: client.instagram.startsWith('http')
                    ? client.instagram
                    : `https://instagram.com/${client.instagram.replace('@', '')}`,
                type: 'instagram',
            });
        }
        const urlPattern = /https?:\/\/[^\s]+/g;
        const noteUrls = client?.notes?.match(urlPattern) ?? [];
        for (const url of noteUrls) {
            const label = url.includes('figma')
                ? 'Figma'
                : url.includes('drive.google')
                    ? 'Google Drive'
                    : 'Link';
            referenceLinks.push({ label, url, type: 'note' });
        }
        const grouped = {
            logo: [],
            brand_guide: [],
            image: [],
            document: [],
        };
        for (const asset of assets) {
            const key = toLowerEnum(asset.fileType);
            if (grouped[key])
                grouped[key].push(this.mapAsset(asset));
            else
                grouped.document.push(this.mapAsset(asset));
        }
        return {
            section: 'assets',
            referenceLinks,
            assets: assets.map((asset) => this.mapAsset(asset)),
            grouped,
            totals: {
                all: assets.length,
                logos: grouped.logo.length,
                brandGuides: grouped.brand_guide.length,
                images: grouped.image.length,
                documents: grouped.document.length,
            },
        };
    }
    async getTasks(clientId) {
        const doneColumn = await this.prisma.kanbanColumn.findFirst({
            where: { type: client_1.KanbanColumnType.DONE },
            select: { id: true },
        });
        const tasks = await this.prisma.kanbanTask.findMany({
            where: {
                clientId,
                ...(doneColumn ? { columnId: { not: doneColumn.id } } : {}),
            },
            include: {
                column: { select: { id: true, title: true, type: true, color: true } },
                assignees: {
                    include: { user: { select: userSelect } },
                },
            },
            orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
            take: 25,
        });
        return {
            section: 'tasks',
            tasks: tasks.map((task) => ({
                id: task.id,
                title: task.title,
                description: task.description,
                referenceUrl: task.referenceUrl,
                priority: toLowerEnum(task.priority),
                dueDate: task.dueDate?.toISOString() ?? null,
                column: {
                    id: task.column.id,
                    title: task.column.title,
                    type: toLowerEnum(task.column.type ?? 'CUSTOM'),
                    color: task.column.color,
                },
                assignees: task.assignees.map((a) => a.user),
                isOverdue: task.dueDate ? task.dueDate < new Date() : false,
                updatedAt: task.updatedAt.toISOString(),
            })),
        };
    }
    mapAsset(asset) {
        return {
            id: asset.id,
            fileName: asset.fileName,
            fileType: toLowerEnum(asset.fileType),
            fileUrl: asset.fileUrl,
            fileSize: asset.fileSize,
            uploadedAt: asset.uploadedAt.toISOString(),
            uploadedBy: asset.uploadedBy,
        };
    }
    async getContentOverview(clientId) {
        const [drafts, pendingApproval, approved, scheduled, published, rejected] = await Promise.all([
            this.prisma.contentPost.count({
                where: { clientId, status: client_1.ContentPostStatus.DRAFT },
            }),
            this.prisma.contentPost.count({
                where: { clientId, status: client_1.ContentPostStatus.PENDING_APPROVAL },
            }),
            this.prisma.contentPost.count({
                where: { clientId, status: client_1.ContentPostStatus.APPROVED },
            }),
            this.prisma.contentPost.count({
                where: { clientId, status: client_1.ContentPostStatus.SCHEDULED },
            }),
            this.prisma.contentPost.count({
                where: { clientId, status: client_1.ContentPostStatus.PUBLISHED },
            }),
            this.prisma.contentPost.count({
                where: { clientId, status: client_1.ContentPostStatus.REJECTED },
            }),
        ]);
        return {
            drafts,
            pendingApproval,
            approved,
            scheduled,
            published,
            rejected,
            total: drafts + pendingApproval + approved + scheduled + published + rejected,
        };
    }
    async ensureClientExists(clientId) {
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true },
        });
        if (!client)
            throw new common_1.NotFoundException('Client not found');
    }
};
exports.Client360Service = Client360Service;
exports.Client360Service = Client360Service = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        meta_insights_service_1.MetaInsightsService])
], Client360Service);
//# sourceMappingURL=client-360.service.js.map
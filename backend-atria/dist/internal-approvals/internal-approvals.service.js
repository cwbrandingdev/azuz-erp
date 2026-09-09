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
exports.InternalApprovalsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const rbac_1 = require("../auth/utils/rbac");
const deliverables_service_1 = require("../deliverables/deliverables.service");
const prisma_service_1 = require("../prisma/prisma.service");
const pendingTaskInclude = {
    client: {
        select: { id: true, companyName: true, avatarUrl: true },
    },
    createdBy: {
        select: { id: true, name: true, avatarUrl: true },
    },
    assignees: {
        select: {
            user: { select: { id: true, name: true, avatarUrl: true } },
        },
    },
    deliverable: {
        select: {
            id: true,
            approvalStatus: true,
            items: { select: { status: true } },
        },
    },
    _count: { select: { assets: true } },
};
let InternalApprovalsService = class InternalApprovalsService {
    prisma;
    deliverablesService;
    constructor(prisma, deliverablesService) {
        this.prisma = prisma;
        this.deliverablesService = deliverablesService;
    }
    async listPending(role) {
        (0, rbac_1.assertCanPerformInternalApproval)(role);
        const tasks = await this.prisma.kanbanTask.findMany({
            where: {
                deletedAt: null,
                isBypassingInternalReview: false,
                OR: [
                    { internalReviewStatus: client_1.InternalReviewStatus.PENDING },
                    {
                        deliverable: {
                            is: { approvalStatus: client_1.DeliverableApprovalStatus.PENDING_APPROVAL },
                        },
                    },
                ],
            },
            include: pendingTaskInclude,
            orderBy: { updatedAt: 'desc' },
        });
        return tasks.map((task) => this.toPendingResponse(task));
    }
    async approve(id, userId, role, dto = {}) {
        (0, rbac_1.assertCanPerformInternalApproval)(role);
        return this.deliverablesService.approveInternal(id, userId, role, dto.note);
    }
    async submitDelivery(id, userId, role, file, caption) {
        (0, rbac_1.assertCanPerformInternalApproval)(role);
        return this.deliverablesService.submit(id, userId, role, file, caption);
    }
    async requestAdjustment(id, userId, role, dto) {
        (0, rbac_1.assertCanPerformInternalApproval)(role);
        return this.deliverablesService.requestInternalAdjustment(id, userId, role, dto.note);
    }
    toPendingResponse(task) {
        const items = task.deliverable?.items ?? [];
        return {
            id: task.deliverable?.id ?? task.id,
            title: task.title,
            description: task.description,
            postCaption: task.postCaption,
            kanbanTaskId: task.id,
            contentPostId: task.contentPostId,
            approvalStatus: task.deliverable?.approvalStatus.toLowerCase() ?? null,
            internalReviewStatus: task.internalReviewStatus.toLowerCase(),
            internalReviewNote: task.internalReviewNote,
            kanbanStatus: task.status.toLowerCase(),
            publicationDate: task.publicationDate?.toISOString() ?? null,
            deliveryDate: task.deliveryDate?.toISOString() ?? null,
            dueDate: task.dueDate?.toISOString() ?? null,
            assetCount: task._count.assets,
            client: task.client
                ? {
                    id: task.client.id,
                    companyName: task.client.companyName,
                    avatarUrl: task.client.avatarUrl,
                }
                : null,
            createdBy: task.createdBy,
            assignees: task.assignees
                .map((assignee) => assignee.user)
                .filter((user) => Boolean(user)),
            revisionSummary: {
                total: items.length,
                pending: items.filter((item) => item.status === client_1.DeliverableItemStatus.PENDING)
                    .length,
                approved: items.filter((item) => item.status === client_1.DeliverableItemStatus.APPROVED).length,
                requiresAdjustment: items.filter((item) => item.status === client_1.DeliverableItemStatus.REQUIRES_ADJUSTMENT).length,
            },
            updatedAt: task.updatedAt.toISOString(),
            createdAt: task.createdAt.toISOString(),
        };
    }
};
exports.InternalApprovalsService = InternalApprovalsService;
exports.InternalApprovalsService = InternalApprovalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        deliverables_service_1.DeliverablesService])
], InternalApprovalsService);
//# sourceMappingURL=internal-approvals.service.js.map
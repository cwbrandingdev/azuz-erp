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
exports.ClientAccessInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../../prisma/prisma.service");
const PORTAL_CLIENT_ALLOWED_PREFIXES = [
    '/auth',
    '/client-portal',
    '/portal',
    '/users/me',
    '/deliverables',
];
const EXTERNAL_CRM_ALLOWED_PREFIXES = [
    '/auth',
    '/leads',
    '/users/me',
    '/jhonatan-calendar',
];
let ClientAccessInterceptor = class ClientAccessInterceptor {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            return next.handle();
        }
        const role = user.role?.toUpperCase() ?? '';
        const rawUrl = request.originalUrl ?? request.url ?? '';
        const path = rawUrl.split('?')[0];
        if (role === 'EXTERNAL_CLIENT_CRM') {
            const allowed = EXTERNAL_CRM_ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
            if (!allowed) {
                throw new common_1.ForbiddenException('Usuários EXTERNAL_CLIENT_CRM só podem acessar o Kanban de Leads da organização');
            }
            return next.handle();
        }
        if (role !== 'CLIENT') {
            return next.handle();
        }
        const allowedPrefix = PORTAL_CLIENT_ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
        if (!allowedPrefix) {
            throw new common_1.ForbiddenException('Usuários CLIENT só podem acessar o portal e entregas atribuídas');
        }
        if (!path.startsWith('/deliverables')) {
            return next.handle();
        }
        if (path.includes('/approve-internal')) {
            throw new common_1.ForbiddenException('Usuários CLIENT não podem aprovar revisões internas');
        }
        return (0, rxjs_1.from)(this.assertDeliverableAccess(user, path, request.params ?? {})).pipe((0, rxjs_1.switchMap)(() => next.handle()));
    }
    async assertDeliverableAccess(user, path, params) {
        if (!user.clientId) {
            throw new common_1.ForbiddenException('Usuário CLIENT sem empresa vinculada não pode acessar entregas');
        }
        const itemMatch = path.match(/^\/deliverables\/items\/([^/]+)\/(revision|download)/);
        if (itemMatch?.[1] || params.itemId) {
            const itemId = params.itemId ?? itemMatch?.[1];
            if (!itemId) {
                throw new common_1.ForbiddenException('Entrega não encontrada');
            }
            const item = await this.prisma.deliverableItem.findUnique({
                where: { id: itemId },
                select: {
                    deliverable: {
                        select: { clientId: true, contentPostId: true, kanbanTaskId: true },
                    },
                },
            });
            if (!item?.deliverable) {
                throw new common_1.ForbiddenException('Entrega não encontrada');
            }
            const allowed = await this.isDeliverableOwnedByClient(item.deliverable, user.clientId);
            if (!allowed) {
                throw new common_1.ForbiddenException('Você só pode acessar entregas da sua empresa');
            }
            return;
        }
        const deliverableActionMatch = path.match(/^\/deliverables\/([^/]+)\/(full-view|approve-client|reject-client)$/);
        const deliverableId = params.id ?? deliverableActionMatch?.[1];
        if (!deliverableId) {
            throw new common_1.ForbiddenException('Entrega não encontrada');
        }
        const deliverable = await this.prisma.deliverable.findUnique({
            where: { id: deliverableId },
            select: { clientId: true, contentPostId: true, kanbanTaskId: true },
        });
        if (!deliverable) {
            const byContent = await this.prisma.deliverable.findUnique({
                where: { contentPostId: deliverableId },
                select: { clientId: true, contentPostId: true, kanbanTaskId: true },
            });
            if (byContent) {
                const allowed = await this.isDeliverableOwnedByClient(byContent, user.clientId);
                if (!allowed) {
                    throw new common_1.ForbiddenException('Você só pode acessar entregas da sua empresa');
                }
                return;
            }
            const task = await this.prisma.kanbanTask.findFirst({
                where: {
                    OR: [{ id: deliverableId }, { contentPostId: deliverableId }],
                    deletedAt: null,
                },
                select: { clientId: true },
            });
            if (!task || task.clientId !== user.clientId) {
                throw new common_1.ForbiddenException('Você só pode acessar entregas da sua empresa');
            }
            return;
        }
        const allowed = await this.isDeliverableOwnedByClient(deliverable, user.clientId);
        if (!allowed) {
            throw new common_1.ForbiddenException('Você só pode acessar entregas da sua empresa');
        }
    }
    async isDeliverableOwnedByClient(deliverable, clientId) {
        if (deliverable.clientId === clientId) {
            return true;
        }
        if (deliverable.contentPostId) {
            const post = await this.prisma.contentPost.findUnique({
                where: { id: deliverable.contentPostId },
                select: { clientId: true },
            });
            if (post?.clientId === clientId)
                return true;
        }
        if (deliverable.kanbanTaskId) {
            const task = await this.prisma.kanbanTask.findUnique({
                where: { id: deliverable.kanbanTaskId },
                select: { clientId: true },
            });
            if (task?.clientId === clientId)
                return true;
        }
        return false;
    }
};
exports.ClientAccessInterceptor = ClientAccessInterceptor;
exports.ClientAccessInterceptor = ClientAccessInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClientAccessInterceptor);
//# sourceMappingURL=client-access.interceptor.js.map
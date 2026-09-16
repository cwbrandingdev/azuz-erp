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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const secret_crypto_1 = require("../common/crypto/secret-crypto");
const prisma_service_1 = require("../prisma/prisma.service");
let ClientsService = class ClientsService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async findAll(clientGroupId, activeOnly = false) {
        const clients = await this.prisma.client.findMany({
            where: {
                ...(clientGroupId ? { clientGroupId } : {}),
                ...(activeOnly ? { isActive: true } : {}),
            },
            orderBy: { companyName: 'asc' },
            include: {
                clientGroup: true,
                _count: { select: { posts: true, clientRequests: true } },
            },
        });
        const requestCounts = await this.getRequestCountsByClient(clients.map((client) => client.id));
        return clients.map((client) => this.toClientResponse(client, requestCounts.get(client.id)));
    }
    async findOne(id) {
        const client = await this.ensureClientExists(id);
        const requestCounts = await this.getRequestCountsByClient([client.id]);
        return this.toClientResponse(client, requestCounts.get(client.id));
    }
    async create(dto) {
        if (dto.clientGroupId) {
            await this.ensureClientGroupExists(dto.clientGroupId);
        }
        const client = await this.prisma.client.create({
            data: this.toPersistence(dto),
            include: {
                clientGroup: true,
                _count: { select: { posts: true } },
            },
        });
        const requestCounts = await this.getRequestCountsByClient([client.id]);
        return this.toClientResponse(client, requestCounts.get(client.id));
    }
    async update(id, dto) {
        await this.ensureClientExists(id);
        if (dto.clientGroupId) {
            await this.ensureClientGroupExists(dto.clientGroupId);
        }
        const client = await this.prisma.client.update({
            where: { id },
            data: this.toPersistence(dto),
            include: {
                clientGroup: true,
                _count: { select: { posts: true } },
            },
        });
        const requestCounts = await this.getRequestCountsByClient([client.id]);
        return this.toClientResponse(client, requestCounts.get(client.id));
    }
    async deactivate(id) {
        const existing = await this.ensureClientExists(id);
        if (!existing.isActive) {
            const requestCounts = await this.getRequestCountsByClient([existing.id]);
            return this.toClientResponse(existing, requestCounts.get(existing.id));
        }
        const client = await this.prisma.$transaction(async (tx) => {
            const users = await tx.user.findMany({
                where: { clientId: id },
                select: { id: true },
            });
            if (users.length > 0) {
                await tx.authToken.deleteMany({
                    where: { userId: { in: users.map((user) => user.id) } },
                });
                await tx.user.updateMany({
                    where: { clientId: id },
                    data: { isActive: false },
                });
            }
            await tx.clientPortalAuthToken.deleteMany({
                where: { portalUser: { clientId: id } },
            });
            await tx.clientPortalToken.updateMany({
                where: { clientId: id },
                data: { isActive: false },
            });
            return tx.client.update({
                where: { id },
                data: { isActive: false },
                include: {
                    clientGroup: true,
                    _count: { select: { posts: true, clientRequests: true } },
                },
            });
        });
        const requestCounts = await this.getRequestCountsByClient([client.id]);
        return this.toClientResponse(client, requestCounts.get(client.id));
    }
    async activate(id) {
        const existing = await this.ensureClientExists(id);
        if (existing.isActive) {
            const requestCounts = await this.getRequestCountsByClient([existing.id]);
            return this.toClientResponse(existing, requestCounts.get(existing.id));
        }
        const client = await this.prisma.$transaction(async (tx) => {
            await tx.user.updateMany({
                where: { clientId: id },
                data: { isActive: true },
            });
            await tx.clientPortalToken.updateMany({
                where: { clientId: id },
                data: { isActive: true },
            });
            return tx.client.update({
                where: { id },
                data: { isActive: true },
                include: {
                    clientGroup: true,
                    _count: { select: { posts: true, clientRequests: true } },
                },
            });
        });
        const requestCounts = await this.getRequestCountsByClient([client.id]);
        return this.toClientResponse(client, requestCounts.get(client.id));
    }
    async remove(id) {
        await this.ensureClientExists(id);
        await this.prisma.client.delete({ where: { id } });
    }
    async bulkImport(dto) {
        const created = [];
        const errors = [];
        for (let i = 0; i < dto.clients.length; i++) {
            try {
                const client = await this.create(dto.clients[i]);
                created.push(client);
            }
            catch (err) {
                errors.push({
                    index: i,
                    message: err instanceof Error ? err.message : 'Import failed',
                });
            }
        }
        return { created: created.length, errors };
    }
    async ensureClientExists(id) {
        const client = await this.prisma.client.findUnique({
            where: { id },
            include: {
                clientGroup: true,
                _count: { select: { posts: true } },
            },
        });
        if (!client)
            throw new common_1.NotFoundException('Client not found');
        return client;
    }
    async ensureClientGroupExists(id) {
        const group = await this.prisma.clientGroup.findUnique({ where: { id } });
        if (!group)
            throw new common_1.NotFoundException('Client group not found');
    }
    toClientResponse(client, requestCounts) {
        const address = [
            client.street,
            client.number,
            client.neighborhood,
            client.city,
            client.state,
            client.zipCode,
        ]
            .filter(Boolean)
            .join(', ');
        return {
            id: client.id,
            companyName: client.companyName,
            contactName: client.contactName,
            document: client.document ?? null,
            email: client.email,
            phone: client.phone,
            instagram: client.instagram,
            instagramUserId: client.instagramUserId ?? null,
            hasMetaAccessToken: Boolean(client.metaAccessToken),
            website: client.website,
            street: client.street,
            number: client.number,
            neighborhood: client.neighborhood ?? null,
            city: client.city,
            state: client.state,
            zipCode: client.zipCode,
            address: address || null,
            notes: client.notes,
            avatarUrl: client.avatarUrl,
            isActive: client.isActive,
            hasCrmEnabled: client.hasCrmEnabled,
            clientGroup: client.clientGroup
                ? {
                    id: client.clientGroup.id,
                    name: client.clientGroup.name,
                    description: client.clientGroup.description,
                    color: client.clientGroup.color,
                }
                : null,
            postCount: client._count?.posts ?? 0,
            requestCount: requestCounts?.total ?? client._count?.clientRequests ?? 0,
            pendingRequestCount: requestCounts?.pending ?? 0,
            activeRequestCount: requestCounts?.active ?? 0,
            createdAt: client.createdAt.toISOString(),
            updatedAt: client.updatedAt.toISOString(),
        };
    }
    async getRequestCountsByClient(clientIds) {
        const map = new Map();
        if (clientIds.length === 0)
            return map;
        const rows = await this.prisma.clientRequest.groupBy({
            by: ['clientId', 'status'],
            where: { clientId: { in: clientIds } },
            _count: { _all: true },
        });
        for (const row of rows) {
            const current = map.get(row.clientId) ?? {
                pending: 0,
                active: 0,
                total: 0,
            };
            const count = row._count._all;
            current.total += count;
            if (row.status === client_1.ClientRequestStatus.PENDING) {
                current.pending += count;
                current.active += count;
            }
            else if (row.status === client_1.ClientRequestStatus.CONVERTED_TO_TASK) {
                current.active += count;
            }
            map.set(row.clientId, current);
        }
        return map;
    }
    toPersistence(dto) {
        const { metaAccessToken, instagramUserId, ...rest } = dto;
        const data = { ...rest };
        if (instagramUserId !== undefined) {
            const trimmed = instagramUserId.trim();
            data.instagramUserId = trimmed.length > 0 ? trimmed : null;
        }
        if (metaAccessToken !== undefined) {
            if (!(0, secret_crypto_1.shouldPreserveMaskedSecret)(metaAccessToken)) {
                data.metaAccessToken = this.encryptOptionalToken(metaAccessToken);
            }
        }
        return data;
    }
    encryptOptionalToken(value) {
        if (value == null) {
            return null;
        }
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }
        const secret = this.config.get('TENANT_SECRETS_KEY')?.trim() ||
            this.config.getOrThrow('JWT_ACCESS_SECRET');
        return (0, secret_crypto_1.encryptSecret)(trimmed, secret);
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], ClientsService);
//# sourceMappingURL=clients.service.js.map
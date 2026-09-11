import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientRequestStatus, Prisma } from '@prisma/client';
import {
  encryptSecret,
  shouldPreserveMaskedSecret,
} from '../common/crypto/secret-crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findAll(clientGroupId?: string, activeOnly = false) {
    // #region agent log
    const schemaProbe = await this.prisma.$queryRaw<
      Array<{ schema: string }>
    >`SELECT current_schema() AS schema`;
    const columnProbe = await this.prisma.$queryRaw<
      Array<{ table_schema: string; column_name: string }>
    >`
      SELECT table_schema, column_name
      FROM information_schema.columns
      WHERE table_name = 'Client'
        AND column_name IN ('instagramUserId', 'metaAccessToken')
    `;
    fetch('http://127.0.0.1:7726/ingest/f61a8b4f-537b-4440-a74f-2179a1f0cffe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': 'fd3a09',
      },
      body: JSON.stringify({
        sessionId: 'fd3a09',
        runId: 'post-fix',
        hypothesisId: 'C',
        location: 'clients.service.ts:findAll',
        message: 'clients.findAll schema probe',
        data: {
          currentSchema: schemaProbe[0]?.schema ?? null,
          envSchema: this.config.get<string>('SUPABASE_DB_SCHEMA') ?? null,
          columns: columnProbe,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    let clients;
    try {
      clients = await this.prisma.client.findMany({
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
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7726/ingest/f61a8b4f-537b-4440-a74f-2179a1f0cffe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': 'fd3a09',
        },
        body: JSON.stringify({
          sessionId: 'fd3a09',
          runId: 'post-fix',
          hypothesisId: 'C',
          location: 'clients.service.ts:findAll:error',
          message: 'clients.findAll prisma error',
          data: {
            errorName: error instanceof Error ? error.name : 'unknown',
            errorMessage: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      throw error;
    }

    const requestCounts = await this.getRequestCountsByClient(
      clients.map((client) => client.id),
    );

    return clients.map((client) =>
      this.toClientResponse(client, requestCounts.get(client.id)),
    );
  }

  async findOne(id: string) {
    const client = await this.ensureClientExists(id);
    const requestCounts = await this.getRequestCountsByClient([client.id]);
    return this.toClientResponse(client, requestCounts.get(client.id));
  }

  async create(dto: CreateClientDto) {
    if (dto.clientGroupId) {
      await this.ensureClientGroupExists(dto.clientGroupId);
    }

    const client = await this.prisma.client.create({
      data: this.toPersistence(dto) as Prisma.ClientUncheckedCreateInput,
      include: {
        clientGroup: true,
        _count: { select: { posts: true } },
      },
    });
    const requestCounts = await this.getRequestCountsByClient([client.id]);
    return this.toClientResponse(client, requestCounts.get(client.id));
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.ensureClientExists(id);

    if (dto.clientGroupId) {
      await this.ensureClientGroupExists(dto.clientGroupId);
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: this.toPersistence(dto) as Prisma.ClientUncheckedUpdateInput,
      include: {
        clientGroup: true,
        _count: { select: { posts: true } },
      },
    });
    const requestCounts = await this.getRequestCountsByClient([client.id]);
    return this.toClientResponse(client, requestCounts.get(client.id));
  }

  async deactivate(id: string) {
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

  async activate(id: string) {
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

  async remove(id: string) {
    await this.ensureClientExists(id);
    await this.prisma.client.delete({ where: { id } });
  }

  async bulkImport(dto: { clients: CreateClientDto[] }) {
    const created: Awaited<ReturnType<typeof this.create>>[] = [];
    const errors: { index: number; message: string }[] = [];

    for (let i = 0; i < dto.clients.length; i++) {
      try {
        const client = await this.create(dto.clients[i]);
        created.push(client);
      } catch (err) {
        errors.push({
          index: i,
          message: err instanceof Error ? err.message : 'Import failed',
        });
      }
    }

    return { created: created.length, errors };
  }

  private async ensureClientExists(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        clientGroup: true,
        _count: { select: { posts: true } },
      },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  private async ensureClientGroupExists(id: string) {
    const group = await this.prisma.clientGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Client group not found');
  }

  private toClientResponse(client: {
    id: string;
    companyName: string;
    contactName: string | null;
    document: string | null;
    email: string | null;
    phone: string | null;
    instagram: string | null;
    instagramUserId?: string | null;
    metaAccessToken?: string | null;
    website: string | null;
    street: string | null;
    number: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    notes: string | null;
    avatarUrl: string | null;
    isActive: boolean;
    hasCrmEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    clientGroup?: {
      id: string;
      name: string;
      description: string | null;
      color: string;
    } | null;
    _count?: { posts: number; clientRequests?: number };
  }, requestCounts?: { pending: number; active: number; total: number }) {
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

  private async getRequestCountsByClient(clientIds: string[]) {
    const map = new Map<string, { pending: number; active: number; total: number }>();
    if (clientIds.length === 0) return map;

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
      if (row.status === ClientRequestStatus.PENDING) {
        current.pending += count;
        current.active += count;
      } else if (row.status === ClientRequestStatus.CONVERTED_TO_TASK) {
        current.active += count;
      }
      map.set(row.clientId, current);
    }

    return map;
  }

  private toPersistence(dto: CreateClientDto | UpdateClientDto) {
    const { metaAccessToken, instagramUserId, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };

    if (instagramUserId !== undefined) {
      const trimmed = instagramUserId.trim();
      data.instagramUserId = trimmed.length > 0 ? trimmed : null;
    }

    if (metaAccessToken !== undefined) {
      if (!shouldPreserveMaskedSecret(metaAccessToken)) {
        data.metaAccessToken = this.encryptOptionalToken(metaAccessToken);
      }
    }

    return data;
  }

  private encryptOptionalToken(value?: string | null) {
    if (value == null) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const secret =
      this.config.get<string>('TENANT_SECRETS_KEY')?.trim() ||
      this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    return encryptSecret(trimmed, secret);
  }
}

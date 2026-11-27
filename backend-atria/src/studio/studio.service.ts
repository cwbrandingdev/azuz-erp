import { Injectable } from '@nestjs/common';
import { ClientRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudioService {
  constructor(private readonly prisma: PrismaService) {}

  async getHome(userId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const lastColumn = await this.prisma.kanbanColumn.findFirst({
      orderBy: { order: 'desc' },
      select: { id: true },
    });

    const [pendingRequests, tasksDueToday] = await Promise.all([
      this.prisma.clientRequest.findMany({
        where: { status: ClientRequestStatus.PENDING },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          clientId: true,
          client: { select: { companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.kanbanTask.findMany({
        where: {
          assignees: { some: { userId } },
          dueDate: { gte: startOfToday, lte: endOfToday },
          deletedAt: null,
          ...(lastColumn ? { columnId: { not: lastColumn.id } } : {}),
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          column: { select: { title: true } },
          client: { select: { companyName: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { title: 'asc' }],
      }),
    ]);

    return {
      pendingRequests: pendingRequests.map((item) => ({
        id: item.id,
        title: item.title,
        clientId: item.clientId,
        clientName: item.client?.companyName ?? null,
        createdAt: item.createdAt.toISOString(),
        status: item.status,
      })),
      tasksDueToday: tasksDueToday.map((task) => ({
        id: task.id,
        title: task.title,
        clientName: task.client?.companyName ?? null,
        dueDate: task.dueDate?.toISOString() ?? null,
        column: task.column.title,
      })),
    };
  }
}
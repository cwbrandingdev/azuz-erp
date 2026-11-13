import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

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

@Injectable()
export class ClientAccessInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      url?: string;
      originalUrl?: string;
      params?: Record<string, string>;
    }>();

    const user = request.user;
    if (!user) {
      return next.handle();
    }

    const role = user.role?.toUpperCase() ?? '';
    const rawUrl = request.originalUrl ?? request.url ?? '';
    const path = rawUrl.split('?')[0];

    if (role === 'EXTERNAL_CLIENT_CRM') {
      const allowed = EXTERNAL_CRM_ALLOWED_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      );

      if (!allowed) {
        throw new ForbiddenException(
          'Usuários EXTERNAL_CLIENT_CRM só podem acessar o Kanban de Leads da organização',
        );
      }

      return next.handle();
    }

    if (role !== 'CLIENT') {
      return next.handle();
    }

    const allowedPrefix = PORTAL_CLIENT_ALLOWED_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );

    if (!allowedPrefix) {
      throw new ForbiddenException(
        'Usuários CLIENT só podem acessar o portal e entregas atribuídas',
      );
    }

    if (!path.startsWith('/deliverables')) {
      return next.handle();
    }

    if (path.includes('/approve-internal')) {
      throw new ForbiddenException(
        'Usuários CLIENT não podem aprovar revisões internas',
      );
    }

    return from(
      this.assertDeliverableAccess(user, path, request.params ?? {}),
    ).pipe(switchMap(() => next.handle()));
  }

  private async assertDeliverableAccess(
    user: AuthenticatedUser,
    path: string,
    params: Record<string, string>,
  ) {
    if (!user.clientId) {
      throw new ForbiddenException(
        'Usuário CLIENT sem empresa vinculada não pode acessar entregas',
      );
    }

    const itemMatch = path.match(
      /^\/deliverables\/items\/([^/]+)\/(revision|download)/,
    );
    if (itemMatch?.[1] || params.itemId) {
      const itemId = params.itemId ?? itemMatch?.[1];
      if (!itemId) {
        throw new ForbiddenException('Entrega não encontrada');
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
        throw new ForbiddenException('Entrega não encontrada');
      }

      const allowed = await this.isDeliverableOwnedByClient(
        item.deliverable,
        user.clientId,
      );
      if (!allowed) {
        throw new ForbiddenException(
          'Você só pode acessar entregas da sua empresa',
        );
      }
      return;
    }

    const deliverableActionMatch = path.match(
      /^\/deliverables\/([^/]+)\/(full-view|approve-client|reject-client)$/,
    );
    const deliverableId = params.id ?? deliverableActionMatch?.[1];
    if (!deliverableId) {
      throw new ForbiddenException('Entrega não encontrada');
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
        const allowed = await this.isDeliverableOwnedByClient(
          byContent,
          user.clientId,
        );
        if (!allowed) {
          throw new ForbiddenException(
            'Você só pode acessar entregas da sua empresa',
          );
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
        throw new ForbiddenException(
          'Você só pode acessar entregas da sua empresa',
        );
      }
      return;
    }

    const allowed = await this.isDeliverableOwnedByClient(
      deliverable,
      user.clientId,
    );
    if (!allowed) {
      throw new ForbiddenException(
        'Você só pode acessar entregas da sua empresa',
      );
    }
  }

  private async isDeliverableOwnedByClient(
    deliverable: {
      clientId: string | null;
      contentPostId: string | null;
      kanbanTaskId: string | null;
    },
    clientId: string,
  ) {
    if (deliverable.clientId === clientId) {
      return true;
    }

    if (deliverable.contentPostId) {
      const post = await this.prisma.contentPost.findUnique({
        where: { id: deliverable.contentPostId },
        select: { clientId: true },
      });
      if (post?.clientId === clientId) return true;
    }

    if (deliverable.kanbanTaskId) {
      const task = await this.prisma.kanbanTask.findUnique({
        where: { id: deliverable.kanbanTaskId },
        select: { clientId: true },
      });
      if (task?.clientId === clientId) return true;
    }

    return false;
  }
}

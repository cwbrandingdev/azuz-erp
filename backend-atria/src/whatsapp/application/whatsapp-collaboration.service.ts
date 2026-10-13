import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  UserCategory,
  WhatsAppConversationStatus,
  WhatsAppCrmEventType,
} from '@prisma/client';
import { AiService } from '../../ai/ai.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppDirection } from '../domain/whatsapp-message';
import { resolveMentionedUsers } from '../domain/whatsapp-mentions';
import { normalizeWhatsAppPhone } from '../domain/whatsapp-phone';
import { WhatsAppService } from './whatsapp.service';

const DEFAULT_COMPANY = '00000000-0000-4000-8000-000000000001';

const TONE_HINT: Record<'formal' | 'casual' | 'empathetic', string> = {
  formal: 'tom formal e profissional, sem gírias',
  casual: 'tom casual, próximo e natural',
  empathetic: 'tom empático e acolhedor',
};

@Injectable()
export class WhatsAppCollaborationService {
  private readonly logger = new Logger(WhatsAppCollaborationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsApp: WhatsAppService,
    private readonly notifications: NotificationsService,
    private readonly ai: AiService,
  ) {}

  async addPrivateNote(input: {
    companyId?: string;
    phone: string;
    message: string;
    userId: string;
  }) {
    const note = await this.whatsApp.addPrivateNote(
      input.phone,
      input.message,
      input.userId,
    );
    const companyId = input.companyId ?? DEFAULT_COMPANY;
    const phone = normalizeWhatsAppPhone(input.phone);
    try {
      await this.notifyMentions({
        companyId,
        phone,
        body: input.message,
        actorUserId: input.userId,
      });
    } catch (error) {
      this.logger.warn(
        `Mention notify failed: ${error instanceof Error ? error.message : error}`,
      );
    }
    return note;
  }

  async transfer(input: {
    companyId?: string;
    phone: string;
    note: string;
    actorUserId: string;
    targetUserId?: string | null;
    targetUserGroupId?: string | null;
  }) {
    const companyId = input.companyId ?? DEFAULT_COMPANY;
    const phone = normalizeWhatsAppPhone(input.phone);
    const note = input.note.trim();
    if (note.length < 8) {
      throw new BadRequestException('A nota de contexto é obrigatória');
    }

    const conversation = await this.prisma.whatsAppConversation.findUnique({
      where: { phone },
    });
    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    const target = await this.resolveTransferTarget(companyId, input);
    const actor = await this.prisma.user.findUnique({
      where: { id: input.actorUserId },
      select: { name: true },
    });

    await this.prisma.whatsAppConversation.update({
      where: { phone },
      data: {
        assignedUserId: target.userId,
        assignedAt: new Date(),
        status:
          conversation.status === WhatsAppConversationStatus.RESOLVED
            ? WhatsAppConversationStatus.OPEN
            : conversation.status,
      },
    });

    const body = `Transferido para ${target.label} por ${actor?.name ?? 'atendente'}: ${note}`;
    const created = await this.addPrivateNote({
      companyId,
      phone,
      message: body,
      userId: input.actorUserId,
    });

    await this.notifications.createMany(
      [target.userId],
      NotificationType.WHATSAPP_TRANSFER,
      'Conversa transferida no WhatsApp',
      `${phone} · ${actor?.name ?? 'Alguém'} passou esta conversa: ${note}`,
      { companyId },
    );

    await this.prisma.whatsAppCrmEvent.create({
      data: {
        companyId,
        phone,
        type: WhatsAppCrmEventType.TRANSFER,
        title: `Transferido para ${target.label}`,
        body: note,
        actorUserId: input.actorUserId,
      },
    });

    const summary = await this.whatsApp.getConversation(phone, companyId);
    return { conversation: summary, note: created, assignedTo: target };
  }

  async copilot(input: {
    phone: string;
    action: 'suggest' | 'rewrite' | 'grammar' | 'tone' | 'summarize';
    text?: string;
    tone?: 'formal' | 'casual' | 'empathetic';
  }): Promise<{ text: string }> {
    const phone = normalizeWhatsAppPhone(input.phone);
    const draft = input.text?.trim() ?? '';
    const history = await this.recentTranscript(phone);

    if (
      (input.action === 'rewrite' ||
        input.action === 'grammar' ||
        input.action === 'tone') &&
      !draft
    ) {
      throw new BadRequestException('Informe o texto para o copiloto');
    }

    let prompt = '';
    if (input.action === 'suggest') {
      prompt = `Sugira UMA resposta curta de WhatsApp em português brasileiro (no máximo 3 frases, sem markdown) para o atendente enviar ao cliente.
${draft ? `Rascunho do atendente:\n${draft}\n` : ''}
Histórico recente:
${history}`;
    } else if (input.action === 'rewrite') {
      prompt = `Reescreva o texto abaixo para WhatsApp, mantendo o sentido, em português brasileiro, sem markdown:\n${draft}`;
    } else if (input.action === 'grammar') {
      prompt = `Corrija gramática e ortografia do texto abaixo sem mudar o sentido. Responda só com o texto corrigido:\n${draft}`;
    } else if (input.action === 'tone') {
      const hint = TONE_HINT[input.tone ?? 'formal'];
      prompt = `Reescreva o texto abaixo com ${hint}, para WhatsApp, em português brasileiro, sem markdown:\n${draft}`;
    } else {
      prompt = `Resuma esta conversa de WhatsApp para um atendente que vai assumir o caso. 4 a 6 linhas, português brasileiro, fatos e próximo passo. Sem markdown.
${history}`;
    }

    const text = await this.ai.completePlain(
      prompt,
      'You help Brazilian WhatsApp agents. Reply only with the requested text.',
    );
    return { text };
  }

  private async notifyMentions(input: {
    companyId: string;
    phone: string;
    body: string;
    actorUserId: string;
  }) {
    const members = await this.prisma.user.findMany({
      where: {
        companyId: input.companyId,
        category: UserCategory.MEMBER,
        isActive: true,
      },
      select: { id: true, name: true },
    });
    const mentioned = resolveMentionedUsers(
      input.body,
      members,
      input.actorUserId,
    );
    if (mentioned.length === 0) return;

    const actor = members.find((item) => item.id === input.actorUserId);
    const snippet = input.body.slice(0, 180);
    await this.notifications.createMany(
      mentioned.map((item) => item.id),
      NotificationType.WHATSAPP_MENTION,
      'Você foi mencionado no WhatsApp',
      `${input.phone} · ${actor?.name ?? 'Alguém'}: ${snippet}`,
      { companyId: input.companyId },
    );
    await this.prisma.whatsAppCrmEvent.create({
      data: {
        companyId: input.companyId,
        phone: input.phone,
        type: WhatsAppCrmEventType.MENTION,
        title: `Menção: ${mentioned.map((item) => item.name).join(', ')}`,
        body: input.body,
        actorUserId: input.actorUserId,
      },
    });
  }

  private async resolveTransferTarget(
    companyId: string,
    input: {
      targetUserId?: string | null;
      targetUserGroupId?: string | null;
      actorUserId: string;
    },
  ): Promise<{ userId: string; label: string }> {
    if (input.targetUserId) {
      const user = await this.prisma.user.findFirst({
        where: {
          id: input.targetUserId,
          companyId,
          category: UserCategory.MEMBER,
          isActive: true,
        },
        select: { id: true, name: true },
      });
      if (!user) throw new BadRequestException('Atendente inválido');
      return { userId: user.id, label: user.name };
    }

    if (input.targetUserGroupId) {
      const group = await this.prisma.userGroup.findFirst({
        where: { id: input.targetUserGroupId, companyId },
        select: { id: true, name: true },
      });
      if (!group) throw new BadRequestException('Setor inválido');
      const members = await this.prisma.user.findMany({
        where: {
          companyId,
          category: UserCategory.MEMBER,
          isActive: true,
          id: { not: input.actorUserId },
          OR: [
            { userGroupId: group.id },
            { userGroups: { some: { userGroupId: group.id } } },
          ],
        },
        select: { id: true, name: true },
      });
      if (members.length === 0) {
        throw new BadRequestException('Nenhum atendente neste setor');
      }
      const counts = await this.prisma.whatsAppConversation.groupBy({
        by: ['assignedUserId'],
        where: {
          assignedUserId: { in: members.map((item) => item.id) },
          status: { not: WhatsAppConversationStatus.RESOLVED },
        },
        _count: { _all: true },
      });
      const countById = new Map(
        counts.map((item) => [item.assignedUserId ?? '', item._count._all]),
      );
      const chosen = [...members].sort(
        (left, right) =>
          (countById.get(left.id) ?? 0) - (countById.get(right.id) ?? 0),
      )[0];
      return {
        userId: chosen.id,
        label: `${chosen.name} (${group.name})`,
      };
    }

    throw new BadRequestException('Escolha um atendente ou um setor');
  }

  private async recentTranscript(phone: string): Promise<string> {
    const rows = await this.prisma.whatsAppMessage.findMany({
      where: {
        isPrivate: false,
        OR: [{ fromPhone: phone }, { toPhone: phone }],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { body: true, direction: true, createdAt: true },
    });
    if (rows.length === 0) return '(sem histórico)';
    return [...rows]
      .reverse()
      .map((row) => {
        const who =
          row.direction === WhatsAppDirection.INBOUND ? 'Cliente' : 'Atendente';
        return `${who}: ${row.body}`;
      })
      .join('\n');
  }
}

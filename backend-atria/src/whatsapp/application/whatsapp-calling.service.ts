import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  WhatsAppCallDirection as PrismaCallDirection,
  WhatsAppCallStatus as PrismaCallStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LIVE_CALL_STATUSES,
  mapCallDirection,
  readCallSdp,
  WhatsAppCallDirection,
  WhatsAppCallStatus,
  type WhatsAppCallPermission,
  type WhatsAppCallRecord,
  type WhatsAppWebhookCall,
  type WhatsAppWebhookCallStatus,
} from '../domain/whatsapp-call';
import { WhatsAppGraphGateway } from '../domain/whatsapp-graph.gateway';
import {
  WhatsAppDirection,
  WhatsAppStatus,
} from '../domain/whatsapp-message';
import { WhatsAppMessageRepository } from '../domain/whatsapp-message.repository';
import { normalizeWhatsAppPhone } from '../domain/whatsapp-phone';

type CallWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        calls?: WhatsAppWebhookCall[];
        statuses?: WhatsAppWebhookCallStatus[];
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
      };
    }>;
  }>;
};

@Injectable()
export class WhatsAppCallingService {
  private readonly logger = new Logger(WhatsAppCallingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: WhatsAppGraphGateway,
    private readonly messages: WhatsAppMessageRepository,
  ) {}

  async handleWebhook(payload: CallWebhookPayload): Promise<void> {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value) continue;
        const contactName = value.contacts?.[0]?.profile?.name ?? null;

        for (const call of value.calls ?? []) {
          await this.persistCallEvent(call, contactName);
        }

        for (const status of value.statuses ?? []) {
          if (status.type && status.type !== 'call') continue;
          await this.persistCallStatus(status);
        }
      }
    }
  }

  async listLive(): Promise<WhatsAppCallRecord[]> {
    const rows = await this.prisma.whatsAppCall.findMany({
      where: { status: { in: LIVE_CALL_STATUSES } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toRecord(row));
  }

  async getById(id: string): Promise<WhatsAppCallRecord> {
    const row = await this.prisma.whatsAppCall.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Call not found');
    }
    return this.toRecord(row);
  }

  async getPermissions(phone: string): Promise<WhatsAppCallPermission> {
    await this.graph.enableCalling().catch(() => undefined);
    const userWaId = normalizeWhatsAppPhone(phone);
    return this.graph.getCallPermissions(userWaId);
  }

  async requestPermission(phone: string, userId?: string) {
    const recipient = normalizeWhatsAppPhone(phone);
    const permissions = await this.graph.getCallPermissions(recipient);
    if (!permissions.canRequestPermission && !permissions.canStartCall) {
      throw new ForbiddenException({
        message:
          'Não é possível pedir permissão de ligação para este número agora.',
        code: 'CALL_PERMISSION_LIMIT',
      });
    }
    if (permissions.canStartCall) {
      return { alreadyGranted: true, permissions };
    }

    const result = await this.graph.sendCallPermissionRequest(recipient);
    const businessPhone = await this.graph.getBusinessPhone();
    const conversation = await this.messages.upsertConversation({
      phone: recipient,
      preview: 'Pedido de permissão para ligação',
      inbound: false,
    });
    await this.messages.create({
      whatsappMessageId: result.whatsappMessageId,
      fromPhone: businessPhone,
      toPhone: result.to,
      body: 'Pedido de permissão para ligação de voz',
      direction: WhatsAppDirection.OUTBOUND,
      status: WhatsAppStatus.SENT,
      isPrivate: false,
      sentByUserId: userId ?? null,
      conversationId: conversation.id,
    });
    return { alreadyGranted: false, permissions };
  }

  async initiate(
    to: string,
    sdp: string,
    userId?: string,
  ): Promise<WhatsAppCallRecord> {
    const recipient = normalizeWhatsAppPhone(to);
    if (!sdp.trim()) {
      throw new BadRequestException('SDP offer is required');
    }

    const permissions = await this.graph.getCallPermissions(recipient);
    if (!permissions.canStartCall) {
      throw new ForbiddenException({
        message:
          'Este contato ainda não autorizou ligações. Envie o pedido de permissão primeiro.',
        code: 'CALL_PERMISSION_REQUIRED',
      });
    }

    const connected = await this.graph.connectCall(recipient, {
      sdpType: 'offer',
      sdp,
    });

    const row = await this.prisma.whatsAppCall.create({
      data: {
        whatsappCallId: connected.callId,
        phone: recipient,
        direction: PrismaCallDirection.OUTBOUND,
        status: PrismaCallStatus.CONNECTING,
        offerSdp: sdp,
      },
    });

    await this.noteCall(recipient, 'Ligação de voz iniciada', false, userId);
    return this.toRecord(row);
  }

  async answer(id: string, sdp: string): Promise<WhatsAppCallRecord> {
    const row = await this.requireCall(id);
    if (row.direction !== PrismaCallDirection.INBOUND) {
      throw new BadRequestException('Only inbound calls can be answered');
    }
    if (!LIVE_CALL_STATUSES.includes(row.status as WhatsAppCallStatus)) {
      throw new BadRequestException('Call is no longer ringing');
    }
    if (!sdp.trim()) {
      throw new BadRequestException('SDP answer is required');
    }

    const session = { sdpType: 'answer' as const, sdp };
    await this.graph.callAction(row.whatsappCallId, 'pre_accept', session);
    await this.graph.callAction(row.whatsappCallId, 'accept', session);

    const updated = await this.prisma.whatsAppCall.update({
      where: { id: row.id },
      data: {
        answerSdp: sdp,
        status: PrismaCallStatus.IN_PROGRESS,
        startedAt: row.startedAt ?? new Date(),
      },
    });
    return this.toRecord(updated);
  }

  async reject(id: string): Promise<WhatsAppCallRecord> {
    const row = await this.requireCall(id);
    await this.graph.callAction(row.whatsappCallId, 'reject').catch(() => undefined);
    const updated = await this.prisma.whatsAppCall.update({
      where: { id: row.id },
      data: {
        status: PrismaCallStatus.REJECTED,
        endedAt: new Date(),
      },
    });
    await this.noteCall(row.phone, 'Ligação recusada', true);
    return this.toRecord(updated);
  }

  async hangup(id: string): Promise<WhatsAppCallRecord> {
    const row = await this.requireCall(id);
    await this.graph
      .callAction(row.whatsappCallId, 'terminate')
      .catch(() => undefined);
    const endedAt = new Date();
    const startedAt = row.startedAt ?? row.createdAt;
    const durationSeconds = Math.max(
      0,
      Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
    );
    const updated = await this.prisma.whatsAppCall.update({
      where: { id: row.id },
      data: {
        status: PrismaCallStatus.ENDED,
        endedAt,
        durationSeconds,
      },
    });
    await this.noteCall(
      row.phone,
      `Ligação encerrada · ${this.formatDuration(durationSeconds)}`,
      row.direction === PrismaCallDirection.INBOUND,
    );
    return this.toRecord(updated);
  }

  private async persistCallEvent(
    call: WhatsAppWebhookCall,
    contactName: string | null,
  ): Promise<void> {
    if (!call.id) return;

    const { type, sdp } = readCallSdp(call);
    const direction = mapCallDirection(call.direction);
    const phone = normalizeWhatsAppPhone(
      direction === WhatsAppCallDirection.INBOUND
        ? (call.from ?? '')
        : (call.to ?? ''),
    );
    if (!phone) return;

    if (call.event === 'connect') {
      const existing = await this.prisma.whatsAppCall.findUnique({
        where: { whatsappCallId: call.id },
      });

      if (existing) {
        await this.prisma.whatsAppCall.update({
          where: { id: existing.id },
          data: {
            ...(type === 'answer' ? { answerSdp: sdp } : {}),
            ...(type === 'offer' ? { offerSdp: sdp } : {}),
            status:
              existing.status === PrismaCallStatus.CONNECTING
                ? PrismaCallStatus.RINGING
                : existing.status,
          },
        });
        return;
      }

      await this.prisma.whatsAppCall.create({
        data: {
          whatsappCallId: call.id,
          phone,
          direction,
          status: PrismaCallStatus.RINGING,
          offerSdp: type === 'offer' ? sdp : null,
          answerSdp: type === 'answer' ? sdp : null,
        },
      });
      await this.messages.upsertConversation({
        phone,
        name: contactName,
        preview:
          direction === WhatsAppCallDirection.INBOUND
            ? 'Ligação recebida'
            : 'Ligação de voz',
        inbound: direction === WhatsAppCallDirection.INBOUND,
        reopen: true,
      });
      return;
    }

    if (call.event === 'terminate') {
      const existing = await this.prisma.whatsAppCall.findUnique({
        where: { whatsappCallId: call.id },
      });
      const alreadyClosed =
        existing != null &&
        !LIVE_CALL_STATUSES.includes(existing.status as WhatsAppCallStatus);
      const terminateStatus = this.mapTerminateStatus(call.status);
      const duration =
        typeof call.duration === 'number'
          ? call.duration
          : existing
            ? this.secondsBetween(
                existing.startedAt ?? existing.createdAt,
                new Date(),
              )
            : null;
      if (existing && !alreadyClosed) {
        await this.prisma.whatsAppCall.update({
          where: { id: existing.id },
          data: {
            status: terminateStatus,
            endedAt: new Date(),
            durationSeconds: duration,
          },
        });
      }
      if (!alreadyClosed) {
        await this.noteCall(
          phone,
          terminateStatus === PrismaCallStatus.REJECTED
            ? 'Ligação recusada'
            : `Ligação encerrada${duration != null ? ` · ${this.formatDuration(duration)}` : ''}`,
          direction === WhatsAppCallDirection.INBOUND,
          undefined,
          contactName,
        );
      }
    }
  }

  private async persistCallStatus(
    status: WhatsAppWebhookCallStatus,
  ): Promise<void> {
    if (!status.id || !status.status) return;
    const mapped = this.mapLiveStatus(status.status);
    if (!mapped) return;
    await this.prisma.whatsAppCall.updateMany({
      where: { whatsappCallId: status.id },
      data: {
        status: mapped,
        ...(mapped === PrismaCallStatus.IN_PROGRESS
          ? { startedAt: new Date() }
          : {}),
        ...(mapped === PrismaCallStatus.REJECTED
          ? { endedAt: new Date() }
          : {}),
      },
    });
  }

  private mapLiveStatus(status: string): PrismaCallStatus | null {
    const value = status.toUpperCase();
    if (value === 'RINGING') return PrismaCallStatus.RINGING;
    if (value === 'ACCEPTED') return PrismaCallStatus.IN_PROGRESS;
    if (value === 'REJECTED') return PrismaCallStatus.REJECTED;
    return null;
  }

  private mapTerminateStatus(
    status: string | string[] | undefined,
  ): PrismaCallStatus {
    const raw = Array.isArray(status) ? status.join(' ') : status ?? '';
    const value = raw.toUpperCase();
    if (value.includes('FAIL')) return PrismaCallStatus.FAILED;
    if (value.includes('REJECT')) return PrismaCallStatus.REJECTED;
    return PrismaCallStatus.ENDED;
  }

  private async requireCall(id: string) {
    const row = await this.prisma.whatsAppCall.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Call not found');
    }
    return row;
  }

  private async noteCall(
    phone: string,
    body: string,
    inbound: boolean,
    userId?: string,
    name?: string | null,
  ): Promise<void> {
    try {
      const normalized = normalizeWhatsAppPhone(phone);
      const businessPhone = await this.graph.getBusinessPhone();
      const conversation = await this.messages.upsertConversation({
        phone: normalized,
        name,
        preview: body,
        inbound,
        reopen: inbound,
      });
      await this.messages.create({
        whatsappMessageId: null,
        fromPhone: inbound ? normalized : businessPhone,
        toPhone: inbound ? businessPhone : normalized,
        body,
        direction: inbound
          ? WhatsAppDirection.INBOUND
          : WhatsAppDirection.OUTBOUND,
        status: WhatsAppStatus.DELIVERED,
        isPrivate: false,
        sentByUserId: userId ?? null,
        conversationId: conversation.id,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to log call in conversation: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  private secondsBetween(from: Date, to: Date): number {
    return Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    if (minutes === 0) return `${rest}s`;
    return `${minutes}min ${rest.toString().padStart(2, '0')}s`;
  }

  private toRecord(row: {
    id: string;
    whatsappCallId: string;
    phone: string;
    direction: PrismaCallDirection;
    status: PrismaCallStatus;
    offerSdp: string | null;
    answerSdp: string | null;
    startedAt: Date | null;
    endedAt: Date | null;
    durationSeconds: number | null;
    createdAt: Date;
    updatedAt: Date;
  }): WhatsAppCallRecord {
    return {
      id: row.id,
      whatsappCallId: row.whatsappCallId,
      phone: row.phone,
      direction: row.direction as WhatsAppCallDirection,
      status: row.status as WhatsAppCallStatus,
      offerSdp: row.offerSdp,
      answerSdp: row.answerSdp,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      durationSeconds: row.durationSeconds,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CrmReminderTaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

// Passado esse tempo (ex.: servidor fora do ar), o aviso perde o sentido.
const MAX_LATE_MS = 24 * 60 * 60 * 1000;
const REMINDERS_URL = '/leads/kanban';

interface DueReminder {
  id: string;
  title: string;
  userId: string | null;
  lead: { name: string; ownerUserId: string | null };
}

@Injectable()
export class CrmReminderPushService {
  private readonly logger = new Logger(CrmReminderPushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  @Cron('* * * * *')
  async handleDueReminders() {
    const now = new Date();

    const reminders = await this.prisma.crmReminderTask.findMany({
      where: {
        status: CrmReminderTaskStatus.PENDING,
        notifiedAt: null,
        dueDate: { lte: now, gte: new Date(now.getTime() - MAX_LATE_MS) },
        lead: { deletedAt: null },
      },
      select: {
        id: true,
        title: true,
        userId: true,
        lead: { select: { name: true, ownerUserId: true } },
      },
    });

    for (const reminder of reminders) {
      await this.notify(reminder);
    }
  }

  private async notify(reminder: DueReminder) {
    // Reserva antes de enviar: dois ciclos do cron nunca avisam o mesmo lembrete.
    const claimed = await this.prisma.crmReminderTask.updateMany({
      where: { id: reminder.id, notifiedAt: null },
      data: { notifiedAt: new Date() },
    });
    if (claimed.count === 0) return;

    const recipientId = reminder.userId ?? reminder.lead.ownerUserId;
    if (!recipientId) return;

    try {
      await this.push.sendToUsers([recipientId], {
        title: 'Lembrete',
        body: `${reminder.title} · ${reminder.lead.name}`,
        url: REMINDERS_URL,
        tag: `crm-reminder-${reminder.id}`,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falha ao avisar o lembrete ${reminder.id}: ${detail}`);
    }
  }
}

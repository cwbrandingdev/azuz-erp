import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  NotificationType,
  TimeClockEntryType,
  UserCategory,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  endOfSaoPauloDayExclusive,
  SAO_PAULO_TZ,
  startOfSaoPauloDay,
  toSaoPauloDayKey,
} from './time-clock-dates';

const LUNCH_DURATION_MS = 60 * 60 * 1000;
// Only people who used the clock recently are reminded, so nobody on
// vacation (or who never adopted the feature) gets daily noise.
const ACTIVE_USER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type ReminderKind = 'CLOCK_IN' | 'LUNCH_RETURN' | 'CLOCK_OUT';

const REMINDERS: Record<ReminderKind, { title: string; message: string }> = {
  CLOCK_IN: {
    title: 'Registre sua entrada',
    message: 'Você ainda não bateu o ponto de entrada hoje.',
  },
  LUNCH_RETURN: {
    title: 'Registre a volta do almoço',
    message: 'Seu almoço já passou de 1 hora. Não esqueça de bater o ponto.',
  },
  CLOCK_OUT: {
    title: 'Registre sua saída',
    message: 'Não esqueça de bater o ponto de saída antes de encerrar o dia.',
  },
};

interface ActiveUser {
  userId: string;
  companyId: string;
}

interface LastPunch {
  type: TimeClockEntryType;
  punchedAt: Date;
}

@Injectable()
export class TimeClockRemindersService {
  private readonly logger = new Logger(TimeClockRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 9 * * 1-5', { timeZone: SAO_PAULO_TZ })
  async remindClockIn() {
    await this.remind('CLOCK_IN', (lastPunch) => !lastPunch);
  }

  @Cron('*/5 10-17 * * 1-5', { timeZone: SAO_PAULO_TZ })
  async remindLunchReturn() {
    const now = Date.now();
    await this.remind(
      'LUNCH_RETURN',
      (lastPunch) =>
        lastPunch?.type === TimeClockEntryType.BREAK_START &&
        now - lastPunch.punchedAt.getTime() >= LUNCH_DURATION_MS,
    );
  }

  @Cron('0 18 * * 1-5', { timeZone: SAO_PAULO_TZ })
  async remindClockOut() {
    await this.remind(
      'CLOCK_OUT',
      (lastPunch) =>
        lastPunch?.type === TimeClockEntryType.IN ||
        lastPunch?.type === TimeClockEntryType.BREAK_END,
    );
  }

  private async remind(
    kind: ReminderKind,
    needsReminder: (lastPunch: LastPunch | undefined) => boolean,
  ) {
    const activeUsers = await this.findActiveUsers();
    if (activeUsers.length === 0) return;

    const lastPunches = await this.findTodayLastPunches(
      activeUsers.map((user) => user.userId),
    );
    const candidates = activeUsers.filter((user) =>
      needsReminder(lastPunches.get(user.userId)),
    );
    const recipients = await this.excludeAlreadyReminded(kind, candidates);
    if (recipients.length === 0) return;

    await this.send(kind, recipients);
    this.logger.log(`Sent ${kind} reminder to ${recipients.length} user(s)`);
  }

  private async findActiveUsers(): Promise<ActiveUser[]> {
    const recentPunches = await this.prisma.timeClockEntry.findMany({
      where: {
        punchedAt: { gte: new Date(Date.now() - ACTIVE_USER_WINDOW_MS) },
        user: { isActive: true, category: UserCategory.MEMBER },
      },
      distinct: ['userId'],
      select: { userId: true, companyId: true },
    });
    return recentPunches;
  }

  private async findTodayLastPunches(
    userIds: string[],
  ): Promise<Map<string, LastPunch>> {
    const today = toSaoPauloDayKey(new Date());
    const punches = await this.prisma.timeClockEntry.findMany({
      where: {
        userId: { in: userIds },
        punchedAt: {
          gte: startOfSaoPauloDay(today),
          lt: endOfSaoPauloDayExclusive(today),
        },
      },
      select: { userId: true, type: true, punchedAt: true },
      orderBy: { punchedAt: 'asc' },
    });

    // Ascending order means the last write per user wins.
    return new Map(punches.map((punch) => [punch.userId, punch]));
  }

  private async excludeAlreadyReminded(
    kind: ReminderKind,
    users: ActiveUser[],
  ): Promise<ActiveUser[]> {
    if (users.length === 0) return [];

    const today = toSaoPauloDayKey(new Date());
    const alreadyReminded = await this.prisma.notification.findMany({
      where: {
        type: NotificationType.TIME_CLOCK_REMINDER,
        title: REMINDERS[kind].title,
        userId: { in: users.map((user) => user.userId) },
        createdAt: { gte: startOfSaoPauloDay(today) },
      },
      select: { userId: true },
    });

    const remindedIds = new Set(alreadyReminded.map((row) => row.userId));
    return users.filter((user) => !remindedIds.has(user.userId));
  }

  private async send(kind: ReminderKind, recipients: ActiveUser[]) {
    const { title, message } = REMINDERS[kind];
    const userIdsByCompany = new Map<string, string[]>();
    for (const { userId, companyId } of recipients) {
      const userIds = userIdsByCompany.get(companyId) ?? [];
      userIds.push(userId);
      userIdsByCompany.set(companyId, userIds);
    }

    for (const [companyId, userIds] of userIdsByCompany) {
      await this.notifications.createMany(
        userIds,
        NotificationType.TIME_CLOCK_REMINDER,
        title,
        message,
        { companyId },
      );
    }
  }
}

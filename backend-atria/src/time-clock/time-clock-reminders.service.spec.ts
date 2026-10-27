import { NotificationType, TimeClockEntryType } from '@prisma/client';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../prisma/prisma.service';
import { TimeClockRemindersService } from './time-clock-reminders.service';

const { IN, BREAK_START, OUT } = TimeClockEntryType;

interface TodayPunch {
  userId: string;
  type: TimeClockEntryType;
  punchedAt: Date;
}

function setup(options: {
  activeUserIds: string[];
  todayPunches?: TodayPunch[];
  alreadyRemindedIds?: string[];
}) {
  const findMany = jest
    .fn()
    .mockResolvedValueOnce(
      options.activeUserIds.map((userId) => ({ userId, companyId: 'c1' })),
    )
    .mockResolvedValueOnce(options.todayPunches ?? []);
  const prisma = {
    timeClockEntry: { findMany },
    notification: {
      findMany: jest
        .fn()
        .mockResolvedValue(
          (options.alreadyRemindedIds ?? []).map((userId) => ({ userId })),
        ),
    },
  };
  const notifications = { createMany: jest.fn().mockResolvedValue(undefined) };
  const service = new TimeClockRemindersService(
    prisma as unknown as PrismaService,
    notifications as unknown as NotificationsService,
  );
  return { service, notifications };
}

const REMINDER_ARGS = [
  NotificationType.TIME_CLOCK_REMINDER,
  expect.any(String),
  expect.any(String),
  { companyId: 'c1' },
] as const;

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

describe('TimeClockRemindersService', () => {
  it('reminds users who have not clocked in today', async () => {
    const { service, notifications } = setup({
      activeUserIds: ['u1', 'u2'],
      todayPunches: [{ userId: 'u2', type: IN, punchedAt: minutesAgo(30) }],
    });

    await service.remindClockIn();

    expect(notifications.createMany).toHaveBeenCalledWith(
      ['u1'],
      NotificationType.TIME_CLOCK_REMINDER,
      'Registre sua entrada',
      expect.any(String),
      { companyId: 'c1' },
    );
  });

  it('reminds about lunch only after one hour on break', async () => {
    const { service, notifications } = setup({
      activeUserIds: ['u1', 'u2'],
      todayPunches: [
        { userId: 'u1', type: BREAK_START, punchedAt: minutesAgo(65) },
        { userId: 'u2', type: BREAK_START, punchedAt: minutesAgo(40) },
      ],
    });

    await service.remindLunchReturn();

    expect(notifications.createMany).toHaveBeenCalledTimes(1);
    expect(notifications.createMany).toHaveBeenCalledWith(
      ['u1'],
      ...REMINDER_ARGS,
    );
  });

  it('reminds users still working at the end of the day', async () => {
    const { service, notifications } = setup({
      activeUserIds: ['u1', 'u2'],
      todayPunches: [
        { userId: 'u1', type: IN, punchedAt: minutesAgo(500) },
        { userId: 'u2', type: OUT, punchedAt: minutesAgo(5) },
      ],
    });

    await service.remindClockOut();

    expect(notifications.createMany).toHaveBeenCalledWith(
      ['u1'],
      ...REMINDER_ARGS,
    );
  });

  it('does not remind the same user twice in a day', async () => {
    const { service, notifications } = setup({
      activeUserIds: ['u1'],
      alreadyRemindedIds: ['u1'],
    });

    await service.remindClockIn();

    expect(notifications.createMany).not.toHaveBeenCalled();
  });
});

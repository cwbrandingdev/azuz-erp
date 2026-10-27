import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TimeClockEntryType, UserCategory } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateManualTimeClockEntryDto,
  TimeClockListQueryDto,
  TimeClockRangeQueryDto,
  UpdateTimeClockEntryDto,
} from './dto/time-clock.dto';
import {
  currentMonthRange,
  daysBetween,
  endOfSaoPauloDayExclusive,
  startOfSaoPauloDay,
  toSaoPauloDayKey,
} from './time-clock-dates';
import type { PunchContext } from './punch-context';
import {
  WorkHoursCalculator,
  type TimeClockPunch,
  type WorkDaySummary,
} from './work-hours.calculator';

// Guards against accidental double clicks on the punch button.
const MIN_MS_BETWEEN_PUNCHES = 60_000;
const MAX_RANGE_DAYS = 93;

const ENTRY_SELECT = {
  id: true,
  userId: true,
  type: true,
  punchedAt: true,
  isManual: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
} satisfies Prisma.TimeClockEntrySelect;

type TimeClockEntryView = Prisma.TimeClockEntryGetPayload<{
  select: typeof ENTRY_SELECT;
}>;

export type TimeClockStatus = 'WORKING' | 'ON_BREAK' | 'OFF';

export interface DateRange {
  from: string;
  to: string;
}

@Injectable()
export class TimeClockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: WorkHoursCalculator,
  ) {}

  async punch(
    user: AuthenticatedUser,
    type: TimeClockEntryType,
    context: PunchContext,
  ) {
    const companyId = this.requireMemberCompany(user);
    const todayEntries = await this.findEntries(companyId, {
      userId: user.userId,
      range: this.singleDayRange(new Date()),
    });

    if (!this.calculator.allowedTypes(todayEntries).includes(type)) {
      throw new BadRequestException(`${type} punch is not allowed right now`);
    }

    const lastEntry = todayEntries.at(-1);
    if (
      lastEntry &&
      Date.now() - lastEntry.punchedAt.getTime() < MIN_MS_BETWEEN_PUNCHES
    ) {
      throw new BadRequestException('Wait at least one minute between punches');
    }

    return this.prisma.timeClockEntry.create({
      data: {
        companyId,
        userId: user.userId,
        type,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      select: ENTRY_SELECT,
    });
  }

  async getMine(user: AuthenticatedUser, query: TimeClockRangeQueryDto) {
    const companyId = this.requireMemberCompany(user);
    const range = this.resolveRange(query);
    const [entries, todayEntries] = await Promise.all([
      this.findEntries(companyId, { userId: user.userId, range }),
      this.findEntries(companyId, {
        userId: user.userId,
        range: this.singleDayRange(new Date()),
      }),
    ]);

    const days = this.calculator.summarizeByDay(entries);
    return {
      range,
      allowedTypes: this.calculator.allowedTypes(todayEntries),
      totalMinutes: this.calculator.totalMinutes(days),
      days,
    };
  }

  async list(user: AuthenticatedUser, query: TimeClockListQueryDto) {
    const companyId = this.requireCompany(user);
    const range = this.resolveRange(query);
    const [members, entries] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          companyId,
          category: UserCategory.MEMBER,
          isActive: true,
          ...(query.userId ? { id: query.userId } : {}),
        },
        select: { id: true, name: true, avatarUrl: true },
        orderBy: { name: 'asc' },
      }),
      this.findEntries(companyId, { userId: query.userId, range }),
    ]);

    const today = toSaoPauloDayKey(new Date());
    const entriesByUser = this.groupByUser(entries);
    const users = members.map((member) => {
      const days = this.calculator.summarizeByDay(
        entriesByUser.get(member.id) ?? [],
      );
      return {
        user: member,
        totalMinutes: this.calculator.totalMinutes(days),
        status: this.currentStatus(days, today),
        days,
      };
    });

    return { range, users };
  }

  async createManual(
    admin: AuthenticatedUser,
    dto: CreateManualTimeClockEntryDto,
  ) {
    const companyId = this.requireCompany(admin);
    await this.assertMemberOfCompany(dto.userId, companyId);

    return this.prisma.timeClockEntry.create({
      data: {
        companyId,
        userId: dto.userId,
        type: dto.type,
        punchedAt: this.parsePastDate(dto.punchedAt),
        isManual: true,
        note: dto.note.trim(),
        createdById: admin.userId,
      },
      select: ENTRY_SELECT,
    });
  }

  async update(
    admin: AuthenticatedUser,
    entryId: string,
    dto: UpdateTimeClockEntryDto,
  ) {
    const companyId = this.requireCompany(admin);
    const existing = await this.prisma.timeClockEntry.findFirst({
      where: { id: entryId, companyId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Time clock entry not found');
    }

    return this.prisma.timeClockEntry.update({
      where: { id: entryId },
      data: {
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.punchedAt
          ? { punchedAt: this.parsePastDate(dto.punchedAt) }
          : {}),
        note: dto.note.trim(),
        updatedById: admin.userId,
      },
      select: ENTRY_SELECT,
    });
  }

  private findEntries(
    companyId: string,
    filter: { userId?: string; range: DateRange },
  ): Promise<TimeClockEntryView[]> {
    return this.prisma.timeClockEntry.findMany({
      where: {
        companyId,
        ...(filter.userId ? { userId: filter.userId } : {}),
        punchedAt: {
          gte: startOfSaoPauloDay(filter.range.from),
          lt: endOfSaoPauloDayExclusive(filter.range.to),
        },
      },
      select: ENTRY_SELECT,
      orderBy: { punchedAt: 'asc' },
    });
  }

  private currentStatus(
    days: WorkDaySummary<TimeClockPunch>[],
    today: string,
  ): TimeClockStatus {
    const lastType = days
      .find((day) => day.date === today)
      ?.entries.at(-1)?.type;

    if (lastType === TimeClockEntryType.BREAK_START) return 'ON_BREAK';
    if (lastType === TimeClockEntryType.IN) return 'WORKING';
    if (lastType === TimeClockEntryType.BREAK_END) return 'WORKING';
    return 'OFF';
  }

  private groupByUser(
    entries: TimeClockEntryView[],
  ): Map<string, TimeClockEntryView[]> {
    const grouped = new Map<string, TimeClockEntryView[]>();
    for (const entry of entries) {
      const userEntries = grouped.get(entry.userId) ?? [];
      userEntries.push(entry);
      grouped.set(entry.userId, userEntries);
    }
    return grouped;
  }

  private resolveRange(query: TimeClockRangeQueryDto): DateRange {
    const defaults = currentMonthRange();
    const range = {
      from: query.from ?? defaults.from,
      to: query.to ?? defaults.to,
    };

    const span = daysBetween(range.from, range.to);
    if (span < 0) {
      throw new BadRequestException('from must be before to');
    }
    if (span > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Range cannot exceed ${MAX_RANGE_DAYS} days`,
      );
    }
    return range;
  }

  private singleDayRange(date: Date): DateRange {
    const day = toSaoPauloDayKey(date);
    return { from: day, to: day };
  }

  private parsePastDate(value: string): Date {
    const date = new Date(value);
    if (date.getTime() > Date.now()) {
      throw new BadRequestException('Punch time cannot be in the future');
    }
    return date;
  }

  private async assertMemberOfCompany(userId: string, companyId: string) {
    const member = await this.prisma.user.findFirst({
      where: { id: userId, companyId, category: UserCategory.MEMBER },
      select: { id: true },
    });
    if (!member) {
      throw new NotFoundException('User not found');
    }
  }

  private requireMemberCompany(user: AuthenticatedUser): string {
    if (user.category !== UserCategory.MEMBER) {
      throw new ForbiddenException('Only team members can punch the clock');
    }
    return this.requireCompany(user);
  }

  private requireCompany(user: AuthenticatedUser): string {
    if (!user.companyId) {
      throw new ForbiddenException('User is not linked to a company');
    }
    return user.companyId;
  }
}

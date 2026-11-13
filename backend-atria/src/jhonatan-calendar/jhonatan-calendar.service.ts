import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { DEFAULT_COMPANY_ID } from '../company/company.constants';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateJhonatanCalendarDto,
  QueryJhonatanCalendarDto,
} from './dto/jhonatan-calendar.dto';

const MEETING_DURATION_MS = 60 * 60 * 1000;

const appointmentSelect = {
  id: true,
  title: true,
  contactName: true,
  briefing: true,
  leadId: true,
  startAt: true,
  endAt: true,
  createdById: true,
  createdBy: { select: { name: true } },
  lead: { select: { name: true } },
} satisfies Prisma.JhonatanCalendarSelect;

type AppointmentRecord = Prisma.JhonatanCalendarGetPayload<{
  select: typeof appointmentSelect;
}>;

function resolveCompanyId(user: AuthenticatedUser): string {
  return user.companyId?.trim() || DEFAULT_COMPANY_ID;
}

function toResponse(appointment: AppointmentRecord) {
  return {
    id: appointment.id,
    title: appointment.title,
    contactName: appointment.contactName,
    briefing: appointment.briefing,
    leadId: appointment.leadId,
    leadName: appointment.lead?.name ?? null,
    startAt: appointment.startAt.toISOString(),
    endAt: appointment.endAt.toISOString(),
    createdById: appointment.createdById,
    createdByName: appointment.createdBy.name,
  };
}

@Injectable()
export class JhonatanCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser, query: QueryJhonatanCalendarDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from >= to
    ) {
      throw new BadRequestException('Intervalo de datas inválido.');
    }

    const appointments = await this.prisma.jhonatanCalendar.findMany({
      where: {
        companyId: resolveCompanyId(user),
        startAt: { lt: to },
        endAt: { gt: from },
      },
      select: appointmentSelect,
      orderBy: { startAt: 'asc' },
    });

    return appointments.map(toResponse);
  }

  async create(user: AuthenticatedUser, dto: CreateJhonatanCalendarDto) {
    const companyId = resolveCompanyId(user);
    const startAt = new Date(dto.startAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Data da reunião inválida.');
    }

    const endAt = new Date(startAt.getTime() + MEETING_DURATION_MS);
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Informe o título da reunião.');
    }

    const leadId = dto.leadId?.trim() || null;
    let contactName = dto.contactName?.trim() ?? '';

    if (leadId) {
      const lead = await this.prisma.lead.findFirst({
        where: { id: leadId, companyId, deletedAt: null },
        select: { contactName: true, name: true },
      });
      if (!lead) {
        throw new NotFoundException('Lead não encontrado.');
      }
      contactName = lead.contactName?.trim() || lead.name.trim();
    }

    if (!contactName) {
      throw new BadRequestException('Informe um lead ou o nome do contato.');
    }

    const briefing = dto.briefing?.trim() || null;

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId})::bigint)`;

      const conflict = await tx.jhonatanCalendar.findFirst({
        where: {
          companyId,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException('Esse horário já está ocupado.');
      }

      return tx.jhonatanCalendar.create({
        data: {
          companyId,
          leadId,
          title,
          contactName,
          briefing,
          startAt,
          endAt,
          createdById: user.userId,
        },
        select: appointmentSelect,
      });
    });

    return toResponse(created);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const companyId = resolveCompanyId(user);
    const existing = await this.prisma.jhonatanCalendar.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Reunião não encontrada.');
    }

    await this.prisma.jhonatanCalendar.delete({ where: { id } });
  }
}

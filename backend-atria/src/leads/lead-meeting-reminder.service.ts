import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

export const REMINDER_LEAD_TIME_MS = 60 * 60 * 1000;
const SAO_PAULO_TZ = 'America/Sao_Paulo';

interface ReminderMeeting {
  id: string;
  title: string;
  guestName: string;
  guestEmails: string[];
  meetUrl: string | null;
  startAt: Date;
  createdAt: Date;
}

@Injectable()
export class LeadMeetingReminderService {
  private readonly logger = new Logger(LeadMeetingReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  @Cron('* * * * *')
  async handleReminders() {
    const now = new Date();
    const horizon = new Date(now.getTime() + REMINDER_LEAD_TIME_MS);

    const meetings = await this.prisma.leadMeeting.findMany({
      where: {
        guestEmails: { isEmpty: false },
        reminderSentAt: null,
        startAt: { gt: now, lte: horizon },
      },
      select: {
        id: true,
        title: true,
        guestName: true,
        guestEmails: true,
        meetUrl: true,
        startAt: true,
        createdAt: true,
      },
    });

    for (const meeting of meetings) {
      await this.remind(meeting);
    }
  }

  private async remind(meeting: ReminderMeeting) {
    if (meeting.guestEmails.length === 0) return;

    // Reserva antes de enviar: dois ciclos do cron nunca avisam a mesma reunião.
    const claimed = await this.prisma.leadMeeting.updateMany({
      where: { id: meeting.id, reminderSentAt: null },
      data: { reminderSentAt: new Date() },
    });
    if (claimed.count === 0) return;

    // Criada dentro da última hora: o convite do Google acabou de sair.
    const createdInsideWindow =
      meeting.startAt.getTime() - meeting.createdAt.getTime() <
      REMINDER_LEAD_TIME_MS;
    if (createdInsideWindow) return;

    const results = await Promise.allSettled(
      meeting.guestEmails.map((to) =>
        this.mail.send(this.buildEmail(meeting, to)),
      ),
    );
    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failures.length === 0) return;

    this.logger.warn(
      `Falha ao enviar ${failures.length} lembrete(s) da reunião ${meeting.id}: ${String(failures[0].reason)}`,
    );

    if (failures.length === results.length) {
      await this.prisma.leadMeeting.update({
        where: { id: meeting.id },
        data: { reminderSentAt: null },
      });
    }
  }

  private buildEmail(meeting: ReminderMeeting, to: string) {
    const when = new Intl.DateTimeFormat('pt-BR', {
      timeZone: SAO_PAULO_TZ,
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(meeting.startAt);
    const subject = `Lembrete: sua reunião começa em 1 hora - ${meeting.title}`;
    const link = meeting.meetUrl
      ? `\n\nEntrar na reunião: ${meeting.meetUrl}\nUse o e-mail ${to} para entrar direto.`
      : '';
    const text = `Olá, ${meeting.guestName}!\n\nLembrete: "${meeting.title}" começa em 1 hora (${when}).${link}`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">${escapeHtml(subject)}</h2>
        <p style="margin: 0 0 16px;">Olá, ${escapeHtml(meeting.guestName)}!</p>
        <p style="margin: 0 0 16px;">"${escapeHtml(meeting.title)}" começa em 1 hora (${escapeHtml(when)}).</p>
        ${
          meeting.meetUrl
            ? `<p style="margin: 0 0 8px;"><a href="${escapeHtml(meeting.meetUrl)}">Entrar na reunião</a></p>
        <p style="margin: 0; font-size: 12px;">Use o e-mail ${escapeHtml(to)} para entrar direto.</p>`
            : ''
        }
      </div>
    `;
    return { to, subject, text, html };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

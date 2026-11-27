import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType, RoleName } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../company/company.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleMeetService } from './google-meet.service';

const ALERT_TITLE = 'Google Agenda desconectado';
const ALERT_MESSAGE =
  'O Google recusou o acesso do sistema. As reuniões não vão para a agenda nem ganham link do Meet até a conta ser reconectada.';
const ALERT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const ALERT_ROLES: RoleName[] = [RoleName.MASTER, RoleName.ADMIN];

@Injectable()
export class GoogleConnectionMonitorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GoogleConnectionMonitorService.name);

  constructor(
    private readonly googleMeet: GoogleMeetService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // O servidor desliga quando fica sem uso, então também verificamos ao ligar.
  // Sem await: a verificação não pode atrasar a subida do sistema.
  onApplicationBootstrap() {
    void this.verify();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyCheck() {
    await this.verify();
  }

  private async verify() {
    try {
      const status = await this.googleMeet.checkConnection();
      if (status !== 'revoked') return;
      await this.alertAdmins();
    } catch (error) {
      const detail = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Falha ao verificar o Google Agenda: ${detail}`);
    }
  }

  private async alertAdmins() {
    const admins = await this.prisma.user.findMany({
      where: {
        companyId: DEFAULT_COMPANY_ID,
        isActive: true,
        role: { name: { in: ALERT_ROLES } },
      },
      select: { id: true },
    });

    const recentAlerts = await this.prisma.notification.findMany({
      where: {
        type: NotificationType.SYSTEM,
        title: ALERT_TITLE,
        createdAt: { gte: new Date(Date.now() - ALERT_INTERVAL_MS) },
      },
      select: { userId: true },
    });
    const alreadyAlerted = new Set(recentAlerts.map((alert) => alert.userId));

    const pendingIds = admins
      .map((admin) => admin.id)
      .filter((id) => !alreadyAlerted.has(id));
    if (pendingIds.length === 0) return;

    await this.notifications.createMany(
      pendingIds,
      NotificationType.SYSTEM,
      ALERT_TITLE,
      ALERT_MESSAGE,
      { companyId: DEFAULT_COMPANY_ID, push: true },
    );
  }
}

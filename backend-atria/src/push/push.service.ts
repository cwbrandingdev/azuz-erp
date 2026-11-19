import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
  phone?: string;
}


interface SubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

const PUSH_TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private publicKey: string | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY')?.trim();
    const subject = this.config.get<string>('VAPID_SUBJECT')?.trim();

    if (!publicKey || !privateKey || !subject) {
      this.logger.warn('VAPID não configurado: notificações push desativadas.');
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.publicKey = publicKey;
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  // O mesmo aparelho (endpoint) passa a pertencer a quem entrou por último,
  // para quem usa o mesmo PC depois não receber os avisos de quem saiu.
  async subscribe(userId: string, input: SubscriptionInput) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: { userId, ...input },
      update: {
        userId,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
      },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  async sendToUsers(userIds: string[], payload: PushPayload) {
    if (!this.publicKey || userIds.length === 0) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });
    const body = JSON.stringify(payload);

    await Promise.all(
      subscriptions.map((subscription) => this.sendOne(subscription, body)),
    );
  }

  private async sendOne(
    subscription: {
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    },
    body: string,
  ) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        body,
        { TTL: PUSH_TTL_SECONDS },
      );
      await this.prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: { lastUsedAt: new Date() },
      });
    } catch (error) {
      const status =
        error instanceof webpush.WebPushError ? error.statusCode : undefined;

      // 404/410: o aparelho cancelou ou o navegador apagou a inscrição.
      if (status === 404 || status === 410) {
        await this.prisma.pushSubscription.deleteMany({
          where: { id: subscription.id },
        });
        return;
      }

      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Falha ao enviar push (${status ?? 'sem status'}): ${detail}`,
      );
    }
  }
}

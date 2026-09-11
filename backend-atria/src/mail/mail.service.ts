import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { MailProviderName, SendMailInput } from './mail.types';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private smtpTransporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  sendInBackground(input: SendMailInput): void {
    void this.send(input).catch((error: unknown) => {
      const detail = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Failed to send email "${input.subject}": ${detail}`);
    });
  }

  async send(input: SendMailInput): Promise<void> {
    const recipients = this.normalizeRecipients(input.to);
    if (recipients.length === 0) {
      this.logger.warn(`Skipping email "${input.subject}": no recipients`);
      return;
    }

    const provider = this.resolveProvider();
    if (!provider) {
      this.logger.warn(
        `Skipping email "${input.subject}": no mail provider configured`,
      );
      return;
    }

    const payload: SendMailInput = { ...input, to: recipients };

    switch (provider) {
      case 'resend':
        await this.sendViaResend(payload);
        return;
      case 'smtp':
        await this.sendViaSmtp(payload);
        return;
      case 'emailjs':
        await this.sendViaEmailJs(payload);
        return;
    }
  }

  private resolveProvider(): MailProviderName | null {
    const configured = this.config
      .get<string>('MAIL_PROVIDER')
      ?.trim()
      .toLowerCase();

    if (
      configured === 'resend' ||
      configured === 'smtp' ||
      configured === 'emailjs'
    ) {
      return configured;
    }

    if (this.config.get<string>('RESEND_API_KEY')?.trim()) {
      return 'resend';
    }
    if (this.config.get<string>('SMTP_HOST')?.trim()) {
      return 'smtp';
    }
    if (this.config.get<string>('EMAILJS_SERVICE_ID')?.trim()) {
      return 'emailjs';
    }

    return null;
  }

  private normalizeRecipients(to: string | string[]): string[] {
    const values = Array.isArray(to) ? to : [to];
    return [
      ...new Set(
        values
          .map((value) => value.trim().toLowerCase())
          .filter((value) => value.includes('@')),
      ),
    ];
  }

  private resolveFromAddress(): string {
    const smtpUser = this.config.get<string>('SMTP_USER')?.trim();
    const from = this.config.get<string>('MAIL_FROM')?.trim();
    const displayName =
      from?.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() ||
      (from && !from.includes('@') ? from : null) ||
      'Atria';

    // Titan rejects a From address that the authenticated mailbox does not own.
    if (smtpUser) {
      return `${displayName} <${smtpUser}>`;
    }
    if (from) return from;

    const domain =
      this.config.get<string>('COMPANY_EMAIL_DOMAIN')?.trim() || 'atria.com';
    return `Atria <noreply@${domain}>`;
  }

  private async sendViaResend(input: SendMailInput): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.resolveFromAddress(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend request failed (${response.status}): ${body}`);
    }
  }

  private async sendViaSmtp(input: SendMailInput): Promise<void> {
    const transporter = this.getSmtpTransporter();
    await transporter.sendMail({
      from: this.resolveFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }

  private getSmtpTransporter(): Transporter {
    if (this.smtpTransporter) {
      return this.smtpTransporter;
    }

    const host = this.config.get<string>('SMTP_HOST')?.trim();
    if (!host) {
      throw new Error('SMTP_HOST is not configured');
    }

    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const secure =
      this.parseBoolean(this.config.get<string>('SMTP_SECURE')) || port === 465;
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim() ?? '';

    if (!user || !pass) {
      throw new Error(
        'SMTP_USER and SMTP_PASS are required for Titan SMTP. Add them to backend-atria/.env and restart the server.',
      );
    }

    this.smtpTransporter = nodemailer.createTransport({
      host,
      port: Number.isFinite(port) ? port : 587,
      secure,
      auth: { user, pass },
    });

    return this.smtpTransporter;
  }

  private async sendViaEmailJs(input: SendMailInput): Promise<void> {
    const serviceId = this.config.get<string>('EMAILJS_SERVICE_ID')?.trim();
    const templateId = this.config.get<string>('EMAILJS_TEMPLATE_ID')?.trim();
    const publicKey =
      this.config.get<string>('EMAILJS_PUBLIC_KEY')?.trim() ||
      this.config.get<string>('EMAILJS_USER_ID')?.trim();

    if (!serviceId || !templateId || !publicKey) {
      throw new Error(
        'EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID and EMAILJS_PUBLIC_KEY are required',
      );
    }

    const privateKey = this.config.get<string>('EMAILJS_PRIVATE_KEY')?.trim();
    const recipients = Array.isArray(input.to) ? input.to : [input.to];

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          to_email: recipients.join(', '),
          subject: input.subject,
          html: input.html,
          message: input.text,
          ...input.templateParams,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`EmailJS request failed (${response.status}): ${body}`);
    }
  }

  private parseBoolean(value?: string): boolean {
    if (!value) return false;
    return ['1', 'true', 'yes'].includes(value.trim().toLowerCase());
  }
}

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let MailService = MailService_1 = class MailService {
    config;
    logger = new common_1.Logger(MailService_1.name);
    smtpTransporter = null;
    constructor(config) {
        this.config = config;
    }
    sendInBackground(input) {
        void this.send(input).catch((error) => {
            const detail = error instanceof Error ? error.stack : String(error);
            this.logger.error(`Failed to send email "${input.subject}": ${detail}`);
        });
    }
    async send(input) {
        const recipients = this.normalizeRecipients(input.to);
        if (recipients.length === 0) {
            this.logger.warn(`Skipping email "${input.subject}": no recipients`);
            return;
        }
        const provider = this.resolveProvider();
        if (!provider) {
            this.logger.warn(`Skipping email "${input.subject}": no mail provider configured`);
            return;
        }
        const payload = { ...input, to: recipients };
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
    resolveProvider() {
        const configured = this.config
            .get('MAIL_PROVIDER')
            ?.trim()
            .toLowerCase();
        if (configured === 'resend' ||
            configured === 'smtp' ||
            configured === 'emailjs') {
            return configured;
        }
        if (this.config.get('RESEND_API_KEY')?.trim()) {
            return 'resend';
        }
        if (this.config.get('SMTP_HOST')?.trim()) {
            return 'smtp';
        }
        if (this.config.get('EMAILJS_SERVICE_ID')?.trim()) {
            return 'emailjs';
        }
        return null;
    }
    normalizeRecipients(to) {
        const values = Array.isArray(to) ? to : [to];
        return [
            ...new Set(values
                .map((value) => value.trim().toLowerCase())
                .filter((value) => value.includes('@'))),
        ];
    }
    resolveFromAddress() {
        const smtpUser = this.config.get('SMTP_USER')?.trim();
        const from = this.config.get('MAIL_FROM')?.trim();
        const displayName = from?.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() ||
            (from && !from.includes('@') ? from : null) ||
            'Atria';
        if (smtpUser) {
            return `${displayName} <${smtpUser}>`;
        }
        if (from)
            return from;
        const domain = this.config.get('COMPANY_EMAIL_DOMAIN')?.trim() || 'atria.com';
        return `Atria <noreply@${domain}>`;
    }
    async sendViaResend(input) {
        const apiKey = this.config.get('RESEND_API_KEY')?.trim();
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
    async sendViaSmtp(input) {
        const transporter = this.getSmtpTransporter();
        await transporter.sendMail({
            from: this.resolveFromAddress(),
            to: input.to,
            subject: input.subject,
            html: input.html,
            text: input.text,
        });
    }
    getSmtpTransporter() {
        if (this.smtpTransporter) {
            return this.smtpTransporter;
        }
        const host = this.config.get('SMTP_HOST')?.trim();
        if (!host) {
            throw new Error('SMTP_HOST is not configured');
        }
        const port = Number(this.config.get('SMTP_PORT') ?? 587);
        const secure = this.parseBoolean(this.config.get('SMTP_SECURE')) || port === 465;
        const user = this.config.get('SMTP_USER')?.trim();
        const pass = this.config.get('SMTP_PASS')?.trim() ?? '';
        if (!user || !pass) {
            throw new Error('SMTP_USER and SMTP_PASS are required for Titan SMTP. Add them to backend-atria/.env and restart the server.');
        }
        this.smtpTransporter = nodemailer.createTransport({
            host,
            port: Number.isFinite(port) ? port : 587,
            secure,
            auth: { user, pass },
        });
        return this.smtpTransporter;
    }
    async sendViaEmailJs(input) {
        const serviceId = this.config.get('EMAILJS_SERVICE_ID')?.trim();
        const templateId = this.config.get('EMAILJS_TEMPLATE_ID')?.trim();
        const publicKey = this.config.get('EMAILJS_PUBLIC_KEY')?.trim() ||
            this.config.get('EMAILJS_USER_ID')?.trim();
        if (!serviceId || !templateId || !publicKey) {
            throw new Error('EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID and EMAILJS_PUBLIC_KEY are required');
        }
        const privateKey = this.config.get('EMAILJS_PRIVATE_KEY')?.trim();
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
    parseBoolean(value) {
        if (!value)
            return false;
        return ['1', 'true', 'yes'].includes(value.trim().toLowerCase());
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map
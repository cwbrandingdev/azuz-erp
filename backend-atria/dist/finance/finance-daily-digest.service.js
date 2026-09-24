"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var FinanceDailyDigestService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceDailyDigestService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const exceljs_1 = __importDefault(require("exceljs"));
const mail_service_1 = require("../mail/mail.service");
const prisma_service_1 = require("../prisma/prisma.service");
const SAO_PAULO_TZ = 'America/Sao_Paulo';
const FINANCE_ROLES = [client_1.RoleName.MASTER, client_1.RoleName.ADMIN];
const EXTRA_RECIPIENTS = [
    { name: 'Jhonatan', email: 'jhonatan@cwbranding.com.br' },
];
let FinanceDailyDigestService = FinanceDailyDigestService_1 = class FinanceDailyDigestService {
    prisma;
    mail;
    logger = new common_1.Logger(FinanceDailyDigestService_1.name);
    logTableReady = false;
    constructor(prisma, mail) {
        this.prisma = prisma;
        this.mail = mail;
    }
    async onModuleInit() {
        if (!process.env.FLY_APP_NAME?.trim())
            return;
        try {
            await this.sendDailyAccountsEmail();
        }
        catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            this.logger.error(`Daily accounts email on startup failed: ${detail}`);
        }
    }
    handleDailyAccountsEmail() {
        return this.sendDailyAccountsEmail();
    }
    async sendDailyAccountsEmail(day = this.saoPauloDay()) {
        const users = await this.prisma.user.findMany({
            where: {
                isActive: true,
                role: { name: { in: FINANCE_ROLES } },
            },
            select: { name: true, email: true, companyId: true },
            orderBy: { name: 'asc' },
        });
        const byCompany = new Map();
        for (const user of users) {
            const email = user.email.trim().toLowerCase();
            if (!email.includes('@'))
                continue;
            const current = byCompany.get(user.companyId) ?? [];
            current.push({ name: user.name, email, companyId: user.companyId });
            byCompany.set(user.companyId, current);
        }
        for (const [companyId, recipients] of byCompany) {
            for (const extra of EXTRA_RECIPIENTS) {
                if (recipients.some((recipient) => recipient.email === extra.email)) {
                    continue;
                }
                recipients.push({ ...extra, companyId });
            }
        }
        let sent = 0;
        for (const [companyId, recipients] of byCompany) {
            if (await this.wasSent(companyId, day.iso)) {
                this.logger.log(`Daily accounts email already sent for ${day.label} (company ${companyId})`);
                continue;
            }
            const lines = await this.loadTodayLines(companyId, day);
            const workbook = await this.buildWorkbook(day, lines);
            const filename = `contas-de-hoje-${day.iso}.xlsx`;
            let companySent = 0;
            for (const recipient of recipients) {
                try {
                    await this.mail.send({
                        to: recipient.email,
                        subject: `Contas de hoje — ${day.label}`,
                        text: this.buildText(recipient.name, day.label, lines),
                        html: this.buildHtml(recipient.name, day.label, lines),
                        attachments: [
                            {
                                filename,
                                content: workbook,
                                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            },
                        ],
                    });
                    sent += 1;
                    companySent += 1;
                }
                catch (error) {
                    const detail = error instanceof Error ? error.message : String(error);
                    this.logger.error(`Failed to send daily accounts email to ${recipient.email}: ${detail}`);
                }
            }
            if (companySent > 0) {
                await this.markSent(companyId, day.iso);
            }
        }
        this.logger.log(`Daily accounts email: ${sent} message(s) for ${byCompany.size} company(ies) on ${day.label}`);
        return { sent, companies: byCompany.size };
    }
    async wasSent(companyId, iso) {
        await this.ensureLogTable();
        const rows = await this.prisma.$queryRawUnsafe(`SELECT EXISTS(
         SELECT 1 FROM finance_digest_log
         WHERE company_id = $1 AND sent_on = $2
       ) AS sent`, companyId, iso);
        return Boolean(rows[0]?.sent);
    }
    async markSent(companyId, iso) {
        await this.ensureLogTable();
        await this.prisma.$executeRawUnsafe(`INSERT INTO finance_digest_log (company_id, sent_on)
       VALUES ($1, $2)
       ON CONFLICT (company_id, sent_on) DO NOTHING`, companyId, iso);
    }
    async ensureLogTable() {
        if (this.logTableReady)
            return;
        await this.prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS finance_digest_log (
         company_id TEXT NOT NULL,
         sent_on TEXT NOT NULL,
         PRIMARY KEY (company_id, sent_on)
       )`);
        this.logTableReady = true;
    }
    async loadTodayLines(companyId, day) {
        const windowStart = new Date(day.start.getTime() - 24 * 60 * 60 * 1000);
        const windowEnd = new Date(day.end.getTime() + 24 * 60 * 60 * 1000);
        const transactions = await this.prisma.financialTransaction.findMany({
            where: {
                companyId,
                deletedAt: null,
                status: { in: [client_1.TransactionStatus.PENDING, client_1.TransactionStatus.OVERDUE] },
                OR: [
                    { dueDate: { gte: windowStart, lte: windowEnd } },
                    {
                        dueDate: null,
                        date: { gte: windowStart, lte: windowEnd },
                    },
                ],
            },
            include: {
                category: { select: { name: true, code: true, dreGroup: true } },
                client: { select: { companyName: true } },
            },
            orderBy: [{ amount: 'desc' }, { description: 'asc' }],
        });
        return transactions
            .filter((tx) => tx.category?.dreGroup !== client_1.DreGroup.TRANSFER)
            .filter((tx) => this.calendarDay(tx.dueDate ?? tx.date) === day.iso)
            .map((tx) => ({
            type: tx.type,
            title: (tx.title?.trim() || tx.description).trim(),
            category: this.accountLabel(tx.category?.name ?? '', tx.category?.code ?? null),
            client: tx.client?.companyName?.trim() ?? '',
            amount: Number(tx.amount),
            dueLabel: this.formatStoredDate(tx.dueDate ?? tx.date),
            status: tx.status === client_1.TransactionStatus.OVERDUE ? 'Atrasado' : 'Pendente',
        }));
    }
    async buildWorkbook(day, lines) {
        const workbook = new exceljs_1.default.Workbook();
        const sheet = workbook.addWorksheet(`Contas ${day.iso}`.slice(0, 31));
        sheet.columns = [
            { header: 'Tipo', key: 'type', width: 14 },
            { header: 'Descrição', key: 'title', width: 36 },
            { header: 'Categoria', key: 'category', width: 32 },
            { header: 'Cliente', key: 'client', width: 28 },
            { header: 'Valor', key: 'amount', width: 16 },
            { header: 'Vencimento', key: 'due', width: 14 },
            { header: 'Status', key: 'status', width: 14 },
        ];
        for (const line of lines) {
            const row = sheet.addRow({
                type: line.type === client_1.TransactionType.INCOME ? 'A receber' : 'A pagar',
                title: line.title,
                category: line.category,
                client: line.client,
                amount: line.amount,
                due: line.dueLabel,
                status: line.status,
            });
            row.getCell('amount').numFmt = '"R$" #,##0.00';
        }
        sheet.addRow([]);
        const totals = this.totals(lines);
        const receiveRow = sheet.addRow(['Total a receber', '', '', '', totals.receive]);
        const payRow = sheet.addRow(['Total a pagar', '', '', '', totals.pay]);
        const balanceRow = sheet.addRow(['Saldo do dia', '', '', '', totals.balance]);
        for (const row of [receiveRow, payRow, balanceRow]) {
            row.getCell(5).numFmt = '"R$" #,##0.00';
            row.font = { bold: true };
        }
        sheet.getRow(1).font = { bold: true };
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    buildText(name, dateLabel, lines) {
        const income = lines.filter((line) => line.type === client_1.TransactionType.INCOME);
        const expense = lines.filter((line) => line.type === client_1.TransactionType.EXPENSE);
        const totals = this.totals(lines);
        const section = (title, items, empty) => {
            if (items.length === 0)
                return `${title}\n${empty}`;
            return [
                title,
                ...items.map((item) => `- ${item.title} | ${item.category || 'Sem categoria'}${item.client ? ` | ${item.client}` : ''} | ${item.dueLabel} | ${item.status} | ${this.money(item.amount)}`),
            ].join('\n');
        };
        return [
            `Contas de hoje — ${name}`,
            dateLabel,
            '',
            section('A receber hoje', income, 'Nenhuma conta a receber hoje.'),
            '',
            section('A pagar hoje', expense, 'Nenhuma conta a pagar hoje.'),
            '',
            `Total a receber: ${this.money(totals.receive)}`,
            `Total a pagar: ${this.money(totals.pay)}`,
            `Saldo do dia: ${this.money(totals.balance)}`,
            '',
            'A mesma informação está em anexo, em Excel.',
            'Relatório automático diário, enviado às 6h (horário de Brasília).',
        ].join('\n');
    }
    buildHtml(name, dateLabel, lines) {
        const income = lines.filter((line) => line.type === client_1.TransactionType.INCOME);
        const expense = lines.filter((line) => line.type === client_1.TransactionType.EXPENSE);
        const totals = this.totals(lines);
        const balanceColor = totals.balance < 0 ? '#dc2626' : '#059669';
        return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#e8eef5;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8eef5;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#0b1220;color:#ffffff;text-align:center;font-size:22px;font-weight:700;padding:22px 16px;">Atria</td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px;">
                <div style="font-size:22px;font-weight:700;line-height:1.3;">Contas de hoje — ${this.escape(name)}</div>
                <div style="margin-top:8px;color:#94a3b8;font-size:14px;">${this.escape(dateLabel)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 0;">
                ${this.sectionHtml('A receber hoje', '#059669', income, 'Nenhuma conta a receber hoje.', '#059669')}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 0;">
                ${this.sectionHtml('A pagar hoje', '#dc2626', expense, 'Nenhuma conta a pagar hoje.', '#dc2626')}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;">
                  <tr>
                    <td style="padding:14px 16px;color:#64748b;">Total a receber</td>
                    <td style="padding:14px 16px;text-align:right;color:#059669;font-weight:700;">${this.money(totals.receive)}</td>
                  </tr>
                  <tr>
                    <td style="padding:0 16px 14px;color:#64748b;border-top:1px solid #e2e8f0;">Total a pagar</td>
                    <td style="padding:14px 16px 14px;text-align:right;color:#dc2626;font-weight:700;border-top:1px solid #e2e8f0;">${this.money(totals.pay)}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;font-weight:700;border-top:1px solid #e2e8f0;">Saldo do dia</td>
                    <td style="padding:14px 16px;text-align:right;font-weight:700;color:${balanceColor};border-top:1px solid #e2e8f0;">${this.money(totals.balance)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px;color:#64748b;font-size:13px;">A mesma informação está em anexo, em Excel.</td>
            </tr>
            <tr>
              <td style="padding:16px 32px 28px;">
                <div style="border-top:1px solid #e2e8f0;padding-top:16px;color:#94a3b8;font-size:12px;text-align:center;line-height:1.5;">
                  Relatório automático diário, enviado às 6h (horário de Brasília).
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
    }
    sectionHtml(title, color, lines, empty, amountColor) {
        const body = lines.length === 0
            ? `<div style="color:#94a3b8;font-size:14px;">${empty}</div>`
            : lines
                .map((line) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid #e2e8f0;border-radius:12px;">
              <tr>
                <td style="padding:12px 14px;font-size:14px;line-height:1.4;">
                  <div style="font-weight:700;">${this.escape(line.title)}</div>
                  <div style="color:#64748b;font-size:12px;margin-top:4px;">${this.escape(line.category || 'Sem categoria')}</div>
                  ${line.client ? `<div style="color:#64748b;font-size:12px;margin-top:2px;">Cliente: ${this.escape(line.client)}</div>` : ''}
                  <div style="color:#94a3b8;font-size:12px;margin-top:6px;">Vencimento ${this.escape(line.dueLabel)} · ${this.escape(line.status)}</div>
                </td>
                <td style="padding:12px 14px;text-align:right;white-space:nowrap;font-weight:700;color:${amountColor};vertical-align:top;">${this.money(line.amount)}</td>
              </tr>
            </table>`)
                .join('');
        return `<div style="border-left:3px solid ${color};padding-left:10px;margin-bottom:8px;color:${color};font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">${title}</div>
      ${body}`;
    }
    totals(lines) {
        const receive = this.round(lines
            .filter((line) => line.type === client_1.TransactionType.INCOME)
            .reduce((sum, line) => sum + line.amount, 0));
        const pay = this.round(lines
            .filter((line) => line.type === client_1.TransactionType.EXPENSE)
            .reduce((sum, line) => sum + line.amount, 0));
        return { receive, pay, balance: this.round(receive - pay) };
    }
    saoPauloDay() {
        const iso = new Intl.DateTimeFormat('en-CA', {
            timeZone: SAO_PAULO_TZ,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date());
        const [year, month, day] = iso.split('-');
        return {
            iso,
            label: `${day}/${month}/${year}`,
            start: new Date(`${iso}T00:00:00-03:00`),
            end: new Date(`${iso}T23:59:59.999-03:00`),
        };
    }
    calendarDay(date) {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: SAO_PAULO_TZ,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(date);
    }
    formatStoredDate(date) {
        const iso = this.calendarDay(date);
        const [year, month, day] = iso.split('-');
        return `${day}/${month}/${year}`;
    }
    accountLabel(name, code) {
        if (!code)
            return name;
        if (name === code || name.startsWith(`${code} `))
            return name;
        return `${code} ${name}`;
    }
    money(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    }
    round(value) {
        return Math.round(value * 100) / 100;
    }
    escape(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
};
exports.FinanceDailyDigestService = FinanceDailyDigestService;
__decorate([
    (0, schedule_1.Cron)('0 6 * * *', { timeZone: SAO_PAULO_TZ }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FinanceDailyDigestService.prototype, "handleDailyAccountsEmail", null);
exports.FinanceDailyDigestService = FinanceDailyDigestService = FinanceDailyDigestService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService])
], FinanceDailyDigestService);
//# sourceMappingURL=finance-daily-digest.service.js.map
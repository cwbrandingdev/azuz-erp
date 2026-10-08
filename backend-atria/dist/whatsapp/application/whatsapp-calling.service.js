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
var WhatsAppCallingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppCallingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const whatsapp_call_1 = require("../domain/whatsapp-call");
const whatsapp_graph_gateway_1 = require("../domain/whatsapp-graph.gateway");
const whatsapp_message_1 = require("../domain/whatsapp-message");
const whatsapp_message_repository_1 = require("../domain/whatsapp-message.repository");
const whatsapp_phone_1 = require("../domain/whatsapp-phone");
let WhatsAppCallingService = WhatsAppCallingService_1 = class WhatsAppCallingService {
    prisma;
    graph;
    messages;
    logger = new common_1.Logger(WhatsAppCallingService_1.name);
    constructor(prisma, graph, messages) {
        this.prisma = prisma;
        this.graph = graph;
        this.messages = messages;
    }
    async handleWebhook(payload) {
        for (const entry of payload.entry ?? []) {
            for (const change of entry.changes ?? []) {
                const value = change.value;
                if (!value)
                    continue;
                const contactName = value.contacts?.[0]?.profile?.name ?? null;
                for (const call of value.calls ?? []) {
                    await this.persistCallEvent(call, contactName);
                }
                for (const status of value.statuses ?? []) {
                    if (status.type && status.type !== 'call')
                        continue;
                    await this.persistCallStatus(status);
                }
            }
        }
    }
    async listLive() {
        const rows = await this.prisma.whatsAppCall.findMany({
            where: { status: { in: whatsapp_call_1.LIVE_CALL_STATUSES } },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((row) => this.toRecord(row));
    }
    async getById(id) {
        const row = await this.prisma.whatsAppCall.findUnique({ where: { id } });
        if (!row) {
            throw new common_1.NotFoundException('Call not found');
        }
        return this.toRecord(row);
    }
    async getPermissions(phone) {
        await this.graph.enableCalling().catch(() => undefined);
        const userWaId = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(phone);
        return this.graph.getCallPermissions(userWaId);
    }
    async requestPermission(phone, userId) {
        const recipient = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(phone);
        const permissions = await this.graph.getCallPermissions(recipient);
        if (!permissions.canRequestPermission && !permissions.canStartCall) {
            throw new common_1.ForbiddenException({
                message: 'Não é possível pedir permissão de ligação para este número agora.',
                code: 'CALL_PERMISSION_LIMIT',
            });
        }
        if (permissions.canStartCall) {
            return { alreadyGranted: true, permissions };
        }
        const result = await this.graph.sendCallPermissionRequest(recipient);
        const businessPhone = await this.graph.getBusinessPhone();
        const conversation = await this.messages.upsertConversation({
            phone: recipient,
            preview: 'Pedido de permissão para ligação',
            inbound: false,
        });
        await this.messages.create({
            whatsappMessageId: result.whatsappMessageId,
            fromPhone: businessPhone,
            toPhone: result.to,
            body: 'Pedido de permissão para ligação de voz',
            direction: whatsapp_message_1.WhatsAppDirection.OUTBOUND,
            status: whatsapp_message_1.WhatsAppStatus.SENT,
            isPrivate: false,
            sentByUserId: userId ?? null,
            conversationId: conversation.id,
        });
        return { alreadyGranted: false, permissions };
    }
    async initiate(to, sdp, userId) {
        const recipient = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(to);
        if (!sdp.trim()) {
            throw new common_1.BadRequestException('SDP offer is required');
        }
        const permissions = await this.graph.getCallPermissions(recipient);
        if (!permissions.canStartCall) {
            throw new common_1.ForbiddenException({
                message: 'Este contato ainda não autorizou ligações. Envie o pedido de permissão primeiro.',
                code: 'CALL_PERMISSION_REQUIRED',
            });
        }
        const connected = await this.graph.connectCall(recipient, {
            sdpType: 'offer',
            sdp,
        });
        const row = await this.prisma.whatsAppCall.create({
            data: {
                whatsappCallId: connected.callId,
                phone: recipient,
                direction: client_1.WhatsAppCallDirection.OUTBOUND,
                status: client_1.WhatsAppCallStatus.CONNECTING,
                offerSdp: sdp,
            },
        });
        await this.noteCall(recipient, 'Ligação de voz iniciada', false, userId);
        return this.toRecord(row);
    }
    async answer(id, sdp) {
        const row = await this.requireCall(id);
        if (row.direction !== client_1.WhatsAppCallDirection.INBOUND) {
            throw new common_1.BadRequestException('Only inbound calls can be answered');
        }
        if (!whatsapp_call_1.LIVE_CALL_STATUSES.includes(row.status)) {
            throw new common_1.BadRequestException('Call is no longer ringing');
        }
        if (!sdp.trim()) {
            throw new common_1.BadRequestException('SDP answer is required');
        }
        const session = { sdpType: 'answer', sdp };
        await this.graph.callAction(row.whatsappCallId, 'pre_accept', session);
        await this.graph.callAction(row.whatsappCallId, 'accept', session);
        const updated = await this.prisma.whatsAppCall.update({
            where: { id: row.id },
            data: {
                answerSdp: sdp,
                status: client_1.WhatsAppCallStatus.IN_PROGRESS,
                startedAt: row.startedAt ?? new Date(),
            },
        });
        return this.toRecord(updated);
    }
    async reject(id) {
        const row = await this.requireCall(id);
        await this.graph.callAction(row.whatsappCallId, 'reject').catch(() => undefined);
        const updated = await this.prisma.whatsAppCall.update({
            where: { id: row.id },
            data: {
                status: client_1.WhatsAppCallStatus.REJECTED,
                endedAt: new Date(),
            },
        });
        await this.noteCall(row.phone, 'Ligação recusada', true);
        return this.toRecord(updated);
    }
    async hangup(id) {
        const row = await this.requireCall(id);
        await this.graph
            .callAction(row.whatsappCallId, 'terminate')
            .catch(() => undefined);
        const endedAt = new Date();
        const startedAt = row.startedAt ?? row.createdAt;
        const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
        const updated = await this.prisma.whatsAppCall.update({
            where: { id: row.id },
            data: {
                status: client_1.WhatsAppCallStatus.ENDED,
                endedAt,
                durationSeconds,
            },
        });
        await this.noteCall(row.phone, `Ligação encerrada · ${this.formatDuration(durationSeconds)}`, row.direction === client_1.WhatsAppCallDirection.INBOUND);
        return this.toRecord(updated);
    }
    async persistCallEvent(call, contactName) {
        if (!call.id)
            return;
        const { type, sdp } = (0, whatsapp_call_1.readCallSdp)(call);
        const direction = (0, whatsapp_call_1.mapCallDirection)(call.direction);
        const phone = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(direction === whatsapp_call_1.WhatsAppCallDirection.INBOUND
            ? (call.from ?? '')
            : (call.to ?? ''));
        if (!phone)
            return;
        if (call.event === 'connect') {
            const existing = await this.prisma.whatsAppCall.findUnique({
                where: { whatsappCallId: call.id },
            });
            if (existing) {
                await this.prisma.whatsAppCall.update({
                    where: { id: existing.id },
                    data: {
                        ...(type === 'answer' ? { answerSdp: sdp } : {}),
                        ...(type === 'offer' ? { offerSdp: sdp } : {}),
                        status: existing.status === client_1.WhatsAppCallStatus.CONNECTING
                            ? client_1.WhatsAppCallStatus.RINGING
                            : existing.status,
                    },
                });
                return;
            }
            await this.prisma.whatsAppCall.create({
                data: {
                    whatsappCallId: call.id,
                    phone,
                    direction,
                    status: client_1.WhatsAppCallStatus.RINGING,
                    offerSdp: type === 'offer' ? sdp : null,
                    answerSdp: type === 'answer' ? sdp : null,
                },
            });
            await this.messages.upsertConversation({
                phone,
                name: contactName,
                preview: direction === whatsapp_call_1.WhatsAppCallDirection.INBOUND
                    ? 'Ligação recebida'
                    : 'Ligação de voz',
                inbound: direction === whatsapp_call_1.WhatsAppCallDirection.INBOUND,
                reopen: true,
            });
            return;
        }
        if (call.event === 'terminate') {
            const existing = await this.prisma.whatsAppCall.findUnique({
                where: { whatsappCallId: call.id },
            });
            const alreadyClosed = existing != null &&
                !whatsapp_call_1.LIVE_CALL_STATUSES.includes(existing.status);
            const terminateStatus = this.mapTerminateStatus(call.status);
            const duration = typeof call.duration === 'number'
                ? call.duration
                : existing
                    ? this.secondsBetween(existing.startedAt ?? existing.createdAt, new Date())
                    : null;
            if (existing && !alreadyClosed) {
                await this.prisma.whatsAppCall.update({
                    where: { id: existing.id },
                    data: {
                        status: terminateStatus,
                        endedAt: new Date(),
                        durationSeconds: duration,
                    },
                });
            }
            if (!alreadyClosed) {
                await this.noteCall(phone, terminateStatus === client_1.WhatsAppCallStatus.REJECTED
                    ? 'Ligação recusada'
                    : `Ligação encerrada${duration != null ? ` · ${this.formatDuration(duration)}` : ''}`, direction === whatsapp_call_1.WhatsAppCallDirection.INBOUND, undefined, contactName);
            }
        }
    }
    async persistCallStatus(status) {
        if (!status.id || !status.status)
            return;
        const mapped = this.mapLiveStatus(status.status);
        if (!mapped)
            return;
        await this.prisma.whatsAppCall.updateMany({
            where: { whatsappCallId: status.id },
            data: {
                status: mapped,
                ...(mapped === client_1.WhatsAppCallStatus.IN_PROGRESS
                    ? { startedAt: new Date() }
                    : {}),
                ...(mapped === client_1.WhatsAppCallStatus.REJECTED
                    ? { endedAt: new Date() }
                    : {}),
            },
        });
    }
    mapLiveStatus(status) {
        const value = status.toUpperCase();
        if (value === 'RINGING')
            return client_1.WhatsAppCallStatus.RINGING;
        if (value === 'ACCEPTED')
            return client_1.WhatsAppCallStatus.IN_PROGRESS;
        if (value === 'REJECTED')
            return client_1.WhatsAppCallStatus.REJECTED;
        return null;
    }
    mapTerminateStatus(status) {
        const raw = Array.isArray(status) ? status.join(' ') : status ?? '';
        const value = raw.toUpperCase();
        if (value.includes('FAIL'))
            return client_1.WhatsAppCallStatus.FAILED;
        if (value.includes('REJECT'))
            return client_1.WhatsAppCallStatus.REJECTED;
        return client_1.WhatsAppCallStatus.ENDED;
    }
    async requireCall(id) {
        const row = await this.prisma.whatsAppCall.findUnique({ where: { id } });
        if (!row) {
            throw new common_1.NotFoundException('Call not found');
        }
        return row;
    }
    async noteCall(phone, body, inbound, userId, name) {
        try {
            const normalized = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(phone);
            const businessPhone = await this.graph.getBusinessPhone();
            const conversation = await this.messages.upsertConversation({
                phone: normalized,
                name,
                preview: body,
                inbound,
                reopen: inbound,
            });
            await this.messages.create({
                whatsappMessageId: null,
                fromPhone: inbound ? normalized : businessPhone,
                toPhone: inbound ? businessPhone : normalized,
                body,
                direction: inbound
                    ? whatsapp_message_1.WhatsAppDirection.INBOUND
                    : whatsapp_message_1.WhatsAppDirection.OUTBOUND,
                status: whatsapp_message_1.WhatsAppStatus.DELIVERED,
                isPrivate: false,
                sentByUserId: userId ?? null,
                conversationId: conversation.id,
            });
        }
        catch (error) {
            this.logger.warn(`Failed to log call in conversation: ${error instanceof Error ? error.message : 'unknown'}`);
        }
    }
    secondsBetween(from, to) {
        return Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));
    }
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const rest = seconds % 60;
        if (minutes === 0)
            return `${rest}s`;
        return `${minutes}min ${rest.toString().padStart(2, '0')}s`;
    }
    toRecord(row) {
        return {
            id: row.id,
            whatsappCallId: row.whatsappCallId,
            phone: row.phone,
            direction: row.direction,
            status: row.status,
            offerSdp: row.offerSdp,
            answerSdp: row.answerSdp,
            startedAt: row.startedAt,
            endedAt: row.endedAt,
            durationSeconds: row.durationSeconds,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
};
exports.WhatsAppCallingService = WhatsAppCallingService;
exports.WhatsAppCallingService = WhatsAppCallingService = WhatsAppCallingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_graph_gateway_1.WhatsAppGraphGateway,
        whatsapp_message_repository_1.WhatsAppMessageRepository])
], WhatsAppCallingService);
//# sourceMappingURL=whatsapp-calling.service.js.map
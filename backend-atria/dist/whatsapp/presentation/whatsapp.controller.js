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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const upload_limits_1 = require("../../common/upload/upload-limits");
const validate_upload_file_size_pipe_1 = require("../../common/upload/validate-upload-file-size.pipe");
const allow_authenticated_decorator_1 = require("../../auth/decorators/allow-authenticated.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const whatsapp_automation_service_1 = require("../application/whatsapp-automation.service");
const whatsapp_collaboration_service_1 = require("../application/whatsapp-collaboration.service");
const whatsapp_crm_service_1 = require("../application/whatsapp-crm.service");
const copilot_dto_1 = require("./dto/copilot.dto");
const transfer_conversation_dto_1 = require("./dto/transfer-conversation.dto");
const whatsapp_routing_service_1 = require("../application/whatsapp-routing.service");
const whatsapp_service_1 = require("../application/whatsapp.service");
const upsert_bot_flow_dto_1 = require("./dto/upsert-bot-flow.dto");
const upsert_broadcast_dto_1 = require("./dto/upsert-broadcast.dto");
const upsert_trigger_dto_1 = require("./dto/upsert-trigger.dto");
const create_canned_response_dto_1 = require("./dto/create-canned-response.dto");
const create_whatsapp_note_dto_1 = require("./dto/create-whatsapp-note.dto");
const query_conversations_dto_1 = require("./dto/query-conversations.dto");
const send_canned_dto_1 = require("./dto/send-canned.dto");
const send_location_dto_1 = require("./dto/send-location.dto");
const send_media_dto_1 = require("./dto/send-media.dto");
const send_template_dto_1 = require("./dto/send-template.dto");
const send_whatsapp_message_dto_1 = require("./dto/send-whatsapp-message.dto");
const update_inbox_settings_dto_1 = require("./dto/update-inbox-settings.dto");
const update_whatsapp_conversation_dto_1 = require("./dto/update-whatsapp-conversation.dto");
const update_crm_contact_dto_1 = require("./dto/update-crm-contact.dto");
const upsert_routing_rules_dto_1 = require("./dto/upsert-routing-rules.dto");
const upsert_stage_messages_dto_1 = require("./dto/upsert-stage-messages.dto");
let WhatsAppController = class WhatsAppController {
    whatsAppService;
    routing;
    crm;
    automation;
    collaboration;
    constructor(whatsAppService, routing, crm, automation, collaboration) {
        this.whatsAppService = whatsAppService;
        this.routing = routing;
        this.crm = crm;
        this.automation = automation;
        this.collaboration = collaboration;
    }
    send(user, dto) {
        return this.whatsAppService.send(dto.to, dto.message, user.userId);
    }
    sendMedia(user, dto, file) {
        if (!file) {
            throw new common_1.BadRequestException('Arquivo obrigatório');
        }
        return this.whatsAppService.sendMedia(dto.to, file, dto.caption, user.userId);
    }
    sendLocation(user, dto) {
        return this.whatsAppService.sendLocation(dto.to, dto.latitude, dto.longitude, dto.name, dto.address, user.userId);
    }
    sendTemplate(user, dto) {
        return this.whatsAppService.sendTemplate(dto.to, dto.name, dto.language, dto.parameters ?? [], user.userId);
    }
    sendCanned(user, dto) {
        return this.whatsAppService.sendCanned(dto.to, dto.cannedId, user.userId);
    }
    listTemplates() {
        return this.whatsAppService.listTemplates();
    }
    inboxCounts(user) {
        return this.routing.inboxCounts(user.companyId ?? '00000000-0000-4000-8000-000000000001', user.userId);
    }
    getSettings(user) {
        return this.routing.getSettings(user.companyId ?? '00000000-0000-4000-8000-000000000001');
    }
    updateSettings(user, dto) {
        return this.routing.updateSettings(user.companyId ?? '00000000-0000-4000-8000-000000000001', dto);
    }
    listRules(user) {
        return this.routing.listRules(user.companyId ?? '00000000-0000-4000-8000-000000000001');
    }
    replaceRules(user, dto) {
        return this.routing.replaceRules(user.companyId ?? '00000000-0000-4000-8000-000000000001', dto.rules);
    }
    listStageMessages(user) {
        return this.crm.listStageMessages(user.companyId ?? '00000000-0000-4000-8000-000000000001');
    }
    replaceStageMessages(user, dto) {
        return this.crm.replaceStageMessages(user.companyId ?? '00000000-0000-4000-8000-000000000001', dto.rules);
    }
    listFlows(user) {
        return this.automation.listFlows(this.companyId(user));
    }
    createFlow(user, dto) {
        return this.automation.createFlow(this.companyId(user), dto);
    }
    updateFlow(user, id, dto) {
        return this.automation.updateFlow(this.companyId(user), id, dto);
    }
    deleteFlow(user, id) {
        return this.automation.deleteFlow(this.companyId(user), id);
    }
    listBroadcasts(user) {
        return this.automation.listBroadcasts(this.companyId(user));
    }
    createBroadcast(user, dto) {
        return this.automation.createBroadcast(this.companyId(user), dto);
    }
    updateBroadcast(user, id, dto) {
        return this.automation.updateBroadcast(this.companyId(user), id, dto);
    }
    previewBroadcast(user, dto) {
        return this.automation.previewBroadcast(this.companyId(user), dto);
    }
    startBroadcast(user, id) {
        return this.automation.startBroadcast(this.companyId(user), id);
    }
    pauseBroadcast(user, id) {
        return this.automation.pauseBroadcast(this.companyId(user), id);
    }
    deleteBroadcast(user, id) {
        return this.automation.deleteBroadcast(this.companyId(user), id);
    }
    listTriggers(user) {
        return this.automation.listTriggers(this.companyId(user));
    }
    createTrigger(user, dto) {
        return this.automation.createTrigger(this.companyId(user), dto);
    }
    updateTrigger(user, id, dto) {
        return this.automation.updateTrigger(this.companyId(user), id, dto);
    }
    deleteTrigger(user, id) {
        return this.automation.deleteTrigger(this.companyId(user), id);
    }
    fireTrigger(user, dto) {
        return this.automation.fireTriggerEvent({
            companyId: this.companyId(user),
            eventType: dto.eventType,
            phone: dto.phone,
            entityKey: dto.entityKey,
            vars: dto.vars,
        });
    }
    listConversations(user, query) {
        return this.whatsAppService.listConversations({
            tab: query.tab,
            status: query.status,
            assignee: query.assignee ?? 'all',
            userId: user.userId,
            query: query.q,
            operatorId: query.operatorId,
            label: query.label,
            stageId: query.stageId,
            source: query.source,
            leadStatus: query.leadStatus,
        }, user.companyId ?? undefined);
    }
    getCrmContext(user, phone) {
        return this.crm.getContext(phone, user.companyId ?? '00000000-0000-4000-8000-000000000001');
    }
    updateCrmContact(user, phone, dto) {
        return this.crm.updateContact(phone, user.companyId ?? '00000000-0000-4000-8000-000000000001', dto, user.userId);
    }
    getConversation(user, phone) {
        return this.whatsAppService.getConversation(phone, user.companyId ?? undefined);
    }
    updateConversation(phone, dto) {
        return this.whatsAppService.updateConversation(phone, {
            name: dto.name,
            status: dto.status,
            priority: dto.priority,
            assignedUserId: dto.assignedUserId === undefined
                ? undefined
                : dto.assignedUserId
                    ? dto.assignedUserId
                    : null,
            labels: dto.labels,
        });
    }
    addNote(user, phone, dto) {
        return this.collaboration.addPrivateNote({
            companyId: this.companyId(user),
            phone,
            message: dto.message,
            userId: user.userId,
        });
    }
    transfer(user, phone, dto) {
        return this.collaboration.transfer({
            companyId: this.companyId(user),
            phone,
            note: dto.note,
            actorUserId: user.userId,
            targetUserId: dto.targetUserId,
            targetUserGroupId: dto.targetUserGroupId,
        });
    }
    copilot(phone, dto) {
        return this.collaboration.copilot({
            phone,
            action: dto.action,
            text: dto.text,
            tone: dto.tone,
        });
    }
    listByPhone(phone) {
        return this.whatsAppService.listByPhone(phone);
    }
    listCannedResponses() {
        return this.whatsAppService.listCannedResponses();
    }
    createCannedResponse(dto, file) {
        return this.whatsAppService.createCannedResponse({
            shortCode: dto.shortCode,
            title: dto.title,
            content: dto.content ?? '',
            file,
        });
    }
    deleteCannedResponse(id) {
        return this.whatsAppService.deleteCannedResponse(id);
    }
    companyId(user) {
        return user.companyId ?? '00000000-0000-4000-8000-000000000001';
    }
};
exports.WhatsAppController = WhatsAppController;
__decorate([
    (0, common_1.Post)('send'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, send_whatsapp_message_dto_1.SendWhatsAppMessageDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "send", null);
__decorate([
    (0, common_1.Post)('send-media'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: upload_limits_1.UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)(validate_upload_file_size_pipe_1.ValidateUploadFileSizePipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, send_media_dto_1.SendMediaDto, Object]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "sendMedia", null);
__decorate([
    (0, common_1.Post)('send-location'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, send_location_dto_1.SendLocationDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "sendLocation", null);
__decorate([
    (0, common_1.Post)('send-template'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, send_template_dto_1.SendTemplateDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "sendTemplate", null);
__decorate([
    (0, common_1.Post)('send-canned'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, send_canned_dto_1.SendCannedDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "sendCanned", null);
__decorate([
    (0, common_1.Get)('templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listTemplates", null);
__decorate([
    (0, common_1.Get)('inbox/counts'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "inboxCounts", null);
__decorate([
    (0, common_1.Get)('inbox/settings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Patch)('inbox/settings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_inbox_settings_dto_1.UpdateInboxSettingsDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('inbox/rules'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listRules", null);
__decorate([
    (0, common_1.Put)('inbox/rules'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upsert_routing_rules_dto_1.UpsertRoutingRulesDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "replaceRules", null);
__decorate([
    (0, common_1.Get)('inbox/stage-messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listStageMessages", null);
__decorate([
    (0, common_1.Put)('inbox/stage-messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upsert_stage_messages_dto_1.UpsertStageMessagesDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "replaceStageMessages", null);
__decorate([
    (0, common_1.Get)('automation/flows'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listFlows", null);
__decorate([
    (0, common_1.Post)('automation/flows'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upsert_bot_flow_dto_1.UpsertBotFlowDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "createFlow", null);
__decorate([
    (0, common_1.Patch)('automation/flows/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, upsert_bot_flow_dto_1.UpsertBotFlowDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "updateFlow", null);
__decorate([
    (0, common_1.Delete)('automation/flows/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "deleteFlow", null);
__decorate([
    (0, common_1.Get)('automation/broadcasts'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listBroadcasts", null);
__decorate([
    (0, common_1.Post)('automation/broadcasts'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upsert_broadcast_dto_1.UpsertBroadcastDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "createBroadcast", null);
__decorate([
    (0, common_1.Patch)('automation/broadcasts/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, upsert_broadcast_dto_1.UpsertBroadcastDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "updateBroadcast", null);
__decorate([
    (0, common_1.Post)('automation/broadcasts/preview'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upsert_broadcast_dto_1.PreviewBroadcastDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "previewBroadcast", null);
__decorate([
    (0, common_1.Post)('automation/broadcasts/:id/start'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "startBroadcast", null);
__decorate([
    (0, common_1.Post)('automation/broadcasts/:id/pause'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "pauseBroadcast", null);
__decorate([
    (0, common_1.Delete)('automation/broadcasts/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "deleteBroadcast", null);
__decorate([
    (0, common_1.Get)('automation/triggers'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listTriggers", null);
__decorate([
    (0, common_1.Post)('automation/triggers'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upsert_trigger_dto_1.UpsertTriggerDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "createTrigger", null);
__decorate([
    (0, common_1.Patch)('automation/triggers/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, upsert_trigger_dto_1.UpsertTriggerDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "updateTrigger", null);
__decorate([
    (0, common_1.Delete)('automation/triggers/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "deleteTrigger", null);
__decorate([
    (0, common_1.Post)('automation/triggers/fire'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upsert_trigger_dto_1.FireTriggerDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "fireTrigger", null);
__decorate([
    (0, common_1.Get)('conversations'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_conversations_dto_1.QueryConversationsDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listConversations", null);
__decorate([
    (0, common_1.Get)('conversations/:phone/crm'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "getCrmContext", null);
__decorate([
    (0, common_1.Patch)('conversations/:phone/crm'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('phone')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_crm_contact_dto_1.UpdateCrmContactDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "updateCrmContact", null);
__decorate([
    (0, common_1.Get)('conversations/:phone'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "getConversation", null);
__decorate([
    (0, common_1.Patch)('conversations/:phone'),
    __param(0, (0, common_1.Param)('phone')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_whatsapp_conversation_dto_1.UpdateWhatsAppConversationDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "updateConversation", null);
__decorate([
    (0, common_1.Post)('conversations/:phone/notes'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('phone')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_whatsapp_note_dto_1.CreateWhatsAppNoteDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "addNote", null);
__decorate([
    (0, common_1.Post)('conversations/:phone/transfer'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('phone')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, transfer_conversation_dto_1.TransferConversationDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "transfer", null);
__decorate([
    (0, common_1.Post)('conversations/:phone/copilot'),
    __param(0, (0, common_1.Param)('phone')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, copilot_dto_1.WhatsAppCopilotDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "copilot", null);
__decorate([
    (0, common_1.Get)('messages/:phone'),
    __param(0, (0, common_1.Param)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listByPhone", null);
__decorate([
    (0, common_1.Get)('canned-responses'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listCannedResponses", null);
__decorate([
    (0, common_1.Post)('canned-responses'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: upload_limits_1.UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES },
    })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_canned_response_dto_1.CreateCannedResponseDto, Object]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "createCannedResponse", null);
__decorate([
    (0, common_1.Delete)('canned-responses/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "deleteCannedResponse", null);
exports.WhatsAppController = WhatsAppController = __decorate([
    (0, common_1.Controller)('whatsapp'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, allow_authenticated_decorator_1.AllowAuthenticated)(),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsAppService,
        whatsapp_routing_service_1.WhatsAppRoutingService,
        whatsapp_crm_service_1.WhatsAppCrmService,
        whatsapp_automation_service_1.WhatsAppAutomationService,
        whatsapp_collaboration_service_1.WhatsAppCollaborationService])
], WhatsAppController);
//# sourceMappingURL=whatsapp.controller.js.map
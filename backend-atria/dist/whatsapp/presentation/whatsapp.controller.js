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
const allow_authenticated_decorator_1 = require("../../auth/decorators/allow-authenticated.decorator");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const whatsapp_calling_service_1 = require("../application/whatsapp-calling.service");
const whatsapp_service_1 = require("../application/whatsapp.service");
const answer_whatsapp_call_dto_1 = require("./dto/answer-whatsapp-call.dto");
const create_canned_response_dto_1 = require("./dto/create-canned-response.dto");
const create_whatsapp_note_dto_1 = require("./dto/create-whatsapp-note.dto");
const initiate_whatsapp_call_dto_1 = require("./dto/initiate-whatsapp-call.dto");
const query_conversations_dto_1 = require("./dto/query-conversations.dto");
const send_whatsapp_message_dto_1 = require("./dto/send-whatsapp-message.dto");
const update_whatsapp_conversation_dto_1 = require("./dto/update-whatsapp-conversation.dto");
let WhatsAppController = class WhatsAppController {
    whatsAppService;
    calling;
    constructor(whatsAppService, calling) {
        this.whatsAppService = whatsAppService;
        this.calling = calling;
    }
    send(user, dto) {
        return this.whatsAppService.send(dto.to, dto.message, user.userId);
    }
    listConversations(user, query) {
        return this.whatsAppService.listConversations({
            status: query.status,
            assignee: query.assignee ?? 'all',
            userId: user.userId,
            query: query.q,
        });
    }
    getConversation(phone) {
        return this.whatsAppService.getConversation(phone);
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
        return this.whatsAppService.addPrivateNote(phone, dto.message, user.userId);
    }
    listByPhone(phone) {
        return this.whatsAppService.listByPhone(phone);
    }
    listLiveCalls() {
        return this.calling.listLive();
    }
    getCall(id) {
        return this.calling.getById(id);
    }
    initiateCall(user, dto) {
        return this.calling.initiate(dto.to, dto.sdp, user.userId);
    }
    answerCall(id, dto) {
        return this.calling.answer(id, dto.sdp);
    }
    rejectCall(id) {
        return this.calling.reject(id);
    }
    hangupCall(id) {
        return this.calling.hangup(id);
    }
    getCallPermissions(phone) {
        return this.calling.getPermissions(phone);
    }
    requestCallPermission(user, phone) {
        return this.calling.requestPermission(phone, user.userId);
    }
    listCannedResponses() {
        return this.whatsAppService.listCannedResponses();
    }
    createCannedResponse(dto) {
        return this.whatsAppService.createCannedResponse(dto);
    }
    deleteCannedResponse(id) {
        return this.whatsAppService.deleteCannedResponse(id);
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
    (0, common_1.Get)('conversations'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, query_conversations_dto_1.QueryConversationsDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listConversations", null);
__decorate([
    (0, common_1.Get)('conversations/:phone'),
    __param(0, (0, common_1.Param)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
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
    (0, common_1.Get)('messages/:phone'),
    __param(0, (0, common_1.Param)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listByPhone", null);
__decorate([
    (0, common_1.Get)('calls'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listLiveCalls", null);
__decorate([
    (0, common_1.Get)('calls/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "getCall", null);
__decorate([
    (0, common_1.Post)('calls'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, initiate_whatsapp_call_dto_1.InitiateWhatsAppCallDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "initiateCall", null);
__decorate([
    (0, common_1.Post)('calls/:id/answer'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, answer_whatsapp_call_dto_1.AnswerWhatsAppCallDto]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "answerCall", null);
__decorate([
    (0, common_1.Post)('calls/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "rejectCall", null);
__decorate([
    (0, common_1.Post)('calls/:id/hangup'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "hangupCall", null);
__decorate([
    (0, common_1.Get)('call-permissions/:phone'),
    __param(0, (0, common_1.Param)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "getCallPermissions", null);
__decorate([
    (0, common_1.Post)('call-permissions/:phone'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "requestCallPermission", null);
__decorate([
    (0, common_1.Get)('canned-responses'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WhatsAppController.prototype, "listCannedResponses", null);
__decorate([
    (0, common_1.Post)('canned-responses'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_canned_response_dto_1.CreateCannedResponseDto]),
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
        whatsapp_calling_service_1.WhatsAppCallingService])
], WhatsAppController);
//# sourceMappingURL=whatsapp.controller.js.map
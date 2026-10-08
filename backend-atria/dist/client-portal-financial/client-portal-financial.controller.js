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
exports.ClientPortalFinancialController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const client_1 = require("@prisma/client");
const multer_1 = require("multer");
const upload_limits_1 = require("../common/upload/upload-limits");
const validate_upload_file_size_pipe_1 = require("../common/upload/validate-upload-file-size.pipe");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const client_portal_financial_service_1 = require("./client-portal-financial.service");
const create_client_financial_attachment_dto_1 = require("./dto/create-client-financial-attachment.dto");
let ClientPortalFinancialController = class ClientPortalFinancialController {
    financialService;
    constructor(financialService) {
        this.financialService = financialService;
    }
    listAttachments(user) {
        const clientId = this.requireClientId(user);
        return this.financialService.listForClient(clientId);
    }
    uploadAttachment(user, file, dto) {
        if (!file) {
            throw new common_1.BadRequestException('Arquivo obrigatório');
        }
        const clientId = this.requireClientId(user);
        return this.financialService.uploadForClient(clientId, dto, file);
    }
    requireClientId(user) {
        if (!user.clientId) {
            throw new common_1.BadRequestException('Usuário CLIENT sem empresa vinculada. Contate o administrador.');
        }
        return user.clientId;
    }
};
exports.ClientPortalFinancialController = ClientPortalFinancialController;
__decorate([
    (0, common_1.Get)('attachments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ClientPortalFinancialController.prototype, "listAttachments", null);
__decorate([
    (0, common_1.Post)('attachments'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: upload_limits_1.UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)(validate_upload_file_size_pipe_1.ValidateUploadFileSizePipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, create_client_financial_attachment_dto_1.CreateClientFinancialAttachmentDto]),
    __metadata("design:returntype", void 0)
], ClientPortalFinancialController.prototype, "uploadAttachment", null);
exports.ClientPortalFinancialController = ClientPortalFinancialController = __decorate([
    (0, common_1.Controller)('client-portal/financial'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.RoleName.CLIENT),
    __metadata("design:paramtypes", [client_portal_financial_service_1.ClientPortalFinancialService])
], ClientPortalFinancialController);
//# sourceMappingURL=client-portal-financial.controller.js.map
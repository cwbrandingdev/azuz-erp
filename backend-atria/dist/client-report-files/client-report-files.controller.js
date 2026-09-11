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
exports.ClientReportFilesController = void 0;
const common_1 = require("@nestjs/common");
const roles_1 = require("../auth/constants/roles");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const client_report_files_service_1 = require("./client-report-files.service");
const client_report_file_dto_1 = require("./dto/client-report-file.dto");
let ClientReportFilesController = class ClientReportFilesController {
    clientReportFilesService;
    constructor(clientReportFilesService) {
        this.clientReportFilesService = clientReportFilesService;
    }
    findAll(query) {
        return this.clientReportFilesService.findAll(query);
    }
    findOne(id) {
        return this.clientReportFilesService.findOne(id);
    }
    create(dto) {
        return this.clientReportFilesService.create(dto);
    }
    update(id, dto) {
        return this.clientReportFilesService.update(id, dto);
    }
    approve(id, dto) {
        return this.clientReportFilesService.approve(id, dto);
    }
    remove(id) {
        return this.clientReportFilesService.remove(id);
    }
};
exports.ClientReportFilesController = ClientReportFilesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [client_report_file_dto_1.QueryClientReportFilesDto]),
    __metadata("design:returntype", void 0)
], ClientReportFilesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientReportFilesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [client_report_file_dto_1.CreateClientReportFileDto]),
    __metadata("design:returntype", void 0)
], ClientReportFilesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, client_report_file_dto_1.UpdateClientReportFileDto]),
    __metadata("design:returntype", void 0)
], ClientReportFilesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, client_report_file_dto_1.ApproveClientReportFileDto]),
    __metadata("design:returntype", void 0)
], ClientReportFilesController.prototype, "approve", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClientReportFilesController.prototype, "remove", null);
exports.ClientReportFilesController = ClientReportFilesController = __decorate([
    (0, common_1.Controller)('client-report-files'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...roles_1.CLIENT_DIRECTORY_ROLES),
    __metadata("design:paramtypes", [client_report_files_service_1.ClientReportFilesService])
], ClientReportFilesController);
//# sourceMappingURL=client-report-files.controller.js.map
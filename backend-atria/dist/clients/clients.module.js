"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientsModule = void 0;
const common_1 = require("@nestjs/common");
const client_requests_module_1 = require("../client-requests/client-requests.module");
const meta_insights_module_1 = require("../meta-insights/meta-insights.module");
const users_module_1 = require("../users/users.module");
const client_360_service_1 = require("./client-360.service");
const clients_controller_1 = require("./clients.controller");
const clients_service_1 = require("./clients.service");
let ClientsModule = class ClientsModule {
};
exports.ClientsModule = ClientsModule;
exports.ClientsModule = ClientsModule = __decorate([
    (0, common_1.Module)({
        imports: [meta_insights_module_1.MetaInsightsModule, client_requests_module_1.ClientRequestsModule, users_module_1.UsersModule],
        controllers: [clients_controller_1.ClientsController],
        providers: [clients_service_1.ClientsService, client_360_service_1.Client360Service],
        exports: [clients_service_1.ClientsService],
    })
], ClientsModule);
//# sourceMappingURL=clients.module.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KanbanModule = void 0;
const common_1 = require("@nestjs/common");
const deliverables_module_1 = require("../deliverables/deliverables.module");
const meta_publishing_module_1 = require("../integrations/meta-publishing/meta-publishing.module");
const notifications_module_1 = require("../notifications/notifications.module");
const sla_module_1 = require("../sla/sla.module");
const kanban_controller_1 = require("./kanban.controller");
const kanban_service_1 = require("./kanban.service");
const tasks_controller_1 = require("./tasks.controller");
let KanbanModule = class KanbanModule {
};
exports.KanbanModule = KanbanModule;
exports.KanbanModule = KanbanModule = __decorate([
    (0, common_1.Module)({
        imports: [
            notifications_module_1.NotificationsModule,
            sla_module_1.SlaModule,
            meta_publishing_module_1.MetaPublishingModule,
            (0, common_1.forwardRef)(() => deliverables_module_1.DeliverablesModule),
        ],
        controllers: [kanban_controller_1.KanbanController, tasks_controller_1.TasksController],
        providers: [kanban_service_1.KanbanService],
        exports: [kanban_service_1.KanbanService],
    })
], KanbanModule);
//# sourceMappingURL=kanban.module.js.map
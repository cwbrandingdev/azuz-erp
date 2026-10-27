"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliverablesModule = void 0;
const common_1 = require("@nestjs/common");
const media_module_1 = require("../common/media/media.module");
const kanban_module_1 = require("../kanban/kanban.module");
const deliverables_controller_1 = require("./deliverables.controller");
const deliverables_service_1 = require("./deliverables.service");
let DeliverablesModule = class DeliverablesModule {
};
exports.DeliverablesModule = DeliverablesModule;
exports.DeliverablesModule = DeliverablesModule = __decorate([
    (0, common_1.Module)({
        imports: [media_module_1.MediaModule, (0, common_1.forwardRef)(() => kanban_module_1.KanbanModule)],
        controllers: [deliverables_controller_1.DeliverablesController],
        providers: [deliverables_service_1.DeliverablesService],
        exports: [deliverables_service_1.DeliverablesService],
    })
], DeliverablesModule);
//# sourceMappingURL=deliverables.module.js.map
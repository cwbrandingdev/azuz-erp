"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELIVERABLE_ACCESS_ROLES = exports.KANBAN_TASK_CREATE_ROLES = exports.CLIENT_LOOKUP_ROLES = exports.CLIENT_DIRECTORY_ROLES = exports.USER_MANAGEMENT_ROLES = exports.INTERNAL_STAFF_ROLES = void 0;
const client_1 = require("@prisma/client");
exports.INTERNAL_STAFF_ROLES = [
    client_1.RoleName.MASTER,
    client_1.RoleName.ADMIN,
    client_1.RoleName.DESIGNER_MASTER,
    client_1.RoleName.DESIGNER_JUNIOR,
    client_1.RoleName.CRM,
];
exports.USER_MANAGEMENT_ROLES = [
    client_1.RoleName.MASTER,
    client_1.RoleName.ADMIN,
];
exports.CLIENT_DIRECTORY_ROLES = [
    client_1.RoleName.MASTER,
    client_1.RoleName.ADMIN,
    client_1.RoleName.CRM,
];
exports.CLIENT_LOOKUP_ROLES = [
    ...exports.CLIENT_DIRECTORY_ROLES,
    client_1.RoleName.DESIGNER_MASTER,
    client_1.RoleName.DESIGNER_JUNIOR,
];
exports.KANBAN_TASK_CREATE_ROLES = [
    client_1.RoleName.MASTER,
    client_1.RoleName.ADMIN,
    client_1.RoleName.DESIGNER_MASTER,
    client_1.RoleName.DESIGNER_JUNIOR,
];
exports.DELIVERABLE_ACCESS_ROLES = [
    ...exports.KANBAN_TASK_CREATE_ROLES,
    client_1.RoleName.CLIENT,
];
//# sourceMappingURL=roles.js.map
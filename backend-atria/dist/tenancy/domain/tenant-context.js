"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentTenantId = getCurrentTenantId;
exports.runWithTenant = runWithTenant;
exports.enterTenant = enterTenant;
const async_hooks_1 = require("async_hooks");
const tenantStorage = new async_hooks_1.AsyncLocalStorage();
function getCurrentTenantId() {
    return tenantStorage.getStore();
}
function runWithTenant(tenantId, fn) {
    return tenantStorage.run(tenantId, fn);
}
function enterTenant(tenantId) {
    tenantStorage.enterWith(tenantId);
}
//# sourceMappingURL=tenant-context.js.map
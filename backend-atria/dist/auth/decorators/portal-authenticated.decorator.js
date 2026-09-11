"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalAuthenticated = exports.PORTAL_AUTHENTICATED_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.PORTAL_AUTHENTICATED_KEY = 'portalAuthenticated';
const PortalAuthenticated = () => (0, common_1.SetMetadata)(exports.PORTAL_AUTHENTICATED_KEY, true);
exports.PortalAuthenticated = PortalAuthenticated;
//# sourceMappingURL=portal-authenticated.decorator.js.map
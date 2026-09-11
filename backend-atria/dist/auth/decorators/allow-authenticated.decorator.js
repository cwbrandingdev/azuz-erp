"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowAuthenticated = exports.ALLOW_AUTHENTICATED_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.ALLOW_AUTHENTICATED_KEY = 'allowAuthenticated';
const AllowAuthenticated = () => (0, common_1.SetMetadata)(exports.ALLOW_AUTHENTICATED_KEY, true);
exports.AllowAuthenticated = AllowAuthenticated;
//# sourceMappingURL=allow-authenticated.decorator.js.map
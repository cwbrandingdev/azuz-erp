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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = exports.PRISMA_TRANSACTION_OPTIONS = void 0;
const client_1 = require("@prisma/client");
const common_1 = require("@nestjs/common");
const tenant_isolation_extension_1 = require("../tenancy/infrastructure/tenant-isolation.extension");
exports.PRISMA_TRANSACTION_OPTIONS = {
    maxWait: 10_000,
    timeout: 20_000,
};
function resolvePrismaDatabaseUrl(url) {
    if (!url)
        return url;
    try {
        const parsed = new URL(url);
        const current = Number(parsed.searchParams.get('connection_limit') ?? '0');
        if (!Number.isFinite(current) || current < 5) {
            parsed.searchParams.set('connection_limit', '5');
        }
        return parsed.toString();
    }
    catch {
        return url;
    }
}
let PrismaService = class PrismaService extends client_1.PrismaClient {
    constructor() {
        super({
            datasources: process.env.DATABASE_URL
                ? {
                    db: {
                        url: resolvePrismaDatabaseUrl(process.env.DATABASE_URL),
                    },
                }
                : undefined,
            transactionOptions: exports.PRISMA_TRANSACTION_OPTIONS,
        });
        const extended = this.$extends((0, tenant_isolation_extension_1.createTenantIsolationExtension)(this));
        return new Proxy(this, {
            get(target, prop, receiver) {
                if (prop === 'onModuleInit' ||
                    prop === 'onModuleDestroy' ||
                    prop === 'constructor') {
                    return Reflect.get(target, prop, receiver);
                }
                return Reflect.get(extended, prop, extended);
            },
        });
    }
    async onModuleInit() {
        await this.$connect();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map
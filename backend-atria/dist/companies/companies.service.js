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
exports.CompaniesService = void 0;
const common_1 = require("@nestjs/common");
const finance_category_defaults_1 = require("../finance/finance-category-defaults");
const prisma_service_1 = require("../prisma/prisma.service");
const tenant_constants_1 = require("../tenancy/domain/tenant.constants");
const tenant_context_1 = require("../tenancy/domain/tenant-context");
let CompaniesService = class CompaniesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll() {
        return this.prisma.company
            .findMany({
            orderBy: { name: 'asc' },
        })
            .then((companies) => companies.map((company) => this.toResponse(company)));
    }
    async findOne(id) {
        const company = await this.prisma.company.findUnique({ where: { id } });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        return this.toResponse(company);
    }
    async findPrimary() {
        const byDefaultSubdomain = await this.prisma.company.findUnique({
            where: { subdomain: 'default' },
        });
        const company = byDefaultSubdomain ??
            (await this.prisma.company.findFirst({
                where: { status: 'ACTIVE' },
                orderBy: { createdAt: 'asc' },
            }));
        if (!company) {
            throw new common_1.NotFoundException('No company configured');
        }
        if (company.status === 'SUSPENDED') {
            throw new common_1.NotFoundException('Company not found');
        }
        return this.toResponse(company);
    }
    async create(dto) {
        try {
            const company = await this.prisma.$transaction(async (tx) => {
                const created = await tx.company.create({
                    data: {
                        name: dto.name.trim(),
                        subdomain: dto.subdomain.trim().toLowerCase(),
                        tenantId: (0, tenant_context_1.getCurrentTenantId)() ?? tenant_constants_1.DEFAULT_TENANT_ID,
                    },
                });
                await (0, finance_category_defaults_1.seedDefaultFinancialCategories)(tx, created.id);
                return created;
            });
            return this.toResponse(company);
        }
        catch (error) {
            if (typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'P2002') {
                throw new common_1.ConflictException('Subdomain already exists');
            }
            throw error;
        }
    }
    async update(id, dto) {
        await this.findOne(id);
        const company = await this.prisma.company.update({
            where: { id },
            data: {
                name: dto.name?.trim(),
                status: dto.status,
            },
        });
        return this.toResponse(company);
    }
    toResponse(company) {
        return {
            id: company.id,
            name: company.name,
            subdomain: company.subdomain,
            status: company.status,
            createdAt: company.createdAt.toISOString(),
            updatedAt: company.updatedAt.toISOString(),
        };
    }
};
exports.CompaniesService = CompaniesService;
exports.CompaniesService = CompaniesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompaniesService);
//# sourceMappingURL=companies.service.js.map
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { seedDefaultFinancialCategories } from '../finance/finance-category-defaults';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_TENANT_ID } from '../tenancy/domain/tenant.constants';
import { getCurrentTenantId } from '../tenancy/domain/tenant-context';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.company
      .findMany({
        orderBy: { name: 'asc' },
      })
      .then((companies) => companies.map((company) => this.toResponse(company)));
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    return this.toResponse(company);
  }

  async findPrimary() {
    const byDefaultSubdomain = await this.prisma.company.findUnique({
      where: { subdomain: 'default' },
    });

    const company =
      byDefaultSubdomain ??
      (await this.prisma.company.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      }));

    if (!company) {
      throw new NotFoundException('No company configured');
    }
    if (company.status === 'SUSPENDED') {
      throw new NotFoundException('Company not found');
    }
    return this.toResponse(company);
  }

  async create(dto: CreateCompanyDto) {
    try {
      const company = await this.prisma.$transaction(async (tx) => {
        const created = await tx.company.create({
          data: {
            name: dto.name.trim(),
            subdomain: dto.subdomain.trim().toLowerCase(),
            tenantId: getCurrentTenantId() ?? DEFAULT_TENANT_ID,
          },
        });
        await seedDefaultFinancialCategories(tx, created.id);
        return created;
      });
      return this.toResponse(company);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Subdomain already exists');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateCompanyDto) {
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

  private toResponse(company: {
    id: string;
    name: string;
    subdomain: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: company.id,
      name: company.name,
      subdomain: company.subdomain,
      status: company.status,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
    };
  }
}

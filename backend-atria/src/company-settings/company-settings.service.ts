import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetaPageAccessTokenResolver } from '../integrations/instagram-insights/infrastructure/meta-page-access-token.resolver';
import { ResolveMetaPageAccessTokenDto } from './dto/resolve-meta-page-access-token.dto';
import {
  decryptSecret,
  encryptSecret,
  maskSecretValue,
  shouldPreserveMaskedSecret,
} from '../common/crypto/secret-crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_COMPANY_ID } from '../company/company.constants';
import { UpdateCompanyIntegrationsDto } from './dto/update-company-integrations.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

export const MASKED_SECRET = '********';

export interface CompanySettingsResponse {
  id: string;
  name: string;
  subdomain: string;
  hasCrmModuleEnabled: boolean;
  metaAdAccountId: string | null;
  metaAppId: string | null;
  metaPageAccessToken: string | null;
  metaAppSecret: string | null;
  hasMetaPageAccessToken: boolean;
  hasMetaAppSecret: boolean;
  updatedAt: string;
}

export interface CompanyIntegrationsResponse {
  metaAdAccountId: string | null;
  metaAppId: string | null;
  metaPageAccessToken: string | null;
  metaAppSecret: string | null;
  apifyApiToken: string | null;
  whatsappApiToken: string | null;
  hasMetaPageAccessToken: boolean;
  hasMetaAppSecret: boolean;
  hasApifyApiToken: boolean;
  hasWhatsappApiToken: boolean;
  updatedAt: string;
}

export interface CompanyMetaCredentials {
  metaAdAccountId: string | null;
  metaPageAccessToken: string | null;
  metaAppId: string | null;
  metaAppSecret: string | null;
}

export interface CompanyScraperCredentials {
  apifyApiToken: string | null;
}

export interface CompanyIntegrationCredentials {
  metaAdAccountId: string | null;
  metaPageAccessToken: string | null;
  metaAppId: string | null;
  metaAppSecret: string | null;
  apifyApiToken: string | null;
  whatsappApiToken: string | null;
}

type CompanyRecord = {
  id: string;
  name: string;
  subdomain: string;
  hasCrmModuleEnabled: boolean;
  metaAdAccountId: string | null;
  metaAppId: string | null;
  metaPageAccessToken: string | null;
  metaAppSecret: string | null;
  apifyApiToken: string | null;
  whatsappApiToken: string | null;
  updatedAt: Date;
};

@Injectable()
export class CompanySettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly metaPageAccessTokenResolver: MetaPageAccessTokenResolver,
  ) {}

  async resolveMetaPageAccessToken(dto: ResolveMetaPageAccessTokenDto) {
    const company = await this.loadCurrentCompany();
    const secretKey = this.getSecretKey();
    const appSecret = this.decryptOptionalSecret(
      company.metaAppSecret,
      secretKey,
    );

    return this.metaPageAccessTokenResolver.resolve(dto.accessToken, {
      appId: company.metaAppId,
      appSecret,
      pageId: dto.pageId,
    });
  }

  async getSettings(): Promise<CompanySettingsResponse> {
    const company = await this.loadCurrentCompany();
    return this.toSettingsResponse(company);
  }

  async updateSettings(
    dto: UpdateCompanySettingsDto,
  ): Promise<CompanySettingsResponse> {
    const company = await this.loadCurrentCompany();
    const secretKey = this.getSecretKey();

    const data: {
      hasCrmModuleEnabled?: boolean;
      metaAdAccountId?: string | null;
      metaAppId?: string | null;
      metaPageAccessToken?: string | null;
      metaAppSecret?: string | null;
    } = {};

    if (dto.hasCrmModuleEnabled !== undefined) {
      data.hasCrmModuleEnabled = dto.hasCrmModuleEnabled;
    }

    if (dto.metaAdAccountId !== undefined) {
      data.metaAdAccountId = this.normalizeOptionalString(dto.metaAdAccountId);
    }

    if (dto.metaAppId !== undefined) {
      data.metaAppId = this.normalizeOptionalString(dto.metaAppId);
    }

    if (dto.metaPageAccessToken !== undefined) {
      if (!shouldPreserveMaskedSecret(dto.metaPageAccessToken)) {
        data.metaPageAccessToken = await this.normalizeMetaPageAccessTokenInput(
          dto.metaPageAccessToken,
          secretKey,
          company,
          null,
        );
      }
    }

    if (dto.metaAppSecret !== undefined) {
      if (!shouldPreserveMaskedSecret(dto.metaAppSecret)) {
        data.metaAppSecret = this.normalizeSecretInput(
          dto.metaAppSecret,
          secretKey,
        );
      }
    }

    const updated = await this.updateCompany(company.id, data);
    return this.toSettingsResponse(updated);
  }

  async getIntegrations(): Promise<CompanyIntegrationsResponse> {
    const company = await this.loadCurrentCompany();
    return this.toIntegrationsResponse(company);
  }

  async updateIntegrations(
    dto: UpdateCompanyIntegrationsDto,
  ): Promise<CompanyIntegrationsResponse> {
    const company = await this.loadCurrentCompany();
    const secretKey = this.getSecretKey();

    const data: {
      metaAdAccountId?: string | null;
      metaAppId?: string | null;
      metaPageAccessToken?: string | null;
      metaAppSecret?: string | null;
      apifyApiToken?: string | null;
      whatsappApiToken?: string | null;
    } = {};

    if (dto.metaAdAccountId !== undefined) {
      data.metaAdAccountId = this.normalizeOptionalString(dto.metaAdAccountId);
    }

    if (dto.metaAppId !== undefined) {
      data.metaAppId = this.normalizeOptionalString(dto.metaAppId);
    }

    if (dto.metaPageAccessToken !== undefined) {
      if (!shouldPreserveMaskedSecret(dto.metaPageAccessToken)) {
        data.metaPageAccessToken = await this.normalizeMetaPageAccessTokenInput(
          dto.metaPageAccessToken,
          secretKey,
          company,
          dto.metaPageId ?? null,
          dto.metaAppId,
          dto.metaAppSecret !== undefined &&
            !shouldPreserveMaskedSecret(dto.metaAppSecret)
            ? dto.metaAppSecret
            : undefined,
        );
      }
    }

    if (dto.metaAppSecret !== undefined) {
      if (!shouldPreserveMaskedSecret(dto.metaAppSecret)) {
        data.metaAppSecret = this.normalizeSecretInput(
          dto.metaAppSecret,
          secretKey,
        );
      }
    }

    if (dto.apifyApiToken !== undefined) {
      if (!shouldPreserveMaskedSecret(dto.apifyApiToken)) {
        data.apifyApiToken = this.normalizeSecretInput(
          dto.apifyApiToken,
          secretKey,
        );
      }
    }

    if (dto.whatsappApiToken !== undefined) {
      if (!shouldPreserveMaskedSecret(dto.whatsappApiToken)) {
        data.whatsappApiToken = this.normalizeSecretInput(
          dto.whatsappApiToken,
          secretKey,
        );
      }
    }

    const updated = await this.updateCompany(company.id, data);
    return this.toIntegrationsResponse(updated);
  }

  async getMetaCredentialsForCurrentTenant(): Promise<CompanyMetaCredentials> {
    const credentials = await this.getIntegrationCredentialsForCurrentTenant();
    return {
      metaAdAccountId: credentials.metaAdAccountId,
      metaPageAccessToken: credentials.metaPageAccessToken,
      metaAppId: credentials.metaAppId,
      metaAppSecret: credentials.metaAppSecret,
    };
  }

  async getScraperCredentialsForCurrentTenant(): Promise<CompanyScraperCredentials> {
    const credentials = await this.getIntegrationCredentialsForCurrentTenant();
    return {
      apifyApiToken: credentials.apifyApiToken,
    };
  }

  async getIntegrationCredentialsForCurrentTenant(): Promise<CompanyIntegrationCredentials> {
    const company = await this.loadCurrentCompany();
    const secretKey = this.getSecretKey();

    const metaAppId =
      company.metaAppId?.trim() ||
      this.config.get<string>('META_APP_ID')?.trim() ||
      null;
    const storedAppSecret = this.decryptOptionalSecret(
      company.metaAppSecret,
      secretKey,
    );
    const metaAppSecret =
      storedAppSecret?.trim() ||
      this.config.get<string>('META_APP_SECRET')?.trim() ||
      null;

    return {
      metaAdAccountId: company.metaAdAccountId,
      metaPageAccessToken: this.decryptOptionalSecret(
        company.metaPageAccessToken,
        secretKey,
      ),
      metaAppId,
      metaAppSecret,
      apifyApiToken: this.decryptOptionalSecret(
        company.apifyApiToken,
        secretKey,
      ),
      whatsappApiToken: this.decryptOptionalSecret(
        company.whatsappApiToken,
        secretKey,
      ),
    };
  }

  private async loadCurrentCompany(): Promise<CompanyRecord> {
    const company =
      (await this.prisma.company.findUnique({
        where: { id: DEFAULT_COMPANY_ID },
      })) ??
      (await this.prisma.company.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      }));

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  private async updateCompany(
    companyId: string,
    data: Record<string, string | boolean | null | undefined>,
  ) {
    return this.prisma.company.update({
      where: { id: companyId },
      data,
    });
  }

  private toSettingsResponse(company: CompanyRecord): CompanySettingsResponse {
    const secretKey = this.getSecretKey();

    return {
      id: company.id,
      name: company.name,
      subdomain: company.subdomain,
      hasCrmModuleEnabled: company.hasCrmModuleEnabled,
      metaAdAccountId: company.metaAdAccountId,
      metaAppId: company.metaAppId,
      metaPageAccessToken: this.maskOptionalSecret(
        company.metaPageAccessToken,
        secretKey,
      ),
      metaAppSecret: this.maskOptionalSecret(company.metaAppSecret, secretKey),
      hasMetaPageAccessToken: Boolean(company.metaPageAccessToken),
      hasMetaAppSecret: Boolean(company.metaAppSecret),
      updatedAt: company.updatedAt.toISOString(),
    };
  }

  private toIntegrationsResponse(
    company: CompanyRecord,
  ): CompanyIntegrationsResponse {
    const secretKey = this.getSecretKey();

    return {
      metaAdAccountId: company.metaAdAccountId,
      metaAppId: company.metaAppId,
      metaPageAccessToken: this.maskOptionalSecret(
        company.metaPageAccessToken,
        secretKey,
      ),
      metaAppSecret: this.maskOptionalSecret(company.metaAppSecret, secretKey),
      apifyApiToken: this.maskOptionalSecret(company.apifyApiToken, secretKey),
      whatsappApiToken: this.maskOptionalSecret(
        company.whatsappApiToken,
        secretKey,
      ),
      hasMetaPageAccessToken: Boolean(company.metaPageAccessToken),
      hasMetaAppSecret: Boolean(company.metaAppSecret),
      hasApifyApiToken: Boolean(company.apifyApiToken),
      hasWhatsappApiToken: Boolean(company.whatsappApiToken),
      updatedAt: company.updatedAt.toISOString(),
    };
  }

  private maskOptionalSecret(
    value: string | null,
    secretKey: string,
  ): string | null {
    if (!value) return null;
    try {
      return maskSecretValue(decryptSecret(value, secretKey));
    } catch {
      return MASKED_SECRET;
    }
  }

  private decryptOptionalSecret(
    value: string | null,
    secretKey: string,
  ): string | null {
    if (!value) return null;
    try {
      return decryptSecret(value, secretKey);
    } catch {
      return null;
    }
  }

  private normalizeOptionalString(value: string | null) {
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeSecretInput(value: string | null, secretKey: string) {
    if (value === null) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return encryptSecret(trimmed, secretKey);
  }

  private async normalizeMetaPageAccessTokenInput(
    value: string | null,
    secretKey: string,
    company: CompanyRecord,
    pageId: string | null,
    metaAppIdOverride?: string | null,
    metaAppSecretPlain?: string | null,
  ) {
    if (value === null) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const appId =
      metaAppIdOverride?.trim() || company.metaAppId?.trim() || null;
    const appSecret =
      metaAppSecretPlain?.trim() ||
      this.decryptOptionalSecret(company.metaAppSecret, secretKey);

    const resolved = await this.metaPageAccessTokenResolver.resolve(trimmed, {
      appId,
      appSecret,
      pageId,
    });

    return encryptSecret(resolved.pageAccessToken, secretKey);
  }

  private getSecretKey() {
    return (
      this.config.get<string>('TENANT_SECRETS_KEY')?.trim() ||
      this.config.getOrThrow<string>('JWT_ACCESS_SECRET')
    );
  }
}

import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  whatsappPhoneNumberId: string | null;
  whatsappBusinessAccountId: string | null;
  whatsappVerifyToken: string | null;
  hasMetaPageAccessToken: boolean;
  hasMetaAppSecret: boolean;
  hasApifyApiToken: boolean;
  hasWhatsappApiToken: boolean;
  hasWhatsappVerifyToken: boolean;
  whatsappConfigured: boolean;
  whatsappWebhookUrl: string | null;
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

export interface CompanyWhatsappCredentials {
  companyId: string;
  accessToken: string | null;
  phoneNumberId: string | null;
  businessAccountId: string | null;
  verifyToken: string | null;
  metaAppSecret: string | null;
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
  whatsappPhoneNumberId: string | null;
  whatsappBusinessAccountId: string | null;
  whatsappVerifyToken: string | null;
  updatedAt: Date;
};

@Injectable()
export class CompanySettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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
        data.metaPageAccessToken = this.normalizeSecretInput(
          dto.metaPageAccessToken,
          secretKey,
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
      whatsappPhoneNumberId?: string | null;
      whatsappBusinessAccountId?: string | null;
      whatsappVerifyToken?: string | null;
    } = {};

    if (dto.metaAdAccountId !== undefined) {
      data.metaAdAccountId = this.normalizeOptionalString(dto.metaAdAccountId);
    }

    if (dto.metaAppId !== undefined) {
      data.metaAppId = this.normalizeOptionalString(dto.metaAppId);
    }

    if (dto.metaPageAccessToken !== undefined) {
      if (!shouldPreserveMaskedSecret(dto.metaPageAccessToken)) {
        data.metaPageAccessToken = this.normalizeSecretInput(
          dto.metaPageAccessToken,
          secretKey,
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

    if (dto.whatsappPhoneNumberId !== undefined) {
      data.whatsappPhoneNumberId = this.normalizeOptionalString(
        dto.whatsappPhoneNumberId,
      );
    }

    if (dto.whatsappBusinessAccountId !== undefined) {
      data.whatsappBusinessAccountId = this.normalizeOptionalString(
        dto.whatsappBusinessAccountId,
      );
    }

    if (dto.whatsappVerifyToken !== undefined) {
      if (!shouldPreserveMaskedSecret(dto.whatsappVerifyToken)) {
        data.whatsappVerifyToken = this.normalizeSecretInput(
          dto.whatsappVerifyToken,
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

  async getWhatsappCredentialsForCurrentTenant(): Promise<CompanyWhatsappCredentials> {
    const company = await this.loadCurrentCompany();
    return this.toWhatsappCredentials(company);
  }

  async findWhatsappCredentialsByPhoneNumberId(
    phoneNumberId: string,
  ): Promise<CompanyWhatsappCredentials | null> {
    const normalized = phoneNumberId.trim();
    if (!normalized) return null;

    const company = await this.prisma.company.findFirst({
      where: { whatsappPhoneNumberId: normalized },
    });
    if (!company) return null;
    return this.toWhatsappCredentials(company);
  }

  async findWhatsappCredentialsByVerifyToken(
    token: string,
  ): Promise<CompanyWhatsappCredentials | null> {
    const normalized = token.trim();
    if (!normalized) return null;

    const companies = await this.prisma.company.findMany({
      where: { whatsappVerifyToken: { not: null } },
    });
    const secretKey = this.getSecretKey();

    for (const company of companies) {
      const stored = this.decryptOptionalSecret(
        company.whatsappVerifyToken,
        secretKey,
      );
      if (stored && stored === normalized) {
        return this.toWhatsappCredentials(company);
      }
    }

    return null;
  }

  async getIntegrationCredentialsForCurrentTenant(): Promise<CompanyIntegrationCredentials> {
    const company = await this.loadCurrentCompany();
    const secretKey = this.getSecretKey();

    return {
      metaAdAccountId: company.metaAdAccountId,
      metaPageAccessToken: this.decryptOptionalSecret(
        company.metaPageAccessToken,
        secretKey,
      ),
      metaAppId: company.metaAppId,
      metaAppSecret: this.decryptOptionalSecret(
        company.metaAppSecret,
        secretKey,
      ),
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
      whatsappPhoneNumberId: company.whatsappPhoneNumberId,
      whatsappBusinessAccountId: company.whatsappBusinessAccountId,
      whatsappVerifyToken: this.maskOptionalSecret(
        company.whatsappVerifyToken,
        secretKey,
      ),
      hasMetaPageAccessToken: Boolean(company.metaPageAccessToken),
      hasMetaAppSecret: Boolean(company.metaAppSecret),
      hasApifyApiToken: Boolean(company.apifyApiToken),
      hasWhatsappApiToken: Boolean(company.whatsappApiToken),
      hasWhatsappVerifyToken: Boolean(company.whatsappVerifyToken),
      whatsappConfigured: Boolean(
        company.whatsappApiToken && company.whatsappPhoneNumberId,
      ),
      whatsappWebhookUrl: this.buildWhatsappWebhookUrl(),
      updatedAt: company.updatedAt.toISOString(),
    };
  }

  private toWhatsappCredentials(company: {
    id: string;
    whatsappApiToken: string | null;
    whatsappPhoneNumberId: string | null;
    whatsappBusinessAccountId: string | null;
    whatsappVerifyToken: string | null;
    metaAppSecret: string | null;
  }): CompanyWhatsappCredentials {
    const secretKey = this.getSecretKey();
    return {
      companyId: company.id,
      accessToken: this.decryptOptionalSecret(
        company.whatsappApiToken,
        secretKey,
      ),
      phoneNumberId: company.whatsappPhoneNumberId,
      businessAccountId: company.whatsappBusinessAccountId,
      verifyToken: this.decryptOptionalSecret(
        company.whatsappVerifyToken,
        secretKey,
      ),
      metaAppSecret: this.decryptOptionalSecret(
        company.metaAppSecret,
        secretKey,
      ),
    };
  }

  private buildWhatsappWebhookUrl(): string | null {
    const base =
      this.config.get<string>('APP_URL')?.trim().replace(/\/$/, '') ||
      this.config.get<string>('TWILIO_WEBHOOK_BASE_URL')?.trim().replace(/\/$/, '') ||
      '';
    if (!base) return null;
    return `${base}/whatsapp/webhook`;
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

  private getSecretKey() {
    return (
      this.config.get<string>('TENANT_SECRETS_KEY')?.trim() ||
      this.config.getOrThrow<string>('JWT_ACCESS_SECRET')
    );
  }
}

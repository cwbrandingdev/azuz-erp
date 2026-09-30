import { CompanySettingsService } from './company-settings.service';
import { ResolveMetaPageAccessTokenDto } from './dto/resolve-meta-page-access-token.dto';
import { UpdateCompanyIntegrationsDto } from './dto/update-company-integrations.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
export declare class CompanySettingsController {
    private readonly companySettingsService;
    constructor(companySettingsService: CompanySettingsService);
    getSettings(): Promise<import("./company-settings.service").CompanySettingsResponse>;
    updateSettings(dto: UpdateCompanySettingsDto): Promise<import("./company-settings.service").CompanySettingsResponse>;
    getIntegrations(): Promise<import("./company-settings.service").CompanyIntegrationsResponse>;
    updateIntegrations(dto: UpdateCompanyIntegrationsDto): Promise<import("./company-settings.service").CompanyIntegrationsResponse>;
    resolveMetaPageAccessToken(dto: ResolveMetaPageAccessTokenDto): Promise<import("../integrations/instagram-insights/infrastructure/meta-page-access-token.resolver").MetaPageAccessTokenResolveResult>;
}

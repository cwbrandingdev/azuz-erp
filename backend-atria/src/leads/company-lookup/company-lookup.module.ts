import { Module } from '@nestjs/common';
import { CnaeResolverService } from './application/cnae-resolver.service';
import { CompanyDiscoveryService } from './application/company-discovery.service';
import { CompanyLookupService } from './application/company-lookup.service';
import { LeadSearchSessionService } from './application/lead-search-session.service';
import { BrasilApiCnpjClient } from './infrastructure/brasil-api-cnpj.client';
import { IbgeCnaeClient } from './infrastructure/ibge-cnae.client';
import { MinhaReceitaClient } from './infrastructure/minha-receita.client';
import { LeadMinerClient } from './infrastructure/lead-miner.client';
import { NominatimClient } from './infrastructure/nominatim.client';

@Module({
  providers: [
    BrasilApiCnpjClient,
    MinhaReceitaClient,
    NominatimClient,
    IbgeCnaeClient,
    LeadMinerClient,
    CnaeResolverService,
    CompanyLookupService,
    CompanyDiscoveryService,
    LeadSearchSessionService,
  ],
  exports: [
    LeadSearchSessionService,
    CnaeResolverService,
    CompanyLookupService,
  ],
})
export class CompanyLookupModule {}

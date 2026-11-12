import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const SITE_LEADS_URL = 'https://www.cwbranding.com.br/api/leads';

export interface SiteLead {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  revenue?: string;
  traffic?: string;
  objective?: string;
  createdAt?: string;
}

function isSiteLead(value: unknown): value is SiteLead {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string'
  );
}

@Injectable()
export class SiteLeadsService {
  private readonly logger = new Logger(SiteLeadsService.name);

  constructor(private readonly config: ConfigService) {}

  async listLeads(): Promise<{ leads: SiteLead[] }> {
    const apiKey = this.config.get<string>('CWBRANDING_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'CWBRANDING_API_KEY não configurada.',
      );
    }

    try {
      const response = await axios.get<{ leads?: unknown }>(SITE_LEADS_URL, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 15_000,
      });
      const rows = Array.isArray(response.data?.leads)
        ? response.data.leads
        : [];
      return { leads: rows.filter(isSiteLead) };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.warn(`Falha ao buscar os leads do site: ${message}`);
      throw new BadGatewayException(
        'Não foi possível buscar os leads do site.',
      );
    }
  }
}

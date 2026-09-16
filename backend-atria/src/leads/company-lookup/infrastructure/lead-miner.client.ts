import {
  BadGatewayException,
  Injectable,
  Logger,
  RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_LEADMINER_API = 'https://lead-miner.fly.dev';
const REQUEST_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 60;

export interface LeadMinerSearchPayload {
  category: string;
  city: string;
  neighborhood: string;
  max_results: number;
}

export interface LeadMinerLeadRecord {
  title?: string;
  phone: string;
  address?: string;
  website?: string | null;
  instagram?: string | null;
  rating?: number;
  reviews?: number;
  category?: string;
}

interface LeadMinerJobStartResponse {
  job_id: string;
  status: string;
}

interface LeadMinerJobStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data?: LeadMinerLeadRecord[] | null;
  error?: string | null;
}

@Injectable()
export class LeadMinerClient {
  private readonly logger = new Logger(LeadMinerClient.name);

  constructor(private readonly configService: ConfigService) {}

  async searchAndWait(
    payload: LeadMinerSearchPayload,
  ): Promise<LeadMinerLeadRecord[]> {
    const job = await this.startSearch(payload);
    return this.pollUntilComplete(job.job_id);
  }

  private getBaseUrl(): string {
    const configured = this.configService.get<string>('LEADMINER_API')?.trim();
    return (configured || DEFAULT_LEADMINER_API).replace(/\/$/, '');
  }

  private async startSearch(
    payload: LeadMinerSearchPayload,
  ): Promise<LeadMinerJobStartResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.getBaseUrl()}/leads/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new BadGatewayException(
          `Lead Miner search failed (${response.status}): ${body.slice(0, 200)}`,
        );
      }

      return (await response.json()) as LeadMinerJobStartResponse;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException('Lead Miner search timed out.');
      }

      this.logger.warn(`Lead Miner search failed: ${String(error)}`);
      throw new BadGatewayException('Não foi possível conectar ao Lead Miner.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async pollUntilComplete(jobId: string): Promise<LeadMinerLeadRecord[]> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      const job = await this.getJobStatus(jobId);

      if (job.status === 'completed') {
        return job.data ?? [];
      }

      if (job.status === 'failed') {
        throw new BadGatewayException(
          job.error?.trim() || 'Lead Miner job failed.',
        );
      }

      await this.sleep(POLL_INTERVAL_MS);
    }

    throw new RequestTimeoutException(
      'A busca no Lead Miner excedeu o tempo limite.',
    );
  }

  private async getJobStatus(
    jobId: string,
  ): Promise<LeadMinerJobStatusResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${this.getBaseUrl()}/leads/job/${encodeURIComponent(jobId)}`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        const body = await response.text();
        throw new BadGatewayException(
          `Lead Miner job status failed (${response.status}): ${body.slice(0, 200)}`,
        );
      }

      return (await response.json()) as LeadMinerJobStatusResponse;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException('Lead Miner job status timed out.');
      }

      this.logger.warn(`Lead Miner job status failed: ${String(error)}`);
      throw new BadGatewayException('Não foi possível consultar o Lead Miner.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function parseLeadMinerWebsiteAndInstagram(
  website?: string | null,
  instagram?: string | null,
): { website?: string; instagram?: string } {
  const rawWebsite = website?.trim();
  const rawInstagram = instagram?.trim();

  if (rawInstagram) {
    return {
      instagram: normalizeInstagramValue(rawInstagram),
      website: rawWebsite && !isInstagramUrl(rawWebsite)
        ? rawWebsite
        : undefined,
    };
  }

  if (rawWebsite && isInstagramUrl(rawWebsite)) {
    return {
      instagram: normalizeInstagramValue(rawWebsite),
      website: undefined,
    };
  }

  return {
    website: rawWebsite || undefined,
    instagram: undefined,
  };
}

function isInstagramUrl(value: string): boolean {
  return /instagram\.com/i.test(value);
}

function normalizeInstagramValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const handle = trimmed.replace(/^@/, '');
  return `https://www.instagram.com/${handle.replace(/^\/+/, '')}/`;
}

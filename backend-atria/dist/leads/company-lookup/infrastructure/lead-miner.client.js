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
var LeadMinerClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadMinerClient = void 0;
exports.parseLeadMinerWebsiteAndInstagram = parseLeadMinerWebsiteAndInstagram;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const DEFAULT_LEADMINER_API = 'https://lead-miner.fly.dev';
const REQUEST_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 60;
let LeadMinerClient = LeadMinerClient_1 = class LeadMinerClient {
    configService;
    logger = new common_1.Logger(LeadMinerClient_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    async searchAndWait(payload) {
        const job = await this.startSearch(payload);
        return this.pollUntilComplete(job.job_id);
    }
    getBaseUrl() {
        const configured = this.configService.get('LEADMINER_API')?.trim();
        return (configured || DEFAULT_LEADMINER_API).replace(/\/$/, '');
    }
    async startSearch(payload) {
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
                throw new common_1.BadGatewayException(`Lead Miner search failed (${response.status}): ${body.slice(0, 200)}`);
            }
            return (await response.json());
        }
        catch (error) {
            if (error instanceof common_1.BadGatewayException) {
                throw error;
            }
            if (error instanceof Error && error.name === 'AbortError') {
                throw new common_1.RequestTimeoutException('Lead Miner search timed out.');
            }
            this.logger.warn(`Lead Miner search failed: ${String(error)}`);
            throw new common_1.BadGatewayException('Não foi possível conectar ao Lead Miner.');
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async pollUntilComplete(jobId) {
        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
            const job = await this.getJobStatus(jobId);
            if (job.status === 'completed') {
                return job.data ?? [];
            }
            if (job.status === 'failed') {
                throw new common_1.BadGatewayException(job.error?.trim() || 'Lead Miner job failed.');
            }
            await this.sleep(POLL_INTERVAL_MS);
        }
        throw new common_1.RequestTimeoutException('A busca no Lead Miner excedeu o tempo limite.');
    }
    async getJobStatus(jobId) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(`${this.getBaseUrl()}/leads/job/${encodeURIComponent(jobId)}`, { signal: controller.signal });
            if (!response.ok) {
                const body = await response.text();
                throw new common_1.BadGatewayException(`Lead Miner job status failed (${response.status}): ${body.slice(0, 200)}`);
            }
            return (await response.json());
        }
        catch (error) {
            if (error instanceof common_1.BadGatewayException) {
                throw error;
            }
            if (error instanceof Error && error.name === 'AbortError') {
                throw new common_1.RequestTimeoutException('Lead Miner job status timed out.');
            }
            this.logger.warn(`Lead Miner job status failed: ${String(error)}`);
            throw new common_1.BadGatewayException('Não foi possível consultar o Lead Miner.');
        }
        finally {
            clearTimeout(timeout);
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.LeadMinerClient = LeadMinerClient;
exports.LeadMinerClient = LeadMinerClient = LeadMinerClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LeadMinerClient);
function parseLeadMinerWebsiteAndInstagram(website, instagram) {
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
function isInstagramUrl(value) {
    return /instagram\.com/i.test(value);
}
function normalizeInstagramValue(value) {
    const trimmed = value.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    const handle = trimmed.replace(/^@/, '');
    return `https://www.instagram.com/${handle.replace(/^\/+/, '')}/`;
}
//# sourceMappingURL=lead-miner.client.js.map
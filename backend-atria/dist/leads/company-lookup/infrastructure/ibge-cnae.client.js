"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var IbgeCnaeClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IbgeCnaeClient = void 0;
const common_1 = require("@nestjs/common");
const company_lookup_errors_1 = require("../domain/company-lookup.errors");
const BASE_URL = 'https://brasilapi.com.br/api/ibge/cnae/v1/classes';
const REQUEST_TIMEOUT_MS = 60_000;
let IbgeCnaeClient = IbgeCnaeClient_1 = class IbgeCnaeClient {
    logger = new common_1.Logger(IbgeCnaeClient_1.name);
    cache = null;
    async listClasses() {
        if (this.cache) {
            return this.cache;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(BASE_URL, {
                signal: controller.signal,
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) {
                const body = await response.text();
                throw new company_lookup_errors_1.CompanyDiscoveryError(`IBGE CNAE list failed with status ${response.status}: ${body.slice(0, 200)}`);
            }
            const data = (await response.json());
            this.cache = data
                .map((item) => ({
                id: this.normalizeCnaeCode(item.id ?? ''),
                description: item.descricao?.trim() || '',
            }))
                .filter((item) => item.id && item.description);
            return this.cache;
        }
        catch (error) {
            if (error instanceof company_lookup_errors_1.CompanyDiscoveryError) {
                throw error;
            }
            this.logger.warn(`IBGE CNAE list failed: ${String(error)}`);
            throw new company_lookup_errors_1.CompanyDiscoveryError('IBGE CNAE list failed', error);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    normalizeCnaeCode(value) {
        return value.replace(/\D/g, '');
    }
};
exports.IbgeCnaeClient = IbgeCnaeClient;
exports.IbgeCnaeClient = IbgeCnaeClient = IbgeCnaeClient_1 = __decorate([
    (0, common_1.Injectable)()
], IbgeCnaeClient);
//# sourceMappingURL=ibge-cnae.client.js.map
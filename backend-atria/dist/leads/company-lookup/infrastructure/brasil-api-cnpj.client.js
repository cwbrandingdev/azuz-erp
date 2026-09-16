"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BrasilApiCnpjClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrasilApiCnpjClient = void 0;
const common_1 = require("@nestjs/common");
const company_lookup_errors_1 = require("../domain/company-lookup.errors");
const BASE_URL = 'https://brasilapi.com.br/api/cnpj/v1';
const REQUEST_TIMEOUT_MS = 30_000;
let BrasilApiCnpjClient = BrasilApiCnpjClient_1 = class BrasilApiCnpjClient {
    logger = new common_1.Logger(BrasilApiCnpjClient_1.name);
    async lookup(cnpj) {
        const normalized = this.normalizeCnpj(cnpj);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(`${BASE_URL}/${normalized}`, {
                signal: controller.signal,
                headers: { Accept: 'application/json' },
            });
            if (response.status === 404) {
                return null;
            }
            if (!response.ok) {
                const body = await response.text();
                throw new company_lookup_errors_1.CompanyLookupError(`BrasilAPI CNPJ lookup failed with status ${response.status}: ${body.slice(0, 200)}`);
            }
            const data = (await response.json());
            return this.mapResponse(data, normalized);
        }
        catch (error) {
            if (error instanceof company_lookup_errors_1.CompanyLookupError) {
                throw error;
            }
            this.logger.warn(`BrasilAPI CNPJ lookup failed for ${normalized}: ${String(error)}`);
            throw new company_lookup_errors_1.CompanyLookupError('BrasilAPI CNPJ lookup failed', error);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    mapResponse(data, normalizedCnpj) {
        const phone = this.buildPhone(data.ddd_telefone_1 ?? data.ddd_telefone_2);
        const secondaryCnaeCodes = (data.cnaes_secundarios ?? [])
            .map((item) => this.normalizeCnaeCode(String(item.codigo ?? '')))
            .filter(Boolean);
        return {
            cnpj: this.normalizeCnpj(data.cnpj ?? normalizedCnpj),
            legalName: data.razao_social?.trim() || normalizedCnpj,
            tradeName: data.nome_fantasia?.trim() || undefined,
            phone,
            email: data.email?.trim() || undefined,
            street: data.logradouro?.trim() || undefined,
            number: data.numero?.trim() || undefined,
            neighborhood: data.bairro?.trim() || undefined,
            city: data.municipio?.trim() || undefined,
            state: data.uf?.trim()?.toUpperCase() || undefined,
            postalCode: data.cep?.trim() || undefined,
            primaryCnaeCode: this.normalizeCnaeCode(String(data.cnae_fiscal ?? '')),
            primaryCnaeDescription: data.cnae_fiscal_descricao?.trim() || undefined,
            secondaryCnaeCodes,
            registrationStatus: data.descricao_situacao_cadastral?.trim() ||
                String(data.situacao_cadastral ?? ''),
            rawData: data,
        };
    }
    buildPhone(value) {
        if (!value?.trim()) {
            return undefined;
        }
        const digits = value.replace(/\D/g, '');
        if (!digits) {
            return undefined;
        }
        if (digits.length === 10 || digits.length === 11) {
            const ddd = digits.slice(0, 2);
            const rest = digits.slice(2);
            if (rest.length === 8) {
                return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
            }
            if (rest.length === 9) {
                return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
            }
        }
        return digits;
    }
    normalizeCnpj(value) {
        return value.replace(/\D/g, '');
    }
    normalizeCnaeCode(value) {
        return value.replace(/\D/g, '');
    }
};
exports.BrasilApiCnpjClient = BrasilApiCnpjClient;
exports.BrasilApiCnpjClient = BrasilApiCnpjClient = BrasilApiCnpjClient_1 = __decorate([
    (0, common_1.Injectable)()
], BrasilApiCnpjClient);
//# sourceMappingURL=brasil-api-cnpj.client.js.map
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaPageAccessTokenResolver = void 0;
const common_1 = require("@nestjs/common");
const instagram_graph_client_1 = require("./instagram-graph.client");
let MetaPageAccessTokenResolver = class MetaPageAccessTokenResolver {
    graph;
    constructor(graph) {
        this.graph = graph;
    }
    async resolve(inputToken, options = {}) {
        const token = inputToken.trim();
        if (!token) {
            throw new common_1.BadRequestException('Informe o token de acesso da Meta.');
        }
        const appId = options.appId?.trim() ?? '';
        const appSecret = options.appSecret?.trim() ?? '';
        if (appId && appSecret) {
            try {
                const debug = await this.graph.debugAccessToken(token, `${appId}|${appSecret}`);
                if (debug?.type === 'PAGE') {
                    return {
                        pageAccessToken: token,
                        pageId: debug.profile_id ?? '',
                        pageName: '',
                        tokenType: 'PAGE',
                        convertedFromUser: false,
                    };
                }
            }
            catch {
            }
        }
        let pages = [];
        try {
            pages = await this.graph.listPages(token);
        }
        catch {
            return {
                pageAccessToken: token,
                pageId: '',
                pageName: '',
                tokenType: 'UNKNOWN',
                convertedFromUser: false,
            };
        }
        const pagesWithToken = pages.filter((page) => page.access_token?.trim());
        if (pagesWithToken.length === 0) {
            return {
                pageAccessToken: token,
                pageId: '',
                pageName: '',
                tokenType: 'UNKNOWN',
                convertedFromUser: false,
            };
        }
        const picked = this.pickPage(pagesWithToken, options);
        if (!picked?.access_token) {
            throw new common_1.BadRequestException({
                message: 'O token é de usuário e há mais de uma Página disponível. Selecione a Página ou informe o ID da Página.',
                code: 'META_PAGE_SELECTION_REQUIRED',
                pages: pagesWithToken.map((page) => ({
                    id: page.id,
                    name: page.name ?? page.id,
                    instagramUserId: page.instagram_business_account?.id ?? null,
                })),
            });
        }
        const pageAccessToken = picked.access_token.trim();
        return {
            pageAccessToken,
            pageId: picked.id,
            pageName: picked.name ?? picked.id,
            tokenType: 'PAGE',
            convertedFromUser: pageAccessToken !== token,
        };
    }
    pickPage(pages, options) {
        const pageId = options.pageId?.trim();
        if (pageId) {
            return pages.find((page) => page.id === pageId) ?? null;
        }
        const instagramUserId = options.instagramUserId?.trim();
        if (instagramUserId) {
            const byIg = pages.find((page) => page.instagram_business_account?.id === instagramUserId);
            if (byIg) {
                return byIg;
            }
            const byPageId = pages.find((page) => page.id === instagramUserId);
            if (byPageId) {
                return byPageId;
            }
        }
        if (pages.length === 1) {
            return pages[0];
        }
        const withInstagram = pages.filter((page) => page.instagram_business_account?.id);
        if (withInstagram.length === 1) {
            return withInstagram[0];
        }
        return null;
    }
};
exports.MetaPageAccessTokenResolver = MetaPageAccessTokenResolver;
exports.MetaPageAccessTokenResolver = MetaPageAccessTokenResolver = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [instagram_graph_client_1.InstagramGraphClient])
], MetaPageAccessTokenResolver);
//# sourceMappingURL=meta-page-access-token.resolver.js.map
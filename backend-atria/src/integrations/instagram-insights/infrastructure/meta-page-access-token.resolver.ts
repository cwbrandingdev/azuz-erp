import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import type { GraphPageRow } from '../domain/instagram-insights.types';
import { InstagramGraphClient } from './instagram-graph.client';

export interface MetaPageAccessTokenResolveOptions {
  appId?: string | null;
  appSecret?: string | null;
  pageId?: string | null;
  instagramUserId?: string | null;
}

export interface MetaPageAccessTokenResolveResult {
  pageAccessToken: string;
  pageId: string;
  pageName: string;
  tokenType: 'PAGE' | 'USER' | 'UNKNOWN';
  convertedFromUser: boolean;
}

@Injectable()
export class MetaPageAccessTokenResolver {
  constructor(private readonly graph: InstagramGraphClient) {}

  async resolve(
    inputToken: string,
    options: MetaPageAccessTokenResolveOptions = {},
  ): Promise<MetaPageAccessTokenResolveResult> {
    const token = inputToken.trim();
    if (!token) {
      throw new BadRequestException('Informe o token de acesso da Meta.');
    }

    const appId = options.appId?.trim() ?? '';
    const appSecret = options.appSecret?.trim() ?? '';

    if (appId && appSecret) {
      try {
        const debug = await this.graph.debugAccessToken(
          token,
          `${appId}|${appSecret}`,
        );
        if (debug?.type === 'PAGE') {
          return {
            pageAccessToken: token,
            pageId: debug.profile_id ?? '',
            pageName: '',
            tokenType: 'PAGE',
            convertedFromUser: false,
          };
        }
      } catch {
        // Fall through to /me/accounts when debug is unavailable.
      }
    }

    let pages: GraphPageRow[] = [];
    try {
      pages = await this.graph.listPages(token);
    } catch {
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
      throw new BadRequestException({
        message:
          'O token é de usuário e há mais de uma Página disponível. Selecione a Página ou informe o ID da Página.',
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

  private pickPage(
    pages: GraphPageRow[],
    options: MetaPageAccessTokenResolveOptions,
  ): GraphPageRow | null {
    const pageId = options.pageId?.trim();
    if (pageId) {
      return pages.find((page) => page.id === pageId) ?? null;
    }

    const instagramUserId = options.instagramUserId?.trim();
    if (instagramUserId) {
      const byIg = pages.find(
        (page) => page.instagram_business_account?.id === instagramUserId,
      );
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

    const withInstagram = pages.filter(
      (page) => page.instagram_business_account?.id,
    );
    if (withInstagram.length === 1) {
      return withInstagram[0];
    }

    return null;
  }
}

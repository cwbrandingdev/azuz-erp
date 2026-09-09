import { NextRequest, NextResponse } from "next/server";
import {
  getRefreshTokenCookieOptions,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth-cookies";
import { resolveApiBaseUrl } from "@/lib/api-url";
import { withTenantHeaders } from "@/lib/tenancy/tenant-headers";
import {
  FORWARDED_HOST_HEADER,
  TENANT_SLUG_HEADER,
} from "@/lib/tenancy/tenant-host";

function getApiBaseUrl(): string {
  const candidate = resolveApiBaseUrl();

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
    return parsed.origin;
  } catch {
    throw new Error(
      `API base URL is invalid (${JSON.stringify(candidate)}).`,
    );
  }
}

type AuthProxyPayload = {
  user: unknown;
  accessToken: string;
  refreshToken?: string;
};

function toClientAuthBody(payload: AuthProxyPayload) {
  return {
    user: payload.user,
    accessToken: payload.accessToken,
  };
}

export async function proxyAuthRequest(
  request: NextRequest,
  backendPath:
    | "/auth/login"
    | "/auth/register"
    | "/auth/refresh"
    | "/auth/logout"
    | "/auth/signup-with-token",
): Promise<NextResponse> {
  let apiBaseUrl: string;

  try {
    apiBaseUrl = getApiBaseUrl();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "API URL misconfigured";
    return NextResponse.json({ statusCode: 503, message }, { status: 503 });
  }

  try {
    const incomingBody =
      backendPath === "/auth/logout" || backendPath === "/auth/refresh"
        ? ((await request.json().catch(() => ({}))) as Record<string, unknown>)
        : ((await request.json()) as Record<string, unknown>);

    const refreshFromCookie = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    const body =
      backendPath === "/auth/refresh" || backendPath === "/auth/logout"
        ? {
            ...incomingBody,
            refreshToken:
              (typeof incomingBody.refreshToken === "string"
                ? incomingBody.refreshToken
                : undefined) ?? refreshFromCookie,
          }
        : incomingBody;

    const incomingHost =
      request.headers.get(FORWARDED_HOST_HEADER) ?? request.headers.get("host");
    const tenantSlug = request.headers.get(TENANT_SLUG_HEADER);

    const upstream = await fetch(`${apiBaseUrl}${backendPath}`, {
      method: "POST",
      headers: withTenantHeaders(
        {
          "Content-Type": "application/json",
          ...(tenantSlug ? { [TENANT_SLUG_HEADER]: tenantSlug } : {}),
        },
        incomingHost,
      ),
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (backendPath === "/auth/logout") {
      const response = new NextResponse(null, { status: upstream.status });
      response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
        ...getRefreshTokenCookieOptions(),
        maxAge: 0,
      });
      return response;
    }

    const data = (await upstream.json().catch(() => null)) as
      | AuthProxyPayload
      | { message?: string | string[]; statusCode?: number }
      | null;

    if (!upstream.ok || !data || !("accessToken" in data)) {
      return NextResponse.json(data ?? { message: "Auth request failed" }, {
        status: upstream.status,
      });
    }

    const response = NextResponse.json(toClientAuthBody(data), {
      status: upstream.status,
    });

    if (typeof data.refreshToken === "string" && data.refreshToken.length > 0) {
      response.cookies.set(
        REFRESH_TOKEN_COOKIE,
        data.refreshToken,
        getRefreshTokenCookieOptions(),
      );
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Auth proxy request failed";
    return NextResponse.json({ statusCode: 502, message }, { status: 502 });
  }
}

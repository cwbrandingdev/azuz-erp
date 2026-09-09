import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import {
  FORWARDED_HOST_HEADER,
  PUBLIC_SURFACE_HEADER,
  TENANT_SLUG_HEADER,
} from "@/lib/tenancy/tenant-host";
import { resolveTenantRoute } from "@/lib/tenancy/tenant-routing";

export async function middleware(request: NextRequest) {
  const host =
    request.headers.get(FORWARDED_HOST_HEADER) ?? request.headers.get("host");
  const decision = await resolveTenantRoute(host, request.nextUrl.pathname);

  const requestHeaders = new Headers(request.headers);
  if (decision.slug) {
    requestHeaders.set(TENANT_SLUG_HEADER, decision.slug);
  }
  if (decision.publicSurface) {
    requestHeaders.set(PUBLIC_SURFACE_HEADER, "1");
  }

  const rewritePath = decision.rewritePath;
  const rewriteUrl = request.nextUrl.clone();
  if (rewritePath) {
    rewriteUrl.pathname = rewritePath;
  }

  let response =
    rewritePath && rewritePath !== request.nextUrl.pathname
      ? NextResponse.rewrite(rewriteUrl, {
          request: { headers: requestHeaders },
        })
      : NextResponse.next({
          request: { headers: requestHeaders },
        });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response =
            rewritePath && rewritePath !== request.nextUrl.pathname
              ? NextResponse.rewrite(rewriteUrl, {
                  request: { headers: requestHeaders },
                })
              : NextResponse.next({
                  request: { headers: requestHeaders },
                });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(
              name,
              value,
              getSupabaseCookieOptions(options),
            );
          });
        },
      },
    });

    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico)$).*)",
  ],
};

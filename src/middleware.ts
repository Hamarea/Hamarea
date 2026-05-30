import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Refresh Supabase auth cookies
  let response = intlMiddleware(request);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = new URL(request.url);
  const isAdminPath =
    url.pathname.startsWith("/admin") ||
    /^\/(fr|en|es|de)\/admin/.test(url.pathname);
  const isAccountPath =
    url.pathname.startsWith("/account") ||
    /^\/(fr|en|es|de)\/account/.test(url.pathname);
  // Only protected routes need a Supabase auth round-trip. The high-traffic
  // landing/product pages skip it entirely (TTFB win).
  const needsAuth = isAdminPath || isAccountPath;

  // Safety net: in production, never let /admin be reachable when Supabase
  // isn't wired up. Otherwise the role check below is skipped and the page
  // renders publicly with a stub user.
  if (isAdminPath && (!supabaseUrl || !supabaseKey) && process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  if (needsAuth && supabaseUrl && supabaseKey) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(
            cookiesToSet: Array<{
              name: string;
              value: string;
              options?: Record<string, unknown>;
            }>
          ) {
            cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }: {
                name: string;
                value: string;
                options?: Record<string, unknown>;
              }) => response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protect /admin: only role=admin or staff can enter.
    if (isAdminPath) {
      if (!user) {
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (q: string) => {
            eq: (k: string, v: string) => {
              maybeSingle: () => Promise<{ data: { role?: string } | null }>;
            };
          };
        };
      };
      const { data: profile } = await sb
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const role = profile?.role;
      if (!role || (role !== "admin" && role !== "staff")) {
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  // Exclude `_next`, `api`, the OAuth/recovery `auth` callback, and any file
  // with an extension. `/auth/*` must bypass the intl middleware so the PKCE
  // code exchange is not swallowed by a locale redirect.
  matcher: ["/((?!_next|api|auth|.*\\..*).*)"],
};

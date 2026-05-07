import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Refresh Supabase auth cookies
  let response = intlMiddleware(request);

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
    const url = new URL(request.url);
    const isAdminPath =
      url.pathname.startsWith("/admin") ||
      /^\/(fr|en|es|de)\/admin/.test(url.pathname);

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
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};

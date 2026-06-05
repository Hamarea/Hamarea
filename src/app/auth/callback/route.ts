import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * OAuth / email-confirmation / password-recovery callback.
 * Supabase redirects here with a `code` (PKCE). We exchange it for a session,
 * which sets the auth cookies, then forward the user to `next` (default
 * /account). Lives OUTSIDE the [locale] segment and is excluded from the intl
 * middleware so the code exchange is never swallowed by a locale redirect.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");
  // Only allow same-site relative redirects.
  let dest = nextParam && nextParam.startsWith("/") ? nextParam : "/account";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (code && supabaseUrl && supabaseKey) {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }>,
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=auth_callback`, url.origin),
      );
    }
    // Default landing (no explicit `next`): send staff/admins to the dashboard.
    if (!nextParam) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await (
          supabase as unknown as {
            from: (t: string) => {
              select: (q: string) => {
                eq: (k: string, v: string) => {
                  maybeSingle: () => Promise<{ data: { role?: string } | null }>;
                };
              };
            };
          }
        )
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.role === "admin" || profile?.role === "staff") {
          dest = "/admin";
        }
      }
    }
  }

  return NextResponse.redirect(new URL(dest, url.origin));
}

export const dynamic = "force-dynamic";

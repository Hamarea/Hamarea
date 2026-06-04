"use client";

/**
 * Social login (Google) via Supabase OAuth. The email/password form stays the
 * primary path; this renders BELOW it. Gated by NEXT_PUBLIC_ENABLE_GOOGLE_AUTH
 * so the button only appears once the Google provider is actually configured in
 * the Supabase dashboard (avoids a broken button before setup).
 *
 * The /auth/callback route already exchanges the OAuth code for a session.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function OAuthButtons({ next = "/account" }: { next?: string }) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH !== "true") return null;

  async function signInWithGoogle() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      // On success the browser is redirected to Google — nothing else to do.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-3 text-xs text-[var(--color-muted)]">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        {t("auth.or")}
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-primary-50)] disabled:opacity-50"
      >
        <GoogleIcon />
        {t("auth.googleLogin")}
      </button>
      {error && <p className="mt-2 text-sm text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

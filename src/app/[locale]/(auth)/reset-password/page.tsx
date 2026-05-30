"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/account/security`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="container-page max-w-md py-16">
      <Card className="p-8">
        <h1 className="font-display text-2xl mb-1">{t("auth.forgotPassword")}</h1>
        <p className="text-sm text-[var(--color-muted)] mb-6">
          <Link href="/login" className="text-[var(--color-primary-600)] hover:underline">
            {t("common.login")}
          </Link>
        </p>

        {sent ? (
          <p className="rounded-md border border-[var(--color-secondary-400)]/40 bg-[var(--color-secondary-100)] px-4 py-3 text-sm text-[var(--color-secondary-700)]">
            Si un compte existe pour <strong>{email}</strong>, un lien de
            réinitialisation vient d&apos;être envoyé. Vérifiez votre boîte mail.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? t("common.loading") : "Envoyer le lien"}
            </Button>
          </form>
        )}
      </Card>
    </section>
  );
}

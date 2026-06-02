"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/**
 * Step-up challenge: lifts the current session from aal1 to aal2 by verifying a
 * TOTP code. If the user has no verified factor or is already aal2, it just
 * forwards to `next` — so it is safe to land here unconditionally.
 */
export function MfaChallenge({ next }: { next: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login" as never);
          return;
        }
        const { data: aal } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel === "aal2") {
          router.push(next as never);
          router.refresh();
          return;
        }
        const { data: f } = await supabase.auth.mfa.listFactors();
        const verified = (f?.totp ?? []).find((x) => x.status === "verified");
        if (!verified) {
          router.push(next as never);
          router.refresh();
          return;
        }
        setFactorId(verified.id);
        setChecking(false);
      } catch {
        router.push(next as never);
      }
    })();
  }, [router, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ch = await supabase.auth.mfa.challenge({ factorId });
      if (ch.error) throw ch.error;
      const v = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.data.id,
        code,
      });
      if (v.error) throw v.error;
      router.push(next as never);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide");
      setLoading(false);
    }
  };

  return (
    <Card className="p-8">
      <h1 className="mb-2 font-display text-2xl">Vérification en deux étapes</h1>
      {checking ? (
        <p className="text-sm text-[var(--color-muted)]">Vérification…</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-[var(--color-muted)]">
            Saisis le code à 6 chiffres de ton application
            d&apos;authentification.
          </p>
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : "Valider"}
          </Button>
        </form>
      )}
    </Card>
  );
}

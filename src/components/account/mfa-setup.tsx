"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; status: string };

/**
 * TOTP enrolment & management. Enrolling a verified factor is what turns on MFA
 * enforcement for this account (see the /admin step-up gate) — so this is the
 * opt-in entry point. No-lockout by design: nothing is enforced until a factor
 * is verified here.
 */
export function MfaSetup() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enroll, setEnroll] = useState<{
    id: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = (data?.totp ?? []) as Factor[];
      setFactors(totp.map((f) => ({ id: f.id, status: f.status })));
    } catch {
      // ignore (e.g. preview without Supabase env)
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startEnroll = async () => {
    setError(null);
    try {
      const supabase = createClient();
      const stale = factors.find((f) => f.status === "unverified");
      if (stale) await supabase.auth.mfa.unenroll({ factorId: stale.id });
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (error || !data) throw error ?? new Error("Erreur");
      setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const confirmEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enroll) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ch = await supabase.auth.mfa.challenge({ factorId: enroll.id });
      if (ch.error) throw ch.error;
      const v = await supabase.auth.mfa.verify({
        factorId: enroll.id,
        challengeId: ch.data.id,
        code,
      });
      if (v.error) throw v.error;
      setEnroll(null);
      setCode("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setLoading(false);
    }
  };

  const removeFactor = async (id: string) => {
    setError(null);
    try {
      const supabase = createClient();
      await supabase.auth.mfa.unenroll({ factorId: id });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  const verified = factors.filter((f) => f.status === "verified");

  return (
    <Card className="max-w-md p-6">
      <h2 className="mb-1 font-medium">Double authentification (2FA)</h2>
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        Ajoute une couche de sécurité avec une application TOTP (Google
        Authenticator, 1Password, Authy…). Recommandé pour les comptes admin.
      </p>

      {verified.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-secondary-700)]">
            ✓ Double authentification activée.
          </p>
          {error && (
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          )}
          {verified.map((f) => (
            <Button
              key={f.id}
              type="button"
              variant="outline"
              onClick={() => removeFactor(f.id)}
            >
              Désactiver
            </Button>
          ))}
        </div>
      ) : enroll ? (
        <form onSubmit={confirmEnroll} className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="QR code 2FA" className="h-44 w-44" />
          <p className="text-xs text-[var(--color-muted)]">
            Ou saisis cette clé manuellement :{" "}
            <code className="break-all">{enroll.secret}</code>
          </p>
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Code à 6 chiffres</Label>
            <Input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "…" : "Vérifier et activer"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEnroll(null);
                setCode("");
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <>
          {error && (
            <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>
          )}
          <Button type="button" onClick={startEnroll}>
            Activer la 2FA
          </Button>
        </>
      )}
    </Card>
  );
}

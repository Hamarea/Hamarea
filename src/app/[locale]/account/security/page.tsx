"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { MfaSetup } from "@/components/account/mfa-setup";

export default function AccountSecurityPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function onChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailErr(null);
    setEmailMsg(null);
    setEmailLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      setEmailMsg(
        "E-mail de confirmation envoyé à la nouvelle adresse. Le changement sera effectif après validation du lien.",
      );
      setEmail("");
    } catch (err) {
      setEmailErr(err instanceof Error ? err.message : "Erreur");
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Sécurité</h1>
      <Card className="max-w-md p-6">
        <h2 className="font-medium mb-4">Changer le mot de passe</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-[var(--color-muted)]">8 caractères minimum.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmer le mot de passe</Label>
            <Input
              id="confirm"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          {done && (
            <p className="text-sm text-[var(--color-secondary-700)]">
              Mot de passe mis à jour.
            </p>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? "…" : "Mettre à jour"}
          </Button>
        </form>
      </Card>

      <Card className="mt-6 max-w-md p-6">
        <h2 className="mb-4 font-medium">Changer l&apos;adresse e-mail</h2>
        <form onSubmit={onChangeEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-email">Nouvelle adresse e-mail</Label>
            <Input
              id="new-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          {emailErr && (
            <p className="text-sm text-[var(--color-danger)]">{emailErr}</p>
          )}
          {emailMsg && (
            <p className="text-sm text-[var(--color-secondary-700)]">{emailMsg}</p>
          )}
          <Button type="submit" disabled={emailLoading}>
            {emailLoading ? "…" : "Envoyer le lien de confirmation"}
          </Button>
        </form>
      </Card>

      <div className="mt-6">
        <MfaSetup />
      </div>
    </div>
  );
}

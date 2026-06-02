import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount } from "./actions";

export default function AccountPrivacyPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl mb-1">Données et confidentialité</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Exporte ou supprime tes données personnelles (RGPD).
        </p>
      </div>

      <Card className="p-6">
        <h2 className="mb-2 font-medium">Exporter mes données</h2>
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Télécharge toutes tes données (profil, adresses, commandes, favoris,
          avis) au format JSON.
        </p>
        {/* Download endpoint (not a page) — a full request is required for the
            Content-Disposition attachment, so a plain anchor is intentional. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/account/export"
          className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-primary-700)] px-4 text-sm font-medium text-white transition hover:opacity-90"
        >
          Télécharger mes données (JSON)
        </a>
      </Card>

      <Card className="border-[var(--color-danger)]/40 p-6">
        <h2 className="mb-2 font-medium text-[var(--color-danger)]">
          Supprimer mon compte
        </h2>
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Action <strong>irréversible</strong>. Ton profil, tes adresses et tes
          favoris seront définitivement supprimés. Tes commandes restent
          conservées de façon anonymisée (obligations comptables). Tape{" "}
          <code className="rounded bg-[var(--color-bg)] px-1">SUPPRIMER</code>{" "}
          pour confirmer.
        </p>
        <form action={deleteAccount} className="max-w-sm space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmation</Label>
            <Input
              id="confirm"
              name="confirm"
              placeholder="SUPPRIMER"
              autoComplete="off"
              required
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
          >
            Supprimer définitivement mon compte
          </Button>
        </form>
      </Card>
    </div>
  );
}

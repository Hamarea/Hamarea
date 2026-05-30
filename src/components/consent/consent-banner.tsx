"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { readConsent, writeConsent } from "@/lib/consent";

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    // Only show when the visitor has not made a choice yet.
    setVisible(readConsent() === null);
  }, []);

  if (!visible) return null;

  const decide = (choice: { analytics: boolean; marketing: boolean }) => {
    writeConsent(choice);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Consentement aux cookies"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-white/95 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur"
    >
      <div className="container-page flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl text-sm text-[var(--color-foreground)]">
          <p className="font-medium">Nous respectons votre vie privée</p>
          <p className="mt-1 text-[var(--color-muted)]">
            Nous utilisons des cookies pour le bon fonctionnement du site et, avec
            votre accord, pour la mesure d&apos;audience et le marketing. Vous
            pouvez tout accepter, tout refuser, ou personnaliser.
          </p>

          {customize && (
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked disabled className="h-4 w-4" />
                Nécessaires (toujours actifs)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="h-4 w-4"
                />
                Mesure d&apos;audience
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="h-4 w-4"
                />
                Marketing
              </label>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {customize ? (
            <Button size="sm" onClick={() => decide({ analytics, marketing })}>
              Enregistrer mes choix
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCustomize(true)}
            >
              Personnaliser
            </Button>
          )}
          {/* "Tout refuser" must be as prominent as "Tout accepter" (CNIL). */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => decide({ analytics: false, marketing: false })}
          >
            Tout refuser
          </Button>
          <Button size="sm" onClick={() => decide({ analytics: true, marketing: true })}>
            Tout accepter
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook for an observability backend (Sentry, etc.) once configured.
    console.error("[app error]", error);
  }, [error]);

  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">
        Erreur
      </p>
      <h1 className="mt-3 font-display text-3xl">Une erreur est survenue</h1>
      <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">
        Quelque chose s&apos;est mal passé de notre côté. Vous pouvez réessayer ;
        si le problème persiste, contactez le support.
      </p>
      <div className="mt-6">
        <Button onClick={reset}>Réessayer</Button>
      </div>
    </section>
  );
}

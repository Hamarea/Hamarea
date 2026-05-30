import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-6xl text-[var(--color-primary-600)]">404</p>
      <h1 className="mt-3 font-display text-2xl">Page introuvable</h1>
      <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </section>
  );
}

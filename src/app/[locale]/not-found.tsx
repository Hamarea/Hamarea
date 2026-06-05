// Plain `next/link`, NOT the next-intl `Link`: this component is also rendered
// for paths with an invalid locale segment (e.g. browser requests to
// `/favicon.ico` or `/apple-touch-icon.png`) that bypass the middleware and
// trip `notFound()` in the locale layout *before* the i18n provider is set up.
// The i18n `<Link>` throws there and turns a clean 404 into a 500; `next/link`
// needs no i18n context and still satisfies `no-html-link-for-pages`.
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-6xl text-[var(--color-primary-600)]">404</p>
      <h1 className="mt-3 font-display text-2xl">Page introuvable</h1>
      <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-primary-600)] px-5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </section>
  );
}

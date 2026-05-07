import { setRequestLocale } from "next-intl/server";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <section className="container-page max-w-2xl py-16">
      <h1 className="font-display text-4xl mb-6">Contact</h1>
      <p className="text-[var(--color-muted)]">
        hello@hamarea.com — réponse sous 24-48h ouvrées.
      </p>
    </section>
  );
}

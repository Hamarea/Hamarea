import { setRequestLocale } from "next-intl/server";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <section className="container-page max-w-2xl py-16 prose">
      <h1 className="font-display text-4xl mb-6">À propos</h1>
      <p className="text-[var(--color-muted)] leading-relaxed">
        Hamarea sélectionne avec soin des produits et accessoires durables,
        pensés pour durer. Chaque pièce est choisie pour la qualité de ses
        matériaux, son origine, et la justesse de son design.
      </p>
    </section>
  );
}

import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <section className="container-page max-w-2xl py-16">
      <h1 className="font-display text-4xl mb-6">{t("nav.contact")}</h1>
      <p className="text-[var(--color-muted)]">{t("pages.contactBody")}</p>
    </section>
  );
}

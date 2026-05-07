import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/shop/product-grid";
import { CategoryStrip } from "@/components/shop/category-strip";
import { listFeaturedProducts, listCategories } from "@/lib/queries";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [products, categories] = await Promise.all([
    listFeaturedProducts(locale, 8),
    listCategories(locale),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--color-primary-700)] via-[var(--color-primary-600)] to-[var(--color-secondary-500)] text-white">
        <div className="container-page grid gap-8 py-20 md:grid-cols-2 md:py-28 md:gap-12">
          <div className="flex flex-col justify-center">
            <p className="mb-3 text-sm uppercase tracking-[0.2em] text-[var(--color-accent-200)]">
              {t("common.siteName")}
            </p>
            <h1 className="font-display text-4xl leading-tight md:text-6xl">
              {t("home.heroTitle")}
            </h1>
            <p className="mt-5 max-w-md text-lg text-white/85">
              {t("home.heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg">
                <Link href="/products">{t("home.heroCta")}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                <Link href="/categories">{t("nav.categories")}</Link>
              </Button>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="relative h-full min-h-[320px]">
              <div className="absolute inset-0 rounded-3xl bg-[var(--color-accent-300)]/30 blur-3xl" />
              <div className="absolute right-8 top-8 h-48 w-48 rounded-2xl bg-[var(--color-accent-400)]/40 backdrop-blur" />
              <div className="absolute left-8 bottom-8 h-56 w-56 rounded-full bg-[var(--color-secondary-300)]/30 backdrop-blur" />
              <div className="absolute inset-12 rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm" />
            </div>
          </div>
        </div>
      </section>

      <CategoryStrip categories={categories} />

      <section className="container-page py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-3xl">{t("home.featured")}</h2>
          <Link
            href="/products"
            className="text-sm font-medium text-[var(--color-primary-600)] hover:underline"
          >
            {t("home.viewAll")} →
          </Link>
        </div>
        <ProductGrid products={products} locale={locale} />
      </section>
    </>
  );
}

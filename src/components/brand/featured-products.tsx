import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { ProductGrid } from "@/components/shop/product-grid";
import { listCatalogProducts } from "@/lib/queries";

/**
 * Real catalog products on the brand home — CONNECTS the home to the database.
 * Any product the admin publishes (status=active) shows up here and links
 * through to its catalogue page. Renders nothing when the catalog is empty
 * (so the brand home never shows placeholder/sample products).
 */
export async function FeaturedProducts({ locale }: { locale: string }) {
  const products = await listCatalogProducts(locale, 4);
  if (products.length === 0) return null;

  const t = await getTranslations();
  return (
    <section className="container-page py-20">
      <Reveal className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-xl">
          <span className="brand-eyebrow text-[var(--color-primary-600)]">
            {t("home.newArrivals")}
          </span>
          <h2 className="mt-3 font-display text-3xl md:text-5xl">
            {t("home.featured")}
          </h2>
        </div>
        <Link
          href="/sacoche"
          className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--color-border)] px-5 py-3 text-sm font-semibold transition-colors hover:bg-[var(--color-primary-50)]"
        >
          {t("home.viewAll")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Reveal>
      <ProductGrid products={products} locale={locale} />
    </section>
  );
}

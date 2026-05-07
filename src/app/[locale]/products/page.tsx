import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductGrid } from "@/components/shop/product-grid";
import { listFeaturedProducts } from "@/lib/queries";

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const products = await listFeaturedProducts(locale, 24);

  return (
    <section className="container-page py-12">
      <div className="mb-8">
        <h1 className="font-display text-4xl">{t("nav.shop")}</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          {products.length} produit{products.length > 1 ? "s" : ""}
        </p>
      </div>
      <ProductGrid products={products} locale={locale} />
    </section>
  );
}

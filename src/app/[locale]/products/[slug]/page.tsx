import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { getProductBySlug } from "@/lib/queries";
import { ImageGallery } from "@/components/shop/image-gallery";
import { VariantPicker } from "@/components/shop/variant-picker";
import { WishlistButton } from "@/components/shop/wishlist-button";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const p = await getProductBySlug(slug, locale);
  if (!p) notFound();

  const galleryImages = p.images.length
    ? p.images.map((img) => ({ url: img.url, alt: img.alt }))
    : p.image_url
      ? [{ url: p.image_url, alt: p.name }]
      : [];

  return (
    <article className="container-page py-12">
      <nav
        aria-label="breadcrumb"
        className="mb-6 flex items-center gap-1 text-xs text-[var(--color-muted)]"
      >
        <Link href="/" className="hover:text-[var(--color-foreground)]">
          {t("nav.home")}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/products" className="hover:text-[var(--color-foreground)]">
          {t("nav.shop")}
        </Link>
        {p.category && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link
              href={{ pathname: "/products", query: { category: p.category.slug } }}
              className="hover:text-[var(--color-foreground)]"
            >
              {p.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="text-[var(--color-foreground)]">{p.name}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <ImageGallery images={galleryImages} fallbackAlt={p.name} />

        <div>
          <h1 className="font-display text-3xl md:text-4xl">{p.name}</h1>

          <div className="mt-4">
            <VariantPicker
              productId={p.id}
              slug={p.slug}
              name={p.name}
              image={p.image_url}
              variants={p.variants}
              locale={locale}
            />
            <WishlistButton productId={p.id} />
          </div>

          <section className="mt-10 border-t border-[var(--color-border)] pt-6">
            <h2 className="font-display text-xl">{t("product.description")}</h2>
            <p className="mt-3 leading-relaxed text-[var(--color-muted)]">
              {p.description}
            </p>
          </section>

          <section className="mt-8 border-t border-[var(--color-border)] pt-6 text-sm">
            <h2 className="mb-3 font-display text-xl">{t("product.shipping")}</h2>
            <ul className="space-y-1.5 text-[var(--color-muted)]">
              <li>✓ Livraison sous 3-5 jours ouvrés (UE)</li>
              <li>✓ Retours gratuits sous 14 jours</li>
              <li>✓ Emballage soigné, sans plastique</li>
            </ul>
          </section>
        </div>
      </div>
    </article>
  );
}

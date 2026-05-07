import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getProductBySlug } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";

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

  return (
    <article className="container-page grid gap-10 py-12 md:grid-cols-2">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--color-bg)]">
        {p.image_url ? (
          <Image
            src={p.image_url}
            alt={p.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[var(--color-muted)]">
            Image
          </div>
        )}
      </div>
      <div>
        {p.compare_at_price_cents && p.compare_at_price_cents > p.price_cents && (
          <Badge variant="accent" className="mb-4">Promotion</Badge>
        )}
        <h1 className="font-display text-3xl md:text-4xl">{p.name}</h1>
        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-3xl font-semibold text-[var(--color-primary-700)]">
            {formatMoney(p.price_cents, p.currency, locale)}
          </span>
          {p.compare_at_price_cents && (
            <span className="text-lg text-[var(--color-muted)] line-through">
              {formatMoney(p.compare_at_price_cents, p.currency, locale)}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-[var(--color-secondary-600)]">
          {p.in_stock ? `✓ ${t("common.inStock")}` : `✗ ${t("common.outOfStock")}`}
        </p>

        <div className="mt-8">
          <AddToCartButton
            line={{
              variantId: p.id,
              productId: p.id,
              slug: p.slug,
              name: p.name,
              image: p.image_url,
              unitPriceCents: p.price_cents,
              currency: p.currency,
              quantity: 1,
            }}
            disabled={!p.in_stock}
          />
        </div>

        <section className="mt-10 border-t border-[var(--color-border)] pt-6">
          <h2 className="font-display text-xl">{t("product.description")}</h2>
          <p className="mt-3 text-[var(--color-muted)] leading-relaxed">
            {p.description}
          </p>
        </section>

        <section className="mt-8 border-t border-[var(--color-border)] pt-6 text-sm">
          <h2 className="font-display text-xl mb-3">{t("product.shipping")}</h2>
          <ul className="space-y-1.5 text-[var(--color-muted)]">
            <li>✓ Livraison sous 3-5 jours ouvrés (UE)</li>
            <li>✓ Retours gratuits sous 14 jours</li>
            <li>✓ Emballage soigné, sans plastique</li>
          </ul>
        </section>
      </div>
    </article>
  );
}

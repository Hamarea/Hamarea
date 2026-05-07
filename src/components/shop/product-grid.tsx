import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { ProductCard } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

export function ProductGrid({
  products,
  locale,
}: {
  products: ProductCard[];
  locale: string;
}) {
  if (products.length === 0) {
    return (
      <p className="text-center text-[var(--color-muted)] py-12">
        Aucun produit pour le moment.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <li key={p.id}>
          <Link
            href={`/products/${p.slug}` as never}
            className="group block overflow-hidden rounded-xl border border-[var(--color-border)] bg-white transition-shadow hover:shadow-lg"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-[var(--color-bg)]">
              {p.image_url ? (
                <Image
                  src={p.image_url}
                  alt={p.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-[var(--color-muted)]">
                  Image
                </div>
              )}
              {p.compare_at_price_cents &&
                p.compare_at_price_cents > p.price_cents && (
                  <Badge
                    variant="accent"
                    className="absolute left-3 top-3"
                  >
                    Promo
                  </Badge>
                )}
              {!p.in_stock && (
                <Badge variant="danger" className="absolute right-3 top-3">
                  Rupture
                </Badge>
              )}
            </div>
            <div className="p-4">
              <h3 className="line-clamp-1 text-sm font-medium">{p.name}</h3>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-semibold text-[var(--color-primary-700)]">
                  {formatMoney(p.price_cents, p.currency, locale)}
                </span>
                {p.compare_at_price_cents && (
                  <span className="text-xs text-[var(--color-muted)] line-through">
                    {formatMoney(p.compare_at_price_cents, p.currency, locale)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

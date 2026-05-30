"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Check, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/stores/cart";
import { useCartUI } from "@/stores/cart-ui";
import { formatMoney } from "@/lib/utils";
import { SACOCHE } from "@/lib/product";
import { getProductCopy } from "@/lib/product-content";
import { Reveal } from "@/components/ui/reveal";

export function BundlePicker() {
  const add = useCart((s) => s.add);
  const openDrawer = useCartUI((s) => s.openDrawer);
  const locale = useLocale();
  const copy = getProductCopy(locale);
  const packs = copy.bundle.packs;
  const [packId, setPackId] = useState(1); // index of the highlighted pack
  const [color, setColor] = useState(SACOCHE.colors[0]);
  const pack = packs[packId];

  const unit = Math.round(SACOCHE.priceCents * (1 - pack.discountPct / 100));
  const total = unit * pack.qty;
  const fullPrice = SACOCHE.priceCents * pack.qty;
  const savings = fullPrice - total;

  const onAdd = () => {
    add({
      variantId: `${color.variantId}-pack-${pack.qty}`,
      productId: SACOCHE.id,
      slug: SACOCHE.slug,
      name: `${copy.productName} — ${copy.bundle.packs[packId].label} (${copy.colors.names[color.id]})`,
      image: color.imageUrl,
      unitPriceCents: unit,
      currency: SACOCHE.currency,
      quantity: pack.qty,
      options: { color: color.name, pack: String(pack.qty) },
    });
    openDrawer();
  };

  return (
    <section className="container-page py-16 md:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-primary-600)]">
          {copy.bundle.eyebrow}
        </p>
        <h2 className="mt-2 font-display text-3xl md:text-4xl">{copy.bundle.heading}</h2>
        <p className="mt-3 text-sm text-[var(--color-muted)]">{copy.bundle.sub}</p>
      </Reveal>

      <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
        {packs.map((p, i) => {
          const active = i === packId;
          const pUnit = Math.round(SACOCHE.priceCents * (1 - p.discountPct / 100));
          return (
            <Reveal as="div" key={p.label} delay={i * 0.08}>
              <button
                type="button"
                onClick={() => setPackId(i)}
                className={`relative h-full w-full rounded-2xl border-2 p-6 text-left transition-all duration-300 ${
                  active
                    ? "border-[var(--color-primary-600)] bg-white shadow-lg"
                    : "border-[var(--color-border)] bg-white hover:-translate-y-1 hover:border-[var(--color-primary-300)] hover:shadow-md"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-[var(--color-primary-600)] px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
                    {copy.bundle.mostChosen}
                  </span>
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-2xl font-bold">{p.label}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">{p.sub}</p>
                  </div>
                  {p.discountPct > 0 && (
                    <span className="rounded-full bg-[var(--color-danger,#dc2626)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--color-danger,#dc2626)]">
                      −{p.discountPct}%
                    </span>
                  )}
                </div>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">
                    {formatMoney(pUnit, SACOCHE.currency, locale)}
                  </span>
                  <span className="text-xs text-[var(--color-muted)]">{copy.bundle.perUnit}</span>
                </div>
                {p.discountPct > 0 && (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {copy.bundle.totalLabel}{" "}
                    <span className="font-semibold text-[var(--color-foreground)]">
                      {formatMoney(pUnit * p.qty, SACOCHE.currency, locale)}
                    </span>{" "}
                    {copy.bundle.youSave}{" "}
                    {formatMoney(
                      SACOCHE.priceCents * p.qty - pUnit * p.qty,
                      SACOCHE.currency,
                      locale,
                    )}
                  </p>
                )}
                {active && (
                  <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-[var(--color-primary-600)] text-white">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </button>
            </Reveal>
          );
        })}
      </div>

      <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
            {copy.bundle.colorLabel}
          </span>
          {SACOCHE.colors.map((c) => {
            const active = c.id === color.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c)}
                aria-label={copy.colors.names[c.id]}
                aria-pressed={active}
                className={`h-11 w-11 rounded-full ring-2 transition-all ${
                  active
                    ? "ring-[var(--color-primary-600)] scale-110"
                    : "ring-[var(--color-border)]"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            );
          })}
        </div>
        <Button size="lg" onClick={onAdd}>
          <ShoppingBag className="h-5 w-5" />
          {copy.bundle.addLabel}
          {formatMoney(total, SACOCHE.currency, locale)}
          {savings > 0 && (
            <span className="ml-2 text-xs opacity-90">
              (−{formatMoney(savings, SACOCHE.currency, locale)})
            </span>
          )}
        </Button>
      </div>
    </section>
  );
}

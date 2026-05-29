"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/stores/cart";
import { useCartUI } from "@/stores/cart-ui";
import { formatMoney } from "@/lib/utils";
import { SACOCHE } from "@/lib/product";

const PACKS = [
  {
    id: "x1",
    qty: 1,
    discountPct: 0,
    label: "1 sacoche",
    sub: "Pour vous",
    highlight: false,
  },
  {
    id: "x2",
    qty: 2,
    discountPct: 15,
    label: "2 sacoches",
    sub: "Le préféré des couples",
    highlight: true,
  },
  {
    id: "x3",
    qty: 3,
    discountPct: 25,
    label: "3 sacoches",
    sub: "Pack famille / cadeaux",
    highlight: false,
  },
];

export function BundlePicker() {
  const add = useCart((s) => s.add);
  const openDrawer = useCartUI((s) => s.openDrawer);
  const [pack, setPack] = useState(PACKS[1]);
  const [color, setColor] = useState(SACOCHE.colors[0]);

  const unit = Math.round(
    SACOCHE.priceCents * (1 - pack.discountPct / 100),
  );
  const total = unit * pack.qty;
  const fullPrice = SACOCHE.priceCents * pack.qty;
  const savings = fullPrice - total;

  const onAdd = () => {
    add({
      variantId: `${color.variantId}-pack-${pack.qty}`,
      productId: SACOCHE.id,
      slug: SACOCHE.slug,
      name: `${SACOCHE.name} — Pack ${pack.qty} (${color.name})`,
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
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-primary-600)]">
          Économisez plus
        </p>
        <h2 className="mt-2 font-display text-3xl md:text-4xl">
          Choisissez votre pack.
        </h2>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Plus vous en prenez, plus la remise grimpe. Idéal en cadeau.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
        {PACKS.map((p) => {
          const active = p.id === pack.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPack(p)}
              className={`relative rounded-2xl border-2 p-6 text-left transition-all ${
                active
                  ? "border-[var(--color-primary-600)] bg-white shadow-lg"
                  : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary-300)]"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-[var(--color-primary-600)] px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
                  Le plus choisi
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
                  {formatMoney(
                    Math.round(SACOCHE.priceCents * (1 - p.discountPct / 100)),
                  )}
                </span>
                <span className="text-xs text-[var(--color-muted)]">/ unité</span>
              </div>
              {p.discountPct > 0 && (
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Total :{" "}
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {formatMoney(
                      Math.round(SACOCHE.priceCents * (1 - p.discountPct / 100)) *
                        p.qty,
                    )}
                  </span>{" "}
                  · vous économisez{" "}
                  {formatMoney(
                    SACOCHE.priceCents * p.qty -
                      Math.round(
                        SACOCHE.priceCents * (1 - p.discountPct / 100),
                      ) *
                        p.qty,
                  )}
                </p>
              )}
              {active && (
                <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-[var(--color-primary-600)] text-white">
                  <Check className="h-4 w-4" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
            Couleur :
          </span>
          {SACOCHE.colors.map((c) => {
            const active = c.id === color.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c.name}
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
          Ajouter — {formatMoney(total)}
          {savings > 0 && (
            <span className="ml-2 text-xs opacity-90">
              (−{formatMoney(savings)})
            </span>
          )}
        </Button>
      </div>
    </section>
  );
}

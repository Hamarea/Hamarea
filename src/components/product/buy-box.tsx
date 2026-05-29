"use client";

import { useState } from "react";
import { Check, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/stores/cart";
import { useSelectedColor, useSelectedColor_current } from "@/stores/selected-color";
import { formatMoney } from "@/lib/utils";
import { SACOCHE } from "@/lib/product";

export function BuyBox({
  variant = "hero",
  compact = false,
}: {
  variant?: "hero" | "section";
  compact?: boolean;
}) {
  const add = useCart((s) => s.add);
  const color = useSelectedColor_current();
  const setColorId = useSelectedColor((s) => s.setId);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const onAdd = () => {
    add({
      variantId: color.variantId,
      productId: SACOCHE.id,
      slug: SACOCHE.slug,
      name: `${SACOCHE.name} — ${color.name}`,
      image: color.imageUrl,
      unitPriceCents: SACOCHE.priceCents,
      currency: SACOCHE.currency,
      quantity: qty,
      options: { color: color.name },
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const savings = SACOCHE.compareAtCents
    ? SACOCHE.compareAtCents - SACOCHE.priceCents
    : 0;
  const savingsPct = SACOCHE.compareAtCents
    ? Math.round((savings / SACOCHE.compareAtCents) * 100)
    : 0;

  const dark = variant === "hero";

  const pad = compact ? "p-4" : "p-5 md:p-6";
  const priceSize = compact ? "text-2xl" : "text-3xl";
  const swatchSize = compact ? "h-8 w-8" : "h-10 w-10";
  const btnSize: "md" | "lg" = compact ? "md" : "lg";
  const gap = compact ? "mt-3" : "mt-5";

  return (
    <div
      className={
        dark
          ? `rounded-xl bg-black/45 ${pad} text-white backdrop-blur-md ring-1 ring-white/15`
          : `rounded-xl border border-[var(--color-border)] bg-white ${pad} shadow-sm`
      }
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${
                i < Math.round(SACOCHE.rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-transparent " + (dark ? "text-white/40" : "text-[var(--color-border)]")
              }`}
            />
          ))}
        </span>
        <span className={dark ? "text-white/85" : "text-[var(--color-muted)]"}>
          {SACOCHE.rating}/5 · {SACOCHE.ratingCount.toLocaleString("fr-FR")} avis
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className={`font-display ${priceSize} font-bold tabular-nums`}>
          {formatMoney(SACOCHE.priceCents)}
        </span>
        {SACOCHE.compareAtCents && (
          <>
            <span
              className={`text-sm line-through ${
                dark ? "text-white/60" : "text-[var(--color-muted)]"
              }`}
            >
              {formatMoney(SACOCHE.compareAtCents)}
            </span>
            <span className="rounded-full bg-[var(--color-danger,#dc2626)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              −{savingsPct}%
            </span>
          </>
        )}
      </div>

      <div className={gap}>
        <p
          className={`text-[10px] uppercase tracking-wider ${
            dark ? "text-white/75" : "text-[var(--color-muted)]"
          }`}
        >
          Couleur : <span className="font-semibold">{color.name}</span>
        </p>
        <div className="mt-1.5 flex gap-1.5">
          {SACOCHE.colors.map((c) => {
            const active = c.id === color.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setColorId(c.id)}
                aria-label={`Couleur ${c.name}`}
                aria-pressed={active}
                className={`grid ${swatchSize} place-items-center rounded-full ring-2 transition-all ${
                  active
                    ? "ring-[var(--color-primary-600)] ring-offset-2 ring-offset-transparent scale-110"
                    : dark
                      ? "ring-white/30 hover:ring-white"
                      : "ring-[var(--color-border)] hover:ring-[var(--color-foreground)]/40"
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {active && (
                  <Check
                    className={`h-3.5 w-3.5 ${
                      c.id === "blanc" ? "text-[var(--color-foreground)]" : "text-white"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${gap} flex items-center gap-2`}>
        <div
          className={`inline-flex items-center rounded-md ${
            dark ? "bg-white/15" : "bg-[var(--color-bg)]"
          }`}
        >
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="h-9 w-8 text-base"
            aria-label="Diminuer"
          >
            −
          </button>
          <span className="w-7 text-center text-sm tabular-nums">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(10, q + 1))}
            className="h-9 w-8 text-base"
            aria-label="Augmenter"
          >
            +
          </button>
        </div>
        <Button size={btnSize} className="flex-1" onClick={onAdd}>
          {added ? (
            <>
              <Check className="h-4 w-4" /> Ajouté !
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              Ajouter — {formatMoney(SACOCHE.priceCents * qty)}
            </>
          )}
        </Button>
      </div>

      {!compact && (
        <p
          className={`mt-3 text-[11px] ${
            dark ? "text-white/75" : "text-[var(--color-muted)]"
          }`}
        >
          Livraison offerte dès 39€ · Garantie 2 ans · Paiement sécurisé
        </p>
      )}
    </div>
  );
}

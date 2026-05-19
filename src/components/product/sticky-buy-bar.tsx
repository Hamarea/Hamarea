"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/stores/cart";
import { useSelectedColor, useSelectedColor_current } from "@/stores/selected-color";
import { formatMoney } from "@/lib/utils";
import { SACOCHE } from "@/lib/product";

export function StickyBuyBar() {
  const add = useCart((s) => s.add);
  const color = useSelectedColor_current();
  const setColorId = useSelectedColor((s) => s.setId);
  const [visible, setVisible] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onAdd = () => {
    add({
      variantId: color.variantId,
      productId: SACOCHE.id,
      slug: SACOCHE.slug,
      name: `${SACOCHE.name} — ${color.name}`,
      image: color.imageUrl,
      unitPriceCents: SACOCHE.priceCents,
      currency: SACOCHE.currency,
      quantity: 1,
      options: { color: color.name },
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="container-page flex items-center gap-3">
        <div className="hidden sm:block">
          <p className="text-sm font-semibold">{SACOCHE.name}</p>
          <p className="text-xs text-[var(--color-muted)]">
            {formatMoney(SACOCHE.priceCents)}
            {SACOCHE.compareAtCents && (
              <span className="ml-2 line-through">
                {formatMoney(SACOCHE.compareAtCents)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {SACOCHE.colors.map((c) => {
            const active = c.id === color.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setColorId(c.id)}
                aria-label={`Couleur ${c.name}`}
                className={`h-7 w-7 rounded-full ring-2 transition-all ${
                  active
                    ? "ring-[var(--color-primary-600)] scale-110"
                    : "ring-[var(--color-border)]"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            );
          })}
        </div>
        <Button onClick={onAdd} className="ml-auto" size="md">
          {added ? (
            <>
              <Check className="h-4 w-4" /> Ajouté
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter — </span>
              <span>{formatMoney(SACOCHE.priceCents)}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

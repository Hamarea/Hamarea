"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ShoppingBag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/stores/cart";
import { useCartUI } from "@/stores/cart-ui";
import { useSelectedColor, useSelectedColor_current } from "@/stores/selected-color";
import { formatMoney } from "@/lib/utils";
import { SACOCHE } from "@/lib/product";
import { getProductCopy } from "@/lib/product-content";

export function StickyBuyBar({
  stockByColor,
}: {
  stockByColor?: Record<string, number>;
}) {
  const add = useCart((s) => s.add);
  const openDrawer = useCartUI((s) => s.openDrawer);
  const locale = useLocale();
  const copy = getProductCopy(locale);
  const color = useSelectedColor_current();
  const setColorId = useSelectedColor((s) => s.setId);
  const [pastHero, setPastHero] = useState(false);
  const [footerInView, setFooterInView] = useState(false);
  const [added, setAdded] = useState(false);
  const tCommon = useTranslations("common");
  const stockLeft = stockByColor?.[color.id];
  const outOfStock = typeof stockLeft === "number" && stockLeft <= 0;

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide the bar as the footer approaches: it's fixed and would otherwise float
  // over the closing CTA and the footer's legal links on mobile.
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const io = new IntersectionObserver(
      ([entry]) => setFooterInView(entry.isIntersecting),
      { rootMargin: "0px 0px -40% 0px" },
    );
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  const visible = pastHero && !footerInView;

  const onAdd = () => {
    if (outOfStock) return;
    add({
      variantId: color.variantId,
      productId: SACOCHE.id,
      slug: SACOCHE.slug,
      name: `${copy.productName} — ${copy.colors.names[color.id]}`,
      image: color.imageUrl,
      unitPriceCents: SACOCHE.priceCents,
      currency: SACOCHE.currency,
      quantity: 1,
      options: { color: color.name },
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    openDrawer();
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="container-page flex items-center gap-3">
        <div className="hidden sm:block">
          <p className="text-sm font-semibold">{copy.productName}</p>
          <p className="text-xs text-[var(--color-muted)]">
            {formatMoney(SACOCHE.priceCents, SACOCHE.currency, locale)}
            {SACOCHE.compareAtCents && (
              <span className="ml-2 line-through">
                {formatMoney(SACOCHE.compareAtCents, SACOCHE.currency, locale)}
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
                aria-label={copy.buyBox.colorAria.replace("{name}", copy.colors.names[c.id])}
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
        <Button onClick={onAdd} className="ml-auto" size="md" disabled={outOfStock}>
          {outOfStock ? (
            tCommon("outOfStock")
          ) : added ? (
            <>
              <Check className="h-4 w-4" /> {copy.sticky.added}
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">{copy.sticky.addLabel}</span>
              <span>{formatMoney(SACOCHE.priceCents, SACOCHE.currency, locale)}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

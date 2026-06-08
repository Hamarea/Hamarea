"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart, type CartLine } from "@/stores/cart";
import { formatMoney, cn } from "@/lib/utils";
import type { VariantOption } from "@/lib/queries";

// `option_values` may carry display metadata (e.g. `hex` for the colour swatch)
// that is NOT a sellable option — it must never be rendered as a choice. Known
// keys also get a nicer localised legend (others fall back to capitalisation).
const META_OPTION_KEYS = new Set(["hex"]);
const KNOWN_OPTION_KEYS = new Set(["color", "size"]);

type Props = {
  productId: string;
  slug: string;
  name: string;
  image?: string;
  variants: VariantOption[];
  locale: string;
};

function findVariant(
  variants: VariantOption[],
  selection: Record<string, string>,
  optionKeys: string[],
): VariantOption | null {
  if (optionKeys.length === 0) {
    return variants.find((v) => v.active) ?? variants[0] ?? null;
  }
  return (
    variants.find(
      (v) =>
        v.active &&
        optionKeys.every((k) => (v.options[k] ?? "") === (selection[k] ?? "")),
    ) ?? null
  );
}

export function VariantPicker({
  productId,
  slug,
  name,
  image,
  variants,
  locale,
}: Props) {
  const t = useTranslations();
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  const optionLabel = (key: string) =>
    KNOWN_OPTION_KEYS.has(key)
      ? t(`product.options.${key}` as never)
      : key.charAt(0).toUpperCase() + key.slice(1);

  const optionKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const v of variants) {
      for (const k of Object.keys(v.options)) {
        if (!META_OPTION_KEYS.has(k)) keys.add(k);
      }
    }
    return Array.from(keys);
  }, [variants]);

  const optionsByKey = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const k of optionKeys) {
      const values = new Set<string>();
      for (const v of variants) {
        if (v.options[k]) values.add(v.options[k]);
      }
      map[k] = Array.from(values);
    }
    return map;
  }, [variants, optionKeys]);

  const initialSelection = useMemo(() => {
    const first = variants.find((v) => v.active) ?? variants[0];
    const sel: Record<string, string> = {};
    if (first) {
      for (const k of optionKeys) sel[k] = first.options[k] ?? "";
    }
    return sel;
  }, [variants, optionKeys]);

  const [selection, setSelection] =
    useState<Record<string, string>>(initialSelection);

  const selected = useMemo(
    () => findVariant(variants, selection, optionKeys),
    [variants, selection, optionKeys],
  );

  const isAvailable = (key: string, value: string): boolean => {
    return variants.some(
      (v) =>
        v.active &&
        v.options[key] === value &&
        optionKeys
          .filter((k) => k !== key)
          .every((k) => !selection[k] || v.options[k] === selection[k]),
    );
  };

  const handleAdd = () => {
    if (!selected) return;
    const line: CartLine = {
      variantId: selected.id,
      productId,
      slug,
      name:
        optionKeys.length > 0
          ? `${name} — ${optionKeys.map((k) => selection[k]).filter(Boolean).join(" / ")}`
          : name,
      image,
      unitPriceCents: selected.price_cents,
      currency: selected.currency,
      quantity: 1,
      options: { ...selection },
    };
    add(line);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const priceCents = selected?.price_cents ?? 0;
  const compareCents = selected?.compare_at_price_cents ?? null;
  const currency = selected?.currency ?? "EUR";
  const hasPromo = compareCents != null && compareCents > priceCents;

  return (
    <div>
      {hasPromo && (
        <Badge variant="accent" className="mb-3">
          {t("product.promo")}
        </Badge>
      )}

      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-semibold text-[var(--color-primary-700)]">
          {formatMoney(priceCents, currency, locale)}
        </span>
        {hasPromo && (
          <span className="text-lg text-[var(--color-muted)] line-through">
            {formatMoney(compareCents!, currency, locale)}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-[var(--color-secondary-600)]">
        {selected
          ? `✓ ${t("common.inStock")}`
          : `✗ ${t("common.outOfStock")}`}
      </p>

      {optionKeys.length > 0 && (
        <div className="mt-6 space-y-5">
          {optionKeys.map((key) => (
            <fieldset key={key}>
              <legend className="text-sm font-medium uppercase tracking-wider text-[var(--color-muted)]">
                {optionLabel(key)}
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {optionsByKey[key].map((value) => {
                  const active = selection[key] === value;
                  const available = isAvailable(key, value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setSelection((s) => ({ ...s, [key]: value }))
                      }
                      disabled={!available && !active}
                      aria-pressed={active}
                      className={cn(
                        "min-w-[3rem] rounded-md border px-3 py-2 text-sm font-medium transition",
                        active
                          ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)] text-white"
                          : available
                            ? "border-[var(--color-border)] bg-white hover:border-[var(--color-primary-500)]"
                            : "cursor-not-allowed border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-muted)] line-through opacity-60",
                      )}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Button size="lg" disabled={!selected} onClick={handleAdd}>
          {added ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
          {!selected
            ? t("common.outOfStock")
            : added
              ? t("common.added")
              : t("common.addToCart")}
        </Button>
      </div>

      {selected && (
        <p className="mt-3 font-mono text-xs text-[var(--color-muted)]">
          SKU: {selected.sku}
        </p>
      )}
    </div>
  );
}

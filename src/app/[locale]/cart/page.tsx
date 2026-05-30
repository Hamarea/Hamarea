"use client";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/stores/cart";
import { formatMoney } from "@/lib/utils";
import { SHIPPING } from "@/lib/product";
import { Trash2, Minus, Plus } from "lucide-react";

export default function CartPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { lines, setQty, remove, subtotalCents } = useCart();
  const subtotal = subtotalCents();
  const shipping =
    subtotal >= SHIPPING.freeAboveCents || subtotal === 0
      ? 0
      : SHIPPING.standardCents;
  const total = subtotal + shipping;

  return (
    <section className="container-page py-12">
      <h1 className="font-display text-4xl mb-8">{t("cart.title")}</h1>

      {lines.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-[var(--color-muted)] mb-6">{t("cart.empty")}</p>
          <Button asChild>
            <Link href="/products">{t("cart.continueShopping")}</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-8 md:grid-cols-3">
          <ul className="md:col-span-2 space-y-4">
            {lines.map((l) => (
              <li key={l.variantId}>
                <Card className="p-4 flex gap-4 items-center">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-[var(--color-bg)]">
                    {l.image && (
                      <Image src={l.image} alt={l.name} fill className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{l.name}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {formatMoney(l.unitPriceCents, l.currency, locale)}
                    </p>
                  </div>
                  <div className="flex items-center rounded-md border border-[var(--color-border)]">
                    <button
                      className="px-2 py-1 hover:bg-[var(--color-primary-50)]"
                      onClick={() => setQty(l.variantId, l.quantity - 1)}
                      aria-label="-"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium">
                      {l.quantity}
                    </span>
                    <button
                      className="px-2 py-1 hover:bg-[var(--color-primary-50)]"
                      onClick={() => setQty(l.variantId, l.quantity + 1)}
                      aria-label="+"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="w-24 text-right font-semibold">
                    {formatMoney(l.unitPriceCents * l.quantity, l.currency, locale)}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(l.variantId)}
                    aria-label={t("cart.remove")}
                  >
                    <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>

          <Card className="h-fit p-6 sticky top-20">
            <h2 className="font-display text-xl mb-4">{t("checkout.summary")}</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">{t("cart.subtotal")}</dt>
                <dd className="font-medium">{formatMoney(subtotal, "EUR", locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">{t("cart.shipping")}</dt>
                <dd className="font-medium">
                  {shipping === 0
                    ? t("common.freeShipping")
                    : formatMoney(shipping, "EUR", locale)}
                </dd>
              </div>
              <div className="border-t border-[var(--color-border)] pt-3 mt-3 flex justify-between text-base">
                <dt className="font-semibold">{t("cart.total")}</dt>
                <dd className="font-bold text-[var(--color-primary-700)]">
                  {formatMoney(total, "EUR", locale)}
                </dd>
              </div>
            </dl>
            <Button asChild className="mt-6 w-full" size="lg">
              <Link href="/checkout">{t("cart.checkout")}</Link>
            </Button>
            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link href="/products">{t("cart.continueShopping")}</Link>
            </Button>
          </Card>
        </div>
      )}
    </section>
  );
}

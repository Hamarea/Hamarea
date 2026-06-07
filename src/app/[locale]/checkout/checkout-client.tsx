"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/stores/cart";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { SHIPPING } from "@/lib/product";
import { ExpressCheckout } from "@/components/checkout/express-checkout";
import { Link } from "@/i18n/navigation";
import { Lock } from "lucide-react";

const SHIPPING_CENTS = {
  standard: SHIPPING.standardCents,
  express: SHIPPING.expressCents,
} as const;

type ShippingMethod = keyof typeof SHIPPING_CENTS;

export function CheckoutClient() {
  const router = useRouter();
  const t = useTranslations("checkout");
  const tc = useTranslations("cart");
  const locale = useLocale();
  const lines = useCart((s) => s.lines);
  const subtotal = useCart((s) => s.subtotalCents());
  const [email, setEmail] = useState("");
  const [shipping, setShipping] = useState<ShippingMethod>("standard");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discountCents: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const shippingCents = useMemo(
    () => (subtotal >= SHIPPING.freeAboveCents ? 0 : SHIPPING_CENTS[shipping]),
    [subtotal, shipping],
  );
  // Discount is recomputed authoritatively server-side; this is the display copy.
  const discountCents = coupon ? Math.min(coupon.discountCents, subtotal) : 0;
  const total = Math.max(0, subtotal - discountCents) + shippingCents;
  const toFree = Math.max(0, SHIPPING.freeAboveCents - subtotal);

  const shippingLabel = (m: ShippingMethod) =>
    m === "express" ? t("shippingExpress") : t("shippingStandard");

  if (lines.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-[var(--color-muted)]">{t("emptyCart")}</p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          {t("viewProduct")}
        </Button>
      </Card>
    );
  }

  // Only references — the server recomputes the authoritative price (and the
  // discount, from the coupon code). Shared by the pay + coupon-apply calls.
  const lineRefs = () =>
    lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      color: l.options?.color ?? "",
      pack: Number(l.options?.pack ?? 1),
      quantity: l.quantity,
    }));

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await fetch("/api/checkout/coupon", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ couponCode: code, lines: lineRefs() }),
      });
      const data = (await res.json().catch(() => ({ ok: false }))) as
        | { ok: true; discountCents: number; code: string }
        | { ok: false; error?: string };
      if (data.ok) {
        setCoupon({ code: data.code, discountCents: data.discountCents });
        setCouponInput("");
      } else {
        setCoupon(null);
        setCouponMsg(data.error ?? t("paymentError"));
      }
    } catch {
      setCouponMsg(t("paymentError"));
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponMsg(null);
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          shippingMethod: shipping,
          ...(coupon ? { couponCode: coupon.code } : {}),
          // Only references — the server recomputes the authoritative price.
          lines: lineRefs(),
        }),
      });
      if (!res.ok) {
        const { error: message } = (await res
          .json()
          .catch(() => ({ error: t("paymentError") }))) as { error?: string };
        throw new Error(message ?? t("paymentError"));
      }
      const { url } = (await res.json()) as { url: string };
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("paymentError"));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={pay} className="grid gap-6 md:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <ExpressCheckout shippingMethod={shipping} />

        <Card className="p-6">
          <h2 className="mb-4 font-medium">{t("contactTitle")}</h2>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder={t("emailPlaceholder")}
            />
            <p className="text-xs text-[var(--color-muted)]">{t("emailHint")}</p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-medium">{t("shippingTitle")}</h2>
          {toFree > 0 ? (
            <p className="mb-3 rounded-md bg-[var(--color-primary-50)] px-3 py-2 text-xs text-[var(--color-primary-700)]">
              {t.rich("toFree", {
                amount: formatMoney(toFree, "EUR", locale),
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          ) : (
            <p className="mb-3 rounded-md bg-[var(--color-secondary-50)] px-3 py-2 text-xs text-[var(--color-secondary-700)]">
              {t("freeUnlocked")}
            </p>
          )}
          <div className="space-y-2">
            {(Object.keys(SHIPPING_CENTS) as ShippingMethod[]).map((m) => {
              const cents =
                subtotal >= SHIPPING.freeAboveCents ? 0 : SHIPPING_CENTS[m];
              return (
                <label
                  key={m}
                  className={`flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm ${
                    shipping === m
                      ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)]"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      value={m}
                      checked={shipping === m}
                      onChange={() => setShipping(m)}
                    />
                    {shippingLabel(m)}
                  </span>
                  <span className="font-medium">
                    {cents === 0 ? t("free") : formatMoney(cents, "EUR", locale)}
                  </span>
                </label>
              );
            })}
          </div>
        </Card>

        {error && (
          <p className="rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
      </div>

      <aside>
        <Card className="sticky top-24 p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-medium">{t("summary")}</h3>
            <Link
              href="/cart"
              className="text-xs text-[var(--color-primary-600)] hover:underline"
            >
              {t("editCart")}
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {lines.map((l) => (
              <li key={l.variantId} className="flex justify-between gap-2">
                <span className="truncate">
                  {l.name}{" "}
                  <span className="text-[var(--color-muted)]">
                    × {l.quantity}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatMoney(l.unitPriceCents * l.quantity, l.currency, locale)}
                </span>
              </li>
            ))}
          </ul>

          {/* Code promo — remise validée et appliquée côté serveur */}
          <div className="mt-4 border-t border-[var(--color-border)] pt-3">
            {coupon ? (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-[var(--color-secondary-700)]">
                  {t("couponApplied", { code: coupon.code })}
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-xs text-[var(--color-muted)] underline hover:text-[var(--color-danger)]"
                >
                  {t("couponRemove")}
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <label htmlFor="coupon" className="sr-only">
                    {t("couponLabel")}
                  </label>
                  <Input
                    id="coupon"
                    value={couponInput}
                    onChange={(ev) => setCouponInput(ev.target.value)}
                    placeholder={t("couponPlaceholder")}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") {
                        ev.preventDefault();
                        applyCoupon();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={applyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                >
                  {t("couponApply")}
                </Button>
              </div>
            )}
            {couponMsg && (
              <p className="mt-1.5 text-xs text-[var(--color-danger)]">{couponMsg}</p>
            )}
          </div>

          <div className="mt-4 space-y-1 border-t border-[var(--color-border)] pt-3 text-sm">
            <Row label={tc("subtotal")} value={formatMoney(subtotal, "EUR", locale)} />
            {discountCents > 0 && (
              <Row
                label={t("discount")}
                value={`−${formatMoney(discountCents, "EUR", locale)}`}
              />
            )}
            <Row
              label={tc("shipping")}
              value={
                shippingCents === 0
                  ? t("shippingFree")
                  : formatMoney(shippingCents, "EUR", locale)
              }
            />
            <Row label={tc("total")} value={formatMoney(total, "EUR", locale)} bold />
          </div>
          <Button type="submit" className="mt-5 w-full" disabled={submitting}>
            {submitting
              ? t("redirecting")
              : t("pay", { amount: formatMoney(total, "EUR", locale) })}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--color-muted)]">
            <Lock className="h-3 w-3 shrink-0" />
            {t("securePayment")}
          </p>
        </Card>
      </aside>
    </form>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

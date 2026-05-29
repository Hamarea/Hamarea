"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/stores/cart";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { SHIPPING } from "@/lib/product";

const SHIPPING_LABELS = {
  standard: { label: "Livraison standard (3-5j)", cents: SHIPPING.standardCents },
  express: { label: "Livraison express (1-2j)", cents: SHIPPING.expressCents },
} as const;

type ShippingMethod = keyof typeof SHIPPING_LABELS;

export function CheckoutClient() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const subtotal = useCart((s) => s.subtotalCents());
  const [email, setEmail] = useState("");
  const [shipping, setShipping] = useState<ShippingMethod>("standard");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shippingCents = useMemo(
    () =>
      subtotal >= SHIPPING.freeAboveCents ? 0 : SHIPPING_LABELS[shipping].cents,
    [subtotal, shipping],
  );
  const total = subtotal + shippingCents;
  const toFree = Math.max(0, SHIPPING.freeAboveCents - subtotal);

  if (lines.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-[var(--color-muted)]">Votre panier est vide.</p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          Voir le produit
        </Button>
      </Card>
    );
  }

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
          // Only references — the server recomputes the authoritative price.
          lines: lines.map((l) => ({
            productId: l.productId,
            color: l.options?.color ?? "",
            pack: Number(l.options?.pack ?? 1),
            quantity: l.quantity,
          })),
        }),
      });
      if (!res.ok) {
        const { error: message } = (await res
          .json()
          .catch(() => ({ error: "Erreur paiement" }))) as { error?: string };
        throw new Error(message ?? "Erreur paiement");
      }
      const { url } = (await res.json()) as { url: string };
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur paiement");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={pay} className="grid gap-6 md:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card className="p-6">
          <h2 className="mb-4 font-medium">Vos coordonnées</h2>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="vous@exemple.com"
            />
            <p className="text-xs text-[var(--color-muted)]">
              Pour le reçu et le suivi. L&apos;adresse de livraison est saisie à
              l&apos;étape suivante, sur la page sécurisée Stripe.
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-medium">Livraison</h2>
          {toFree > 0 ? (
            <p className="mb-3 rounded-md bg-[var(--color-primary-50)] px-3 py-2 text-xs text-[var(--color-primary-700)]">
              Plus que <strong>{formatMoney(toFree)}</strong> pour la livraison
              offerte.
            </p>
          ) : (
            <p className="mb-3 rounded-md bg-[var(--color-secondary-50)] px-3 py-2 text-xs text-[var(--color-secondary-700)]">
              🎉 Livraison offerte débloquée.
            </p>
          )}
          <div className="space-y-2">
            {(Object.keys(SHIPPING_LABELS) as ShippingMethod[]).map((m) => {
              const opt = SHIPPING_LABELS[m];
              const cents =
                subtotal >= SHIPPING.freeAboveCents ? 0 : opt.cents;
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
                    {opt.label}
                  </span>
                  <span className="font-medium">
                    {cents === 0 ? "Offert" : formatMoney(cents)}
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
          <h3 className="mb-3 font-medium">Récapitulatif</h3>
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
                  {formatMoney(l.unitPriceCents * l.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-[var(--color-border)] pt-3 text-sm">
            <Row label="Sous-total" value={formatMoney(subtotal)} />
            <Row
              label="Livraison"
              value={shippingCents === 0 ? "Offerte" : formatMoney(shippingCents)}
            />
            <Row label="Total" value={formatMoney(total)} bold />
          </div>
          <Button type="submit" className="mt-5 w-full" disabled={submitting}>
            {submitting ? "Redirection…" : `Payer ${formatMoney(total)}`}
          </Button>
          <p className="mt-3 text-center text-[11px] text-[var(--color-muted)]">
            Paiement sécurisé par Stripe · CB · Apple Pay · Google Pay
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

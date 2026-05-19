"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/stores/cart";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

type Step = 1 | 2 | 3;

type Address = {
  fullName: string;
  email: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
};

const EMPTY_ADDRESS: Address = {
  fullName: "",
  email: "",
  street: "",
  city: "",
  postalCode: "",
  country: "FR",
};

const SHIPPING = {
  standard: { label: "Livraison standard (3-5j)", cents: 590 },
  express: { label: "Livraison express (1-2j)", cents: 1290 },
} as const;

type ShippingMethod = keyof typeof SHIPPING;

export function CheckoutClient() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const subtotal = useCart((s) => s.subtotalCents());
  const [step, setStep] = useState<Step>(1);
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [shipping, setShipping] = useState<ShippingMethod>("standard");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shippingCents = useMemo(
    () => (subtotal >= 7900 ? 0 : SHIPPING[shipping].cents),
    [subtotal, shipping],
  );
  const total = subtotal + shippingCents;

  if (lines.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-[var(--color-muted)]">Votre panier est vide.</p>
        <Button className="mt-4" onClick={() => router.push("/products")}>
          Voir les produits
        </Button>
      </Card>
    );
  }

  const goNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  };

  const goBack = () => {
    setError(null);
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  };

  const pay = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: address.email,
          shippingMethod: shipping,
          lines: lines.map((l) => ({
            name: l.name,
            image: l.image,
            unitPriceCents: l.unitPriceCents,
            currency: l.currency,
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
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Stepper step={step} />

        {step === 1 && (
          <Card className="p-6">
            <h2 className="font-medium mb-4">Adresse de livraison</h2>
            <form onSubmit={goNext} className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet" name="fullName" value={address.fullName}
                onChange={(v) => setAddress({ ...address, fullName: v })} required />
              <Field label="E-mail" name="email" type="email" value={address.email}
                onChange={(v) => setAddress({ ...address, email: v })} required />
              <Field label="Adresse" name="street" value={address.street}
                onChange={(v) => setAddress({ ...address, street: v })} required className="sm:col-span-2" />
              <Field label="Ville" name="city" value={address.city}
                onChange={(v) => setAddress({ ...address, city: v })} required />
              <Field label="Code postal" name="postalCode" value={address.postalCode}
                onChange={(v) => setAddress({ ...address, postalCode: v })} required />
              <Field label="Pays" name="country" value={address.country}
                onChange={(v) => setAddress({ ...address, country: v.toUpperCase() })}
                maxLength={2} required />
              <div className="sm:col-span-2">
                <Button type="submit">Continuer</Button>
              </div>
            </form>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6">
            <h2 className="font-medium mb-4">Livraison</h2>
            <div className="space-y-2">
              {(Object.keys(SHIPPING) as ShippingMethod[]).map((m) => {
                const opt = SHIPPING[m];
                const cents = subtotal >= 7900 ? 0 : opt.cents;
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
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={goBack}>Retour</Button>
              <Button onClick={(e) => goNext(e as unknown as React.FormEvent)}>Continuer</Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-6">
            <h2 className="font-medium mb-4">Paiement</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-[var(--color-muted)]">Livraison :</span> {address.fullName}, {address.street}, {address.postalCode} {address.city}, {address.country}</p>
              <p><span className="text-[var(--color-muted)]">E-mail :</span> {address.email}</p>
              <p><span className="text-[var(--color-muted)]">Méthode :</span> {SHIPPING[shipping].label}</p>
            </div>
            {error && (
              <p className="mt-4 rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]">
                {error}
              </p>
            )}
            <p className="mt-4 text-xs text-[var(--color-muted)]">
              Vous serez redirigé vers Stripe Checkout pour saisir votre carte en toute sécurité.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={goBack} disabled={submitting}>Retour</Button>
              <Button onClick={pay} disabled={submitting}>
                {submitting ? "Redirection…" : `Payer ${formatMoney(total)}`}
              </Button>
            </div>
          </Card>
        )}
      </div>

      <aside>
        <Card className="p-6 sticky top-24">
          <h3 className="font-medium mb-3">Récapitulatif</h3>
          <ul className="space-y-2 text-sm">
            {lines.map((l) => (
              <li key={l.variantId} className="flex justify-between gap-2">
                <span className="truncate">
                  {l.name} <span className="text-[var(--color-muted)]">× {l.quantity}</span>
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
        </Card>
      </aside>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels = ["Adresse", "Livraison", "Paiement"];
  return (
    <ol className="flex items-center gap-2 text-xs uppercase tracking-wider">
      {labels.map((l, i) => {
        const n = (i + 1) as Step;
        const active = n === step;
        const done = n < step;
        return (
          <li key={l} className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${
                active
                  ? "bg-[var(--color-primary-600)] text-white"
                  : done
                    ? "bg-[var(--color-primary-200)] text-[var(--color-primary-700)]"
                    : "bg-[var(--color-bg)] text-[var(--color-muted)] ring-1 ring-[var(--color-border)]"
              }`}
            >
              {n}
            </span>
            <span className={active ? "text-[var(--color-fg)]" : "text-[var(--color-muted)]"}>
              {l}
            </span>
            {i < labels.length - 1 && <span className="mx-2 text-[var(--color-muted)]">—</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required,
  className,
  maxLength,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
  maxLength?: number;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

"use client";

/**
 * On-page Apple Pay / Google Pay / Link — "pay directly with your phone".
 *
 * Uses Stripe's Express Checkout Element with the deferred PaymentIntent flow:
 * the wallet collects email + shipping address, then `onConfirm` creates the
 * PaymentIntent server-side (authoritative amount) and confirms it. Fully no-op
 * when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing, and self-hides when the
 * device offers no wallet (so the hosted card checkout stays the default).
 */
import { useMemo, useState } from "react";
import {
  loadStripe,
  type Stripe,
  type StripeElementsOptions,
  type StripeExpressCheckoutElementConfirmEvent,
  type StripeExpressCheckoutElementReadyEvent,
  type StripeExpressCheckoutElementShippingAddressChangeEvent,
} from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useTranslations } from "next-intl";
import { useCart } from "@/stores/cart";
import { SHIPPING } from "@/lib/product";
import { SHIP_TO, type ShippingMethod } from "@/lib/checkout";
import { Card } from "@/components/ui/card";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise() {
  if (!pk) return null;
  if (!stripePromise) stripePromise = loadStripe(pk);
  return stripePromise;
}

function shippingCentsFor(subtotal: number, method: ShippingMethod) {
  if (subtotal >= SHIPPING.freeAboveCents) return 0;
  return method === "express" ? SHIPPING.expressCents : SHIPPING.standardCents;
}

export function ExpressCheckout({
  shippingMethod,
}: {
  shippingMethod: ShippingMethod;
}) {
  const t = useTranslations("checkout");
  const promise = getStripePromise();
  const lines = useCart((s) => s.lines);
  const subtotal = useCart((s) => s.subtotalCents());
  const [available, setAvailable] = useState(true);

  const shippingCents = shippingCentsFor(subtotal, shippingMethod);
  const amount = subtotal + shippingCents;

  if (!promise || lines.length === 0 || amount <= 0) return null;

  const options: StripeElementsOptions = {
    mode: "payment",
    amount,
    currency: "eur",
  };

  return (
    <Card className="p-6" style={{ display: available ? "block" : "none" }}>
      <h2 className="mb-3 font-medium">{t("expressTitle")}</h2>
      <Elements key={amount} stripe={promise} options={options}>
        <ExpressInner
          shippingMethod={shippingMethod}
          shippingCents={shippingCents}
          onUnavailable={() => setAvailable(false)}
        />
      </Elements>
      <div className="mt-4 flex items-center gap-3 text-xs text-[var(--color-muted)]">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        {t("orCard")}
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>
    </Card>
  );
}

function ExpressInner({
  shippingMethod,
  shippingCents,
  onUnavailable,
}: {
  shippingMethod: ShippingMethod;
  shippingCents: number;
  onUnavailable: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const lines = useCart((s) => s.lines);
  const [error, setError] = useState<string | null>(null);

  const shippingRates = useMemo(
    () => [
      {
        id: shippingMethod,
        displayName:
          shippingMethod === "express"
            ? "Livraison express (1-2j)"
            : "Livraison standard (3-5j)",
        amount: shippingCents,
      },
    ],
    [shippingMethod, shippingCents],
  );

  async function onConfirm(event: StripeExpressCheckoutElementConfirmEvent) {
    if (!stripe || !elements) return;
    setError(null);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Erreur");
      return;
    }
    try {
      const res = await fetch("/api/checkout/payment-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: event.billingDetails?.email,
          shippingMethod,
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
      const { clientSecret } = (await res.json()) as { clientSecret: string };
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
      });
      if (confirmError) setError(confirmError.message ?? "Erreur paiement");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur paiement");
    }
  }

  return (
    <>
      <ExpressCheckoutElement
        onConfirm={onConfirm}
        onReady={(e: StripeExpressCheckoutElementReadyEvent) => {
          if (!e.availablePaymentMethods) onUnavailable();
        }}
        options={{
          emailRequired: true,
          phoneNumberRequired: true,
          billingAddressRequired: true,
          shippingAddressRequired: true,
          shippingRates,
        }}
        onShippingAddressChange={async (
          e: StripeExpressCheckoutElementShippingAddressChangeEvent,
        ) => {
          if (!(SHIP_TO as readonly string[]).includes(e.address.country)) {
            e.reject();
          } else {
            e.resolve({ shippingRates });
          }
        }}
        onShippingRateChange={async (e) => {
          e.resolve();
        }}
      />
      {error && (
        <p className="mt-2 text-sm text-[var(--color-danger)]">{error}</p>
      )}
    </>
  );
}

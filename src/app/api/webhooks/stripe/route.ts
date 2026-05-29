import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

/**
 * Stripe webhook.
 * Verifies the Stripe-Signature header with STRIPE_WEBHOOK_SECRET, dedups on
 * webhook_events.event_id (unique), then reconciles the order: marks it paid,
 * stores the PaymentIntent id, writes the Stripe-collected address, records a
 * payment row and decrements stock.
 *
 * Enable these events on the Stripe endpoint: `checkout.session.completed`
 * (primary). `payment_intent.succeeded` is also handled as a fallback — both
 * are safe to enable because the paid transition is idempotent per order.
 */

type AddressJson = Record<string, unknown>;

// Minimal structural view of the service-role client (the generated Database
// type does not yet cover the commerce tables).
type AdminDb = {
  from: (table: string) => {
    insert: (
      rows: Record<string, unknown>,
    ) => Promise<{ error: { code?: string; message?: string } | null }>;
    update: (rows: Record<string, unknown>) => {
      eq: (
        k: string,
        v: string,
      ) => {
        neq: (
          k: string,
          v: string,
        ) => {
          select: (cols?: string) => Promise<{
            data: { id: string }[] | null;
            error: { message?: string } | null;
          }>;
        };
      };
    };
  };
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { message?: string } | null }>;
};

// Shape of Stripe's customer_details / shipping_details on a Checkout Session.
type StripeAddrDetails =
  | {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: {
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        state?: string | null;
        postal_code?: string | null;
        country?: string | null;
      } | null;
    }
  | null
  | undefined;

function toAddressJson(d: StripeAddrDetails): AddressJson | null {
  if (!d || !d.address) return null;
  const a = d.address;
  return {
    full_name: d.name ?? null,
    email: d.email ?? null,
    phone: d.phone ?? null,
    line1: a.line1 ?? null,
    line2: a.line2 ?? null,
    city: a.city ?? null,
    state: a.state ?? null,
    postal_code: a.postal_code ?? null,
    country: a.country ?? null,
  };
}

/**
 * Idempotently flip an order to `paid` and run the one-time side effects.
 * The `status <> 'paid'` guard means a second event for the same order (e.g.
 * both checkout.session.completed and payment_intent.succeeded) is a no-op.
 */
async function markOrderPaid(
  sb: AdminDb,
  params: {
    orderId: string;
    paymentIntentId: string | null;
    amountCents: number | null;
    currency: string | null;
    raw: unknown;
    shippingAddress?: AddressJson | null;
    billingAddress?: AddressJson | null;
  },
) {
  const {
    orderId,
    paymentIntentId,
    amountCents,
    currency,
    raw,
    shippingAddress,
    billingAddress,
  } = params;

  const { data: updated, error: updErr } = await sb
    .from("orders")
    .update({
      status: "paid",
      placed_at: new Date().toISOString(),
      ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
      ...(shippingAddress ? { shipping_address: shippingAddress } : {}),
      ...(billingAddress ? { billing_address: billingAddress } : {}),
    })
    .eq("id", orderId)
    .neq("status", "paid")
    .select("id");

  if (updErr) {
    console.error("[stripe webhook] order update failed", orderId, updErr);
    return;
  }
  // No row changed → already processed by an earlier event. Skip side effects.
  if (!updated || updated.length === 0) return;

  const { error: payErr } = await sb.from("payments").insert({
    order_id: orderId,
    provider: "stripe",
    provider_payment_id: paymentIntentId,
    status: "succeeded",
    amount_cents: amountCents ?? 0,
    currency: (currency ?? "eur").toUpperCase(),
    raw: raw as Record<string, unknown>,
  });
  if (payErr) {
    console.error("[stripe webhook] payment insert failed", orderId, payErr);
  }

  // Best-effort: never fail the webhook on stock (payment already captured).
  const { error: rpcErr } = await sb.rpc("decrement_stock_for_order", {
    p_order_id: orderId,
  });
  if (rpcErr) {
    console.error("[stripe webhook] stock decrement failed", orderId, rpcErr);
  }
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "stripe not configured" },
      { status: 503 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig)
    return NextResponse.json({ error: "no signature" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "bad signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const sb = createAdminClient() as unknown as AdminDb;

  // Idempotency: unique (provider, event_id) — duplicate insert returns 23505
  // and we ack the event without re-processing.
  const { error: insertErr } = await sb.from("webhook_events").insert({
    provider: "stripe",
    event_id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
  });
  if (insertErr?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId =
      session.metadata?.order_id ?? session.client_reference_id ?? undefined;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);

    // Stripe collected the address at Checkout — read it from the session.
    const loose = session as unknown as {
      customer_details?: StripeAddrDetails;
      collected_information?: { shipping_details?: StripeAddrDetails };
      shipping_details?: StripeAddrDetails;
    };
    const billing = toAddressJson(loose.customer_details);
    const shipping =
      toAddressJson(
        loose.collected_information?.shipping_details ?? loose.shipping_details,
      ) ?? billing;

    if (orderId) {
      await markOrderPaid(sb, {
        orderId,
        paymentIntentId,
        amountCents: session.amount_total,
        currency: session.currency,
        raw: session,
        shippingAddress: shipping,
        billingAddress: billing,
      });
    }
  } else if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderId = pi.metadata?.order_id;
    if (orderId) {
      await markOrderPaid(sb, {
        orderId,
        paymentIntentId: pi.id,
        amountCents: pi.amount,
        currency: pi.currency,
        raw: pi,
      });
    }
  }

  return NextResponse.json({ received: true });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

/**
 * Stripe webhook.
 * Verifies the Stripe-Signature header with STRIPE_WEBHOOK_SECRET, dedups on
 * webhook_events.event_id (unique), and on payment_intent.succeeded marks the
 * order paid + calls the decrement_stock_for_order RPC.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "stripe not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "bad signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();
  const sb = admin as unknown as {
    from: (t: string) => {
      insert: (
        rows: Record<string, unknown>,
      ) => Promise<{ error: { code?: string } | null }>;
      update: (rows: Record<string, unknown>) => {
        eq: (k: string, v: string) => Promise<{ error: unknown }>;
      };
    };
    rpc: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  };

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

  // Stripe Checkout fires `checkout.session.completed`; the PaymentIntent
  // event is handled too for non-Checkout flows. Both are idempotent via the
  // unique (provider, event_id) insert above.
  const orderId =
    event.type === "checkout.session.completed"
      ? (event.data.object as Stripe.Checkout.Session).metadata?.order_id
      : event.type === "payment_intent.succeeded"
        ? (event.data.object as Stripe.PaymentIntent).metadata?.order_id
        : undefined;

  // Fulfillment only runs once an order row exists (order_id in metadata).
  // The static landing flow does not yet create orders up front — see
  // checkout/session/route.ts. Guard prevents no-op writes meanwhile.
  if (orderId) {
    await sb.from("orders").update({ status: "paid" }).eq("id", orderId);
    await sb.rpc("decrement_stock_for_order", { p_order_id: orderId });
  }

  return NextResponse.json({ received: true });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

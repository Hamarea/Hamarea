import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { sendEmail, orderConfirmationHtml } from "@/lib/email";
import { trackPurchaseServer } from "@/lib/tracking";
import { disputeOrderTarget } from "@/lib/order-transitions";

/**
 * Stripe webhook.
 * Verifies the Stripe-Signature header with STRIPE_WEBHOOK_SECRET, dedups on
 * webhook_events.event_id (unique), then reconciles the order.
 *
 * Événements à activer sur l'endpoint Stripe :
 *   - `checkout.session.completed`   (principal — marque payé, adresse, stock)
 *   - `payment_intent.succeeded`     (repli wallets — même transition idempotente)
 *   - `charge.refunded`              (remboursement total/partiel — cumul absolu)
 *   - `charge.dispute.created`       (litige ouvert)
 *   - `charge.dispute.updated`       (litige mis à jour)
 *   - `charge.dispute.closed`        (litige gagné/perdu)
 *   - `payment_intent.payment_failed`(échec — pending → failed)
 *
 * Choix d'événements : on écoute `charge.refunded` (qui porte le CUMUL absolu
 * `amount_refunded`) et PAS `refund.created/updated` ni `charge.refund.updated`
 * afin d'éviter tout double traitement d'une même mutation. La dédup transport
 * (`webhook_events` unique) + les gardes d'état des RPC rendent chaque handler
 * idempotent et tolérant aux arrivées dans le désordre. La réconciliation
 * multi-tables (orders + refunds / orders + disputes) est ATOMIQUE côté Postgres
 * via les RPC `reconcile_refund` / `reconcile_dispute` (migration 0023).
 *
 * 🧷 Stock : AUCUNE restitution automatique sur remboursement/litige (décision
 * produit) — seul l'état financier est mis à jour ; un retour physique reste un
 * ajustement manuel admin.
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
            data:
              | {
                  id: string;
                  number?: string | number | null;
                  coupon_id?: string | null;
                }[]
              | null;
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
    email?: string | null;
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
    email,
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
    .select("id, number, coupon_id");

  if (updErr) {
    console.error("[stripe webhook] order update failed", orderId, updErr);
    return;
  }
  // No row changed → already processed by an earlier event. Skip side effects.
  if (!updated || updated.length === 0) return;

  const orderNumber =
    (updated[0] as { number?: string | number | null }).number ?? null;
  const couponId =
    (updated[0] as { coupon_id?: string | null }).coupon_id ?? null;

  // Idempotent par commande (garde `status <> 'paid'` ci-dessus) : on incrémente
  // le quota du coupon exactement une fois. Atomique via RPC ; best-effort (un
  // échec ne casse jamais le webhook — le paiement est déjà encaissé).
  if (couponId) {
    const { error: cErr } = await sb.rpc("increment_coupon_usage", {
      p_coupon_id: couponId,
    });
    if (cErr) {
      console.error("[stripe webhook] coupon usage increment failed", orderId, cErr);
    }
  }

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

  // Best-effort order confirmation email (no-op when Resend is not configured).
  if (email) {
    await sendEmail({
      to: email,
      subject: "Votre commande est confirmée",
      html: orderConfirmationHtml({
        orderNumber: orderNumber != null ? String(orderNumber) : null,
        amountCents,
        currency,
      }),
    });
  }

  // Best-effort server-side Purchase conversion (no-op without CAPI creds).
  // event_id = order id so it dedups against the browser pixel.
  await trackPurchaseServer({
    eventId: orderId,
    email: email ?? null,
    valueCents: amountCents,
    currency,
    sourceUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
  });
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
        email: loose.customer_details?.email ?? session.customer_email ?? null,
      });
    }
  } else if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderId = pi.metadata?.order_id;
    if (orderId) {
      // The wallet (Apple/Google Pay) supplies the shipping address; Stripe
      // attaches it to the PaymentIntent. Persist it onto the order.
      const shipping = toAddressJson({
        name: pi.shipping?.name ?? null,
        email: pi.receipt_email ?? null,
        phone: pi.shipping?.phone ?? null,
        address: pi.shipping?.address ?? null,
      });
      await markOrderPaid(sb, {
        orderId,
        paymentIntentId: pi.id,
        amountCents: pi.amount,
        currency: pi.currency,
        raw: pi,
        shippingAddress: shipping,
        billingAddress: shipping,
        email: pi.receipt_email ?? null,
      });
    }
  } else if (event.type === "charge.refunded") {
    // Remboursement (total ou partiel). `charge.amount_refunded` est le CUMUL
    // absolu remboursé → source de vérité (jamais additif côté app). La commande
    // est retrouvée par le payment_intent (référence serveur fiable). L'RPC met
    // à jour orders + refunds atomiquement, de façon idempotente.
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : (charge.payment_intent?.id ?? null);
    const refundsList = (charge.refunds?.data ?? []).map((r) => ({
      id: r.id,
      amount: r.amount,
      reason: r.reason,
      status: r.status,
      created: r.created,
    }));
    const { error } = await sb.rpc("reconcile_refund", {
      p_payment_intent: paymentIntentId,
      p_refunded_cents: charge.amount_refunded,
      p_currency: charge.currency ?? null,
      p_refunds: refundsList,
    });
    if (error) {
      console.error("[stripe webhook] reconcile_refund failed", paymentIntentId, error);
    }
  } else if (
    event.type === "charge.dispute.created" ||
    event.type === "charge.dispute.updated" ||
    event.type === "charge.dispute.closed"
  ) {
    // Litige : upsert du litige + bascule d'état commande (disputed / dispute_won
    // / dispute_lost) atomiquement. La cible d'état est calculée par la matrice
    // pure `disputeOrderTarget` ; l'RPC re-garde la transition (jamais 'paid',
    // jamais depuis pending/failed/cancelled).
    const d = event.data.object as Stripe.Dispute;
    const paymentIntentId =
      typeof d.payment_intent === "string"
        ? d.payment_intent
        : (d.payment_intent?.id ?? null);
    const chargeId = typeof d.charge === "string" ? d.charge : (d.charge?.id ?? null);
    const target = disputeOrderTarget(event.type, d.status);
    const { error } = await sb.rpc("reconcile_dispute", {
      p_dispute_id: d.id,
      p_payment_intent: paymentIntentId,
      p_charge: chargeId,
      p_amount: d.amount ?? 0,
      p_currency: d.currency ?? null,
      p_status: d.status ?? null,
      p_reason: d.reason ?? null,
      p_is_refundable: d.is_charge_refundable ?? null,
      p_opened_at: d.created ? new Date(d.created * 1000).toISOString() : null,
      p_closed_at:
        event.type === "charge.dispute.closed"
          ? new Date(event.created * 1000).toISOString()
          : null,
      p_order_target: target,
      p_raw: d as unknown as Record<string, unknown>,
    });
    if (error) {
      console.error("[stripe webhook] reconcile_dispute failed", d.id, error);
    }
  } else if (event.type === "payment_intent.payment_failed") {
    // Échec de paiement : seule une commande encore `pending` bascule en `failed`
    // (l'RPC garde la transition ; une commande payée n'est jamais touchée).
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderId = pi.metadata?.order_id;
    if (orderId) {
      const { error } = await sb.rpc("mark_order_failed", { p_order_id: orderId });
      if (error) {
        console.error("[stripe webhook] mark_order_failed failed", orderId, error);
      }
    }
  }

  return NextResponse.json({ received: true });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

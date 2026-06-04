import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { SACOCHE } from "@/lib/product";
import {
  SHIP_TO,
  createPendingOrder,
  priceCart,
  shippingCentsFor,
} from "@/lib/checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimitHit } from "@/lib/rate-limit";

/**
 * Hosted Stripe Checkout (card + Apple Pay / Google Pay / Link on the Stripe
 * page). The client may send ONLY references (which product, colour, pack,
 * quantity); the price is ALWAYS recomputed server-side via `priceCart` so a
 * tampered amount can never reach Stripe.
 *
 * When Supabase is configured a pending order is persisted up front and its id
 * is propagated to Stripe (session + PaymentIntent metadata) so the webhook can
 * reconcile the payment. The address is collected by Stripe Checkout and
 * written back onto the order by the webhook.
 */
const LineSchema = z.object({
  productId: z.string().min(1).max(100),
  color: z.string().min(1).max(40),
  pack: z.coerce.number().int().min(1).max(3).default(1),
  quantity: z.number().int().min(1).max(99),
});

const BodySchema = z.object({
  email: z.string().email(),
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
  lines: z.array(LineSchema).min(1).max(50),
});

const SHIPPING_LABEL = {
  standard: "Livraison standard (3-5j)",
  express: "Livraison express (1-2j)",
} as const;

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe non configuré (définissez STRIPE_SECRET_KEY)." },
      { status: 503 },
    );
  }

  // Basic abuse throttle by IP: 10 checkout attempts / minute (fail-open).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (!(await rateLimitHit(`checkout:${ip}`, 10, 60))) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaie dans une minute." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : "bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const currency = SACOCHE.currency.toLowerCase();

  // Build line items from the trusted catalogue. Reject anything unknown.
  const priced = priceCart(body.lines, origin);
  if (!priced.ok) {
    return NextResponse.json({ error: priced.error }, { status: 400 });
  }
  const { lineItems, orderItems, subtotalCents } = priced.cart;
  const shippingCents = shippingCentsFor(subtotalCents, body.shippingMethod);
  const totalCents = subtotalCents + shippingCents;

  // --- Order persistence (best-effort) -------------------------------------
  // Only when Supabase is configured. Failures are logged but never block the
  // payment — the sale must not be lost.
  let orderId: string | null = null;
  const hasDb = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  if (hasDb) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    orderId = await createPendingOrder(createAdminClient(), {
      userId: user?.id ?? null,
      email: body.email,
      currency: SACOCHE.currency,
      subtotalCents,
      shippingCents,
      totalCents,
      orderItems,
    });
  }

  const metadata: Record<string, string> = { source: "landing", email: body.email };
  const piMetadata: Record<string, string> = { source: "landing" };
  if (orderId) {
    metadata.order_id = orderId;
    piMetadata.order_id = orderId;
  }

  // Idempotency: same payload submitted twice (double-click) reuses the session.
  const idempotencyKey = createHash("sha256")
    .update(
      JSON.stringify({ email: body.email, m: body.shippingMethod, l: body.lines }),
    )
    .digest("hex");

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        locale: "auto",
        customer_email: body.email,
        line_items: lineItems,
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        phone_number_collection: { enabled: true },
        shipping_address_collection: { allowed_countries: [...SHIP_TO] },
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: shippingCents, currency },
              display_name:
                shippingCents === 0
                  ? "Livraison offerte"
                  : SHIPPING_LABEL[body.shippingMethod],
            },
          },
        ],
        metadata,
        payment_intent_data: { metadata: piMetadata },
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout/cancel`,
      },
      { idempotencyKey },
    );
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "stripe error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

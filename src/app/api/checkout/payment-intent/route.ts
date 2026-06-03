import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { SACOCHE } from "@/lib/product";
import {
  createPendingOrder,
  priceCart,
  shippingCentsFor,
} from "@/lib/checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimitHit } from "@/lib/rate-limit";

/**
 * Deferred PaymentIntent for the on-page Express Checkout Element
 * (Apple Pay / Google Pay / Link — "pay directly with your phone").
 *
 * The browser sends ONLY references + the email/shipping method chosen in the
 * wallet sheet; the amount is recomputed server-side via `priceCart` (same
 * source of truth as the hosted Checkout). The wallet collects the shipping
 * address, which Stripe attaches to the PaymentIntent — the existing webhook
 * (`payment_intent.succeeded`) reconciles the order from `metadata.order_id`.
 */
const LineSchema = z.object({
  productId: z.string().min(1).max(100),
  color: z.string().min(1).max(40),
  pack: z.coerce.number().int().min(1).max(3).default(1),
  quantity: z.number().int().min(1).max(99),
});

const BodySchema = z.object({
  email: z.string().email().optional(),
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
  lines: z.array(LineSchema).min(1).max(50),
});

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe non configuré (définissez STRIPE_SECRET_KEY)." },
      { status: 503 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (!(await rateLimitHit(`pi:${ip}`, 10, 60))) {
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

  const priced = priceCart(body.lines, origin);
  if (!priced.ok) {
    return NextResponse.json({ error: priced.error }, { status: 400 });
  }
  const { orderItems, subtotalCents } = priced.cart;
  const shippingCents = shippingCentsFor(subtotalCents, body.shippingMethod);
  const totalCents = subtotalCents + shippingCents;

  // Persist a pending order so the webhook can reconcile it (best-effort).
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
      email: body.email ?? "",
      currency: SACOCHE.currency,
      subtotalCents,
      shippingCents,
      totalCents,
      orderItems,
    });
  }

  const metadata: Record<string, string> = { source: "express" };
  if (orderId) metadata.order_id = orderId;

  // Idempotency: identical payload (retry) reuses the same PaymentIntent.
  const idempotencyKey = createHash("sha256")
    .update(
      JSON.stringify({
        e: body.email ?? "",
        m: body.shippingMethod,
        l: body.lines,
        t: totalCents,
      }),
    )
    .digest("hex");

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: totalCents,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata,
        ...(body.email ? { receipt_email: body.email } : {}),
      },
      { idempotencyKey },
    );
    return NextResponse.json({ clientSecret: intent.client_secret, orderId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "stripe error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

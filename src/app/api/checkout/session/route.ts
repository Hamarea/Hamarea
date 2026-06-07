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
import { priceDbVariants } from "@/lib/checkout-db";
import { resolveCoupon, couponErrorMessage } from "@/lib/coupon-db";
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
  // Any string: the sacoche landing uses synthetic ids (e.g. sacoche-rose-pack-2);
  // only non-sacoche lines are looked up as real DB variant UUIDs.
  variantId: z.string().max(100).optional(),
  color: z.string().max(40).optional().default(""),
  pack: z.coerce.number().int().min(1).max(3).default(1),
  quantity: z.number().int().min(1).max(99),
});

const BodySchema = z.object({
  email: z.string().email(),
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
  lines: z.array(LineSchema).min(1).max(50),
  // Code promo applicatif (table `coupons`). Optionnel et rétro-compatible :
  // absent → on conserve les codes promo natifs Stripe (allow_promotion_codes).
  couponCode: z.string().trim().max(40).optional(),
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

  // Two trusted pricing paths — the price is ALWAYS recomputed server-side:
  //  - the sacoche landing (productId === SACOCHE.id) → priceCart (packs, etc.)
  //  - any other catalogue product → priceDbVariants (price read from the DB).
  const sacocheLines = body.lines.filter((l) => l.productId === SACOCHE.id);
  const dbLines = body.lines
    .filter((l) => l.productId !== SACOCHE.id && l.variantId)
    .map((l) => ({ variantId: l.variantId as string, quantity: l.quantity }));

  const priced = priceCart(sacocheLines, origin);
  if (!priced.ok) {
    return NextResponse.json({ error: priced.error }, { status: 400 });
  }
  const dbPriced = await priceDbVariants(dbLines);
  if (!dbPriced.ok) {
    return NextResponse.json({ error: dbPriced.error }, { status: 400 });
  }

  const lineItems = [...priced.cart.lineItems, ...dbPriced.cart.lineItems];
  const orderItems = [...priced.cart.orderItems, ...dbPriced.cart.orderItems];
  const subtotalCents = priced.cart.subtotalCents + dbPriced.cart.subtotalCents;
  if (lineItems.length === 0) {
    return NextResponse.json({ error: "Panier vide ou article indisponible." }, { status: 400 });
  }
  const hasDb = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // --- Coupon applicatif (autoritaire serveur) -----------------------------
  // La remise est TOUJOURS recalculée en base ; le client n'envoie qu'un code.
  // Un code fourni mais invalide ⇒ 400 (le front affiche l'erreur). Sans DB, on
  // ignore (les coupons app vivent en base ; les codes Stripe natifs restent).
  let discountCents = 0;
  let couponId: string | null = null;
  if (body.couponCode && hasDb) {
    const res = await resolveCoupon(body.couponCode, subtotalCents);
    if (!res.ok) {
      return NextResponse.json(
        { error: couponErrorMessage(res.reason), couponError: true },
        { status: 400 },
      );
    }
    discountCents = res.discountCents;
    couponId = res.couponId;
  }

  const shippingCents = shippingCentsFor(subtotalCents, body.shippingMethod);
  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;

  // --- Order persistence (best-effort) -------------------------------------
  // Only when Supabase is configured. Failures are logged but never block the
  // payment — the sale must not be lost.
  let orderId: string | null = null;
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
      discountCents,
      couponId,
    });
  }

  const metadata: Record<string, string> = { source: "landing", email: body.email };
  const piMetadata: Record<string, string> = { source: "landing" };
  if (orderId) {
    metadata.order_id = orderId;
    piMetadata.order_id = orderId;
  }

  // Idempotency: same payload submitted twice (double-click) reuses the session.
  // Le coupon entre dans la clé : changer le code ⇒ nouvelle session (pas de
  // réutilisation d'une session sans remise).
  const idempotencyKey = createHash("sha256")
    .update(
      JSON.stringify({
        email: body.email,
        m: body.shippingMethod,
        l: body.lines,
        c: body.couponCode ?? "",
        d: discountCents,
      }),
    )
    .digest("hex");

  try {
    // Coupon app appliqué → coupon Stripe éphémère + on retire les promo codes
    // natifs (Stripe interdit `discounts` ET `allow_promotion_codes` ensemble).
    // Si la création échoue, l'erreur remonte en 502 : on ne facture jamais le
    // plein tarif alors qu'une remise valide était promise.
    let discounts: { coupon: string }[] | undefined;
    if (couponId && discountCents > 0) {
      const ephemeral = await stripe.coupons.create({
        amount_off: discountCents,
        currency,
        duration: "once",
        name: body.couponCode ? `Code ${body.couponCode.toUpperCase()}` : "Remise",
      });
      discounts = [{ coupon: ephemeral.id }];
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        locale: "auto",
        customer_email: body.email,
        line_items: lineItems,
        ...(discounts ? { discounts } : { allow_promotion_codes: true }),
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

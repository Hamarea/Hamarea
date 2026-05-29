import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { SACOCHE, SHIPPING, colorByName, unitPriceForPack } from "@/lib/product";

/**
 * The client may send ONLY references (which product, colour, pack, quantity).
 * The price is ALWAYS recomputed from the server-side catalogue so a tampered
 * `unitPriceCents` can never reach Stripe (previous critical vulnerability).
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

const SHIPPING_OPTIONS = {
  standard: { label: "Livraison standard (3-5j)", cents: SHIPPING.standardCents },
  express: { label: "Livraison express (1-2j)", cents: SHIPPING.expressCents },
} as const;

// Countries we ship to (EU + EFTA + UK). Stripe collects/validates the address.
const SHIP_TO = [
  "FR", "BE", "LU", "DE", "NL", "ES", "IT", "PT", "AT", "IE",
  "DK", "SE", "FI", "PL", "CZ", "GR", "CH", "GB",
] as const;

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe non configuré (définissez STRIPE_SECRET_KEY)." },
      { status: 503 },
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
  const httpsOrigin = origin.startsWith("https://");
  const currency = SACOCHE.currency.toLowerCase();

  // Build line items from the trusted catalogue. Reject anything unknown.
  const lineItems = [];
  for (const l of body.lines) {
    if (l.productId !== SACOCHE.id) {
      return NextResponse.json(
        { error: `Produit inconnu: ${l.productId}` },
        { status: 400 },
      );
    }
    const colorObj = colorByName(l.color);
    if (!colorObj) {
      return NextResponse.json(
        { error: `Couleur inconnue: ${l.color}` },
        { status: 400 },
      );
    }
    const unitAmount = unitPriceForPack(l.pack); // server-authoritative price
    lineItems.push({
      price_data: {
        currency,
        unit_amount: unitAmount,
        product_data: {
          name: `${SACOCHE.name} — ${colorObj.name}${l.pack > 1 ? ` (pack ${l.pack})` : ""}`,
          images: httpsOrigin ? [`${origin}${colorObj.imageUrl}`] : undefined,
        },
      },
      quantity: l.quantity,
    });
  }

  const subtotal = lineItems.reduce(
    (s, li) => s + li.price_data.unit_amount * li.quantity,
    0,
  );
  const ship = SHIPPING_OPTIONS[body.shippingMethod];
  const shippingCents = subtotal >= SHIPPING.freeAboveCents ? 0 : ship.cents;

  // Idempotency: same payload submitted twice (double-click) reuses the session.
  const idempotencyKey = createHash("sha256")
    .update(JSON.stringify({ email: body.email, m: body.shippingMethod, l: body.lines }))
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
                shippingCents === 0 ? "Livraison offerte" : ship.label,
            },
          },
        ],
        // Wire real order persistence here once orders are created up front.
        metadata: { source: "landing", email: body.email },
        payment_intent_data: { metadata: { source: "landing" } },
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

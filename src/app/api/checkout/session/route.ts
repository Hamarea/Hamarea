import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { SACOCHE, SHIPPING, colorByName, unitPriceForPack } from "@/lib/product";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * The client may send ONLY references (which product, colour, pack, quantity).
 * The price is ALWAYS recomputed from the server-side catalogue so a tampered
 * `unitPriceCents` can never reach Stripe (previous critical vulnerability).
 *
 * When Supabase is configured, a pending order is also persisted up front and
 * its id is propagated to Stripe (session + PaymentIntent metadata) so the
 * webhook can reconcile the payment. The shipping/billing address is collected
 * by Stripe Checkout and written back onto the order by the webhook.
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

type CheckoutLineItem = {
  price_data: {
    currency: string;
    unit_amount: number;
    product_data: { name: string; images: string[] | undefined };
  };
  quantity: number;
};

type OrderItemRow = {
  sku: string;
  name_snapshot: string;
  quantity: number;
  unit_price_cents: number;
};

// Minimal structural view of the service-role client (the generated Database
// type does not yet cover the commerce tables — same approach as the webhook).
type AdminDb = {
  from: (table: string) => {
    insert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
      select: (cols?: string) => {
        single: () => Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
      };
    } & PromiseLike<{ error: { message: string } | null }>;
  };
};

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
  const lineItems: CheckoutLineItem[] = [];
  const orderItems: OrderItemRow[] = [];
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
    const name = `${SACOCHE.name} — ${colorObj.name}${l.pack > 1 ? ` (pack ${l.pack})` : ""}`;
    lineItems.push({
      price_data: {
        currency,
        unit_amount: unitAmount,
        product_data: {
          name,
          images: httpsOrigin ? [`${origin}${colorObj.imageUrl}`] : undefined,
        },
      },
      quantity: l.quantity,
    });
    orderItems.push({
      sku: `${colorObj.variantId}-pack-${l.pack}`,
      name_snapshot: name,
      quantity: l.quantity,
      unit_price_cents: unitAmount,
    });
  }

  const subtotal = lineItems.reduce(
    (s, li) => s + li.price_data.unit_amount * li.quantity,
    0,
  );
  const ship = SHIPPING_OPTIONS[body.shippingMethod];
  const shippingCents = subtotal >= SHIPPING.freeAboveCents ? 0 : ship.cents;
  const totalCents = subtotal + shippingCents;

  // --- Order persistence (best-effort) -------------------------------------
  // Only when Supabase is configured. The address is collected by Stripe
  // Checkout and written onto the order by the webhook on completion. Failures
  // are logged but never block the payment — the sale must not be lost.
  let orderId: string | null = null;
  const hasDb = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  if (hasDb) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const sb = createAdminClient() as unknown as AdminDb;
      const { data: order, error: orderErr } = await sb
        .from("orders")
        .insert({
          user_id: user?.id ?? null,
          email: body.email,
          status: "pending",
          currency: SACOCHE.currency,
          subtotal_cents: subtotal,
          shipping_cents: shippingCents,
          tax_cents: 0,
          discount_cents: 0,
          total_cents: totalCents,
          shipping_address: {}, // filled by the webhook from Stripe-collected details
          billing_address: {},
        })
        .select("id")
        .single();
      if (orderErr || !order) {
        console.error("[checkout] order insert failed", orderErr);
      } else {
        orderId = order.id;
        const { error: itemsErr } = await sb.from("order_items").insert(
          orderItems.map((it) => ({
            order_id: order.id,
            // Catalog ids are slugs, not product_variants UUIDs yet — store the
            // slug in `sku` and leave variant_id null (single-product MVP).
            variant_id: null,
            sku: it.sku,
            name_snapshot: it.name_snapshot,
            quantity: it.quantity,
            unit_price_cents: it.unit_price_cents,
            tax_rate: 0,
            total_cents: it.unit_price_cents * it.quantity,
          })),
        );
        if (itemsErr) {
          console.error("[checkout] order_items insert failed", itemsErr);
        }
      }
    } catch (err) {
      console.error("[checkout] order persistence error", err);
    }
  }

  const metadata: Record<string, string> = {
    source: "landing",
    email: body.email,
  };
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
                shippingCents === 0 ? "Livraison offerte" : ship.label,
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

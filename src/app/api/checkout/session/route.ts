import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { resolveVariant } from "@/lib/product";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const AddressSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  street: z.string().min(1).max(300),
  city: z.string().min(1).max(120),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2),
});

// The client only sends an identifier + quantity. Prices and names are
// resolved server-side from the catalog so they can never be tampered with.
const BodySchema = z.object({
  email: z.string().email(),
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
  address: AddressSchema,
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
});

const SHIPPING_OPTIONS: Record<
  "standard" | "express",
  { label: string; cents: number }
> = {
  standard: { label: "Livraison standard (3-5j)", cents: 590 },
  express: { label: "Livraison express (1-2j)", cents: 1290 },
};

// Free shipping above this subtotal (mirrors shop_settings.shipping.freeAbove).
const FREE_SHIPPING_THRESHOLD_CENTS = 7900;

type ResolvedLine = {
  variantId: string;
  name: string;
  imageUrl: string;
  unitPriceCents: number;
  currency: string;
  quantity: number;
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
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "Supabase non configuré (commande non enregistrable)." },
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

  // Resolve every line against the catalog — reject anything unknown.
  const items: ResolvedLine[] = [];
  for (const line of body.lines) {
    const variant = resolveVariant(line.variantId);
    if (!variant) {
      return NextResponse.json(
        { error: `Article inconnu : ${line.variantId}` },
        { status: 400 },
      );
    }
    items.push({
      variantId: variant.variantId,
      name: variant.name,
      imageUrl: variant.imageUrl,
      unitPriceCents: variant.unitPriceCents,
      currency: variant.currency.toLowerCase(),
      quantity: line.quantity,
    });
  }

  const currency = items[0].currency; // single-currency catalog (EUR)
  const subtotalCents = items.reduce(
    (s, it) => s + it.unitPriceCents * it.quantity,
    0,
  );
  const ship = SHIPPING_OPTIONS[body.shippingMethod];
  const shippingCents =
    subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : ship.cents;
  const totalCents = subtotalCents + shippingCents;

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  // Stripe only accepts publicly reachable image URLs; skip them on localhost.
  const allowImages = origin.startsWith("https://");

  // Attach the order to the signed-in user when there is one (guest otherwise).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const address = {
    full_name: body.address.fullName,
    email: body.address.email,
    line1: body.address.street,
    city: body.address.city,
    postal_code: body.address.postalCode,
    country: body.address.country.toUpperCase(),
  };

  // Persist a pending order before redirecting — the webhook flips it to paid.
  const sb = createAdminClient() as unknown as AdminDb;
  const { data: order, error: orderErr } = await sb
    .from("orders")
    .insert({
      user_id: user?.id ?? null,
      email: body.email,
      status: "pending",
      currency: currency.toUpperCase(),
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      tax_cents: 0,
      discount_cents: 0,
      total_cents: totalCents,
      shipping_address: address,
      billing_address: address,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return NextResponse.json(
      { error: `Création de la commande échouée : ${orderErr?.message ?? "inconnue"}` },
      { status: 500 },
    );
  }

  const { error: itemsErr } = await sb.from("order_items").insert(
    items.map((it) => ({
      order_id: order.id,
      // Catalog variantIds are slugs, not product_variants UUIDs yet — store
      // the slug in `sku` and leave variant_id null (single-product MVP).
      variant_id: null,
      sku: it.variantId,
      name_snapshot: it.name,
      quantity: it.quantity,
      unit_price_cents: it.unitPriceCents,
      tax_rate: 0,
      total_cents: it.unitPriceCents * it.quantity,
    })),
  );
  if (itemsErr) {
    return NextResponse.json(
      { error: `Création des lignes échouée : ${itemsErr.message}` },
      { status: 500 },
    );
  }

  const lineItems = items.map((it) => ({
    price_data: {
      currency,
      unit_amount: it.unitPriceCents,
      product_data: {
        name: it.name,
        images: allowImages ? [`${origin}${it.imageUrl}`] : undefined,
      },
    },
    quantity: it.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: body.email,
    client_reference_id: order.id,
    metadata: { order_id: order.id },
    // Propagate the order id onto the PaymentIntent too, so either
    // checkout.session.completed or payment_intent.succeeded can reconcile.
    payment_intent_data: { metadata: { order_id: order.id } },
    line_items: lineItems,
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: shippingCents, currency },
          display_name: ship.label,
        },
      },
    ],
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancel`,
  });

  return NextResponse.json({ url: session.url, orderId: order.id });
}

export const dynamic = "force-dynamic";

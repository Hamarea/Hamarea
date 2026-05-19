import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";

const LineSchema = z.object({
  name: z.string().min(1).max(200),
  image: z.string().url().optional(),
  unitPriceCents: z.number().int().min(0).max(10_000_000),
  currency: z.string().length(3),
  quantity: z.number().int().min(1).max(99),
});

const BodySchema = z.object({
  email: z.string().email(),
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
  lines: z.array(LineSchema).min(1).max(50),
});

const SHIPPING_OPTIONS: Record<
  "standard" | "express",
  { label: string; cents: number }
> = {
  standard: { label: "Livraison standard (3-5j)", cents: 590 },
  express: { label: "Livraison express (1-2j)", cents: 1290 },
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

  const subtotal = body.lines.reduce(
    (s, l) => s + l.unitPriceCents * l.quantity,
    0,
  );
  const ship = SHIPPING_OPTIONS[body.shippingMethod];
  // Port offert au-dessus du seuil shop_settings.shipping.freeAbove (7900 par défaut)
  const shippingCents = subtotal >= 7900 ? 0 : ship.cents;
  const currency = body.lines[0]?.currency.toLowerCase() ?? "eur";

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: body.email,
    line_items: body.lines.map((l) => ({
      price_data: {
        currency,
        unit_amount: l.unitPriceCents,
        product_data: {
          name: l.name,
          images: l.image ? [l.image] : undefined,
        },
      },
      quantity: l.quantity,
    })),
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

  return NextResponse.json({ url: session.url });
}

export const dynamic = "force-dynamic";

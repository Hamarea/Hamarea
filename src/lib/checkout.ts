/**
 * Shared, server-authoritative checkout pricing.
 *
 * The price is ALWAYS recomputed here from the trusted catalogue (`lib/product`)
 * so a tampered client amount can never reach Stripe. Both payment entry points
 * use this single source of truth:
 *   - `/api/checkout/session`        → Stripe hosted Checkout (card + wallets)
 *   - `/api/checkout/payment-intent` → on-page Express Checkout (Apple/Google Pay)
 *
 * Everything in this module is PURE (no service-role import) so it is safe to
 * import from client components too (the Express Checkout element needs SHIP_TO).
 */
import { SACOCHE, SHIPPING, colorByName, unitPriceForPack } from "@/lib/product";

/** Countries we ship to (EU + EFTA + UK). Stripe validates the address. */
export const SHIP_TO = [
  "FR", "BE", "LU", "DE", "NL", "ES", "IT", "PT", "AT", "IE",
  "DK", "SE", "FI", "PL", "CZ", "GR", "CH", "GB",
] as const;

export type ShippingMethod = "standard" | "express";

export type CartLineInput = {
  productId: string;
  color: string;
  pack: number;
  quantity: number;
};

export type CheckoutLineItem = {
  price_data: {
    currency: string;
    unit_amount: number;
    product_data: { name: string; images: string[] | undefined };
  };
  quantity: number;
};

export type OrderItemRow = {
  sku: string;
  name_snapshot: string;
  quantity: number;
  unit_price_cents: number;
  /** Real product_variants UUID for DB products (null for the sacoche landing). */
  variant_id?: string | null;
};

export type PricedCart = {
  lineItems: CheckoutLineItem[];
  orderItems: OrderItemRow[];
  subtotalCents: number;
};

/**
 * Validate the references and recompute the authoritative price for each line.
 * Returns an error string for any unknown product/colour (never trusts client
 * prices). `origin` is used to build absolute HTTPS image URLs for Stripe.
 */
export function priceCart(
  lines: CartLineInput[],
  origin: string,
): { ok: true; cart: PricedCart } | { ok: false; error: string } {
  const httpsOrigin = origin.startsWith("https://");
  const currency = SACOCHE.currency.toLowerCase();
  const lineItems: CheckoutLineItem[] = [];
  const orderItems: OrderItemRow[] = [];

  for (const l of lines) {
    if (l.productId !== SACOCHE.id) {
      return { ok: false, error: `Produit inconnu: ${l.productId}` };
    }
    const colorObj = colorByName(l.color);
    if (!colorObj) {
      return { ok: false, error: `Couleur inconnue: ${l.color}` };
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

  const subtotalCents = lineItems.reduce(
    (s, li) => s + li.price_data.unit_amount * li.quantity,
    0,
  );
  return { ok: true, cart: { lineItems, orderItems, subtotalCents } };
}

/** Authoritative shipping cost: free above the threshold, else the method rate. */
export function shippingCentsFor(
  subtotalCents: number,
  method: ShippingMethod,
): number {
  if (subtotalCents >= SHIPPING.freeAboveCents) return 0;
  return method === "express" ? SHIPPING.expressCents : SHIPPING.standardCents;
}

// Minimal structural view of the service-role client. The admin client is
// PASSED IN (never imported here) so this module stays free of the service-role
// key and safe to import from client components.
type PendingOrderClient = {
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

/**
 * Persist a pending order + its items (best-effort). Returns the new order id,
 * or null on failure — the caller must never block the payment on this.
 */
export async function createPendingOrder(
  admin: unknown,
  params: {
    userId: string | null;
    email: string;
    currency: string;
    subtotalCents: number;
    shippingCents: number;
    totalCents: number;
    orderItems: OrderItemRow[];
    /** Remise appliquée (centimes, autoritaire serveur). 0 si pas de coupon. */
    discountCents?: number;
    /** UUID du coupon `coupons` appliqué — null sinon (incrémenté au webhook). */
    couponId?: string | null;
  },
): Promise<string | null> {
  // The generated Database type does not yet cover the commerce tables, so the
  // service-role client is narrowed to the minimal shape we use here.
  const sb = admin as PendingOrderClient;
  try {
    const { data: order, error: orderErr } = await sb
      .from("orders")
      .insert({
        user_id: params.userId,
        email: params.email,
        status: "pending",
        currency: params.currency,
        subtotal_cents: params.subtotalCents,
        shipping_cents: params.shippingCents,
        tax_cents: 0,
        discount_cents: params.discountCents ?? 0,
        coupon_id: params.couponId ?? null,
        total_cents: params.totalCents,
        shipping_address: {}, // filled by the webhook from Stripe-collected details
        billing_address: {},
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error("[checkout] order insert failed", orderErr);
      return null;
    }

    const { error: itemsErr } = await sb.from("order_items").insert(
      params.orderItems.map((it) => ({
        order_id: order.id,
        // DB products carry their real variant_id (so stock decrements); the
        // sacoche landing has no DB variant and keeps just the SKU.
        variant_id: it.variant_id ?? null,
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
    return order.id;
  } catch (err) {
    console.error("[checkout] order persistence error", err);
    return null;
  }
}

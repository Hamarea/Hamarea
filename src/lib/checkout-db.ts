// Server-authoritative pricing for catalogue products (anything that is NOT the
// hardcoded sacoche landing). The price ALWAYS comes from the DB variant — the
// client only sends references (variantId + quantity), never a price. Used by
// the checkout routes alongside `priceCart` (which stays the sacoche path).
//
// Server-only: imports the service-role client. Never import from a client
// component.
import { createAdminClient } from "@/lib/supabase/admin";
import type { CheckoutLineItem, OrderItemRow } from "@/lib/checkout";

export type DbLineInput = { variantId: string; quantity: number };

type VariantRow = {
  id: string;
  sku: string;
  price_cents: number;
  currency: string | null;
  active: boolean;
  option_values: Record<string, unknown> | null;
  products: { name_i18n: Record<string, string> | null; status: string } | null;
};

export type PricedDbCart = {
  lineItems: CheckoutLineItem[];
  orderItems: OrderItemRow[];
  subtotalCents: number;
};

export async function priceDbVariants(
  lines: DbLineInput[],
): Promise<{ ok: true; cart: PricedDbCart } | { ok: false; error: string }> {
  if (lines.length === 0) {
    return { ok: true, cart: { lineItems: [], orderItems: [], subtotalCents: 0 } };
  }

  const ids = [...new Set(lines.map((l) => l.variantId))];
  const admin = createAdminClient() as unknown as {
    from: (t: string) => {
      select: (q: string) => {
        in: (
          k: string,
          v: string[],
        ) => Promise<{ data: VariantRow[] | null; error: { message?: string } | null }>;
      };
    };
  };

  const { data, error } = await admin
    .from("product_variants")
    .select(
      "id, sku, price_cents, currency, active, option_values, products(name_i18n, status)",
    )
    .in("id", ids);

  if (error || !data) return { ok: false, error: "Produit indisponible." };

  const byId = new Map(data.map((v) => [v.id, v]));
  const lineItems: CheckoutLineItem[] = [];
  const orderItems: OrderItemRow[] = [];
  let subtotalCents = 0;

  for (const l of lines) {
    const v = byId.get(l.variantId);
    if (!v || !v.active || v.products?.status !== "active") {
      return { ok: false, error: "Un article du panier n'est plus disponible." };
    }
    const baseName = v.products?.name_i18n?.fr ?? v.products?.name_i18n?.en ?? v.sku;
    const color = (v.option_values?.color as string | undefined) ?? "";
    const label = color ? `${baseName} — ${color}` : baseName;
    const unit = v.price_cents; // authoritative, from the DB
    subtotalCents += unit * l.quantity;

    lineItems.push({
      price_data: {
        currency: (v.currency || "EUR").toLowerCase(),
        unit_amount: unit,
        product_data: { name: label, images: undefined },
      },
      quantity: l.quantity,
    });
    orderItems.push({
      sku: v.sku,
      name_snapshot: label,
      quantity: l.quantity,
      unit_price_cents: unit,
      variant_id: v.id,
    });
  }

  return { ok: true, cart: { lineItems, orderItems, subtotalCents } };
}

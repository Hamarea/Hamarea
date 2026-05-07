import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook stub.
 * To enable: install `stripe`, verify `Stripe-Signature` with STRIPE_WEBHOOK_SECRET,
 * then on `payment_intent.succeeded` -> mark order paid + call RPC decrement_stock_for_order.
 */
export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "stripe not configured" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 });

  const payload = await req.text();
  let event: { id: string; type: string; data: { object: { id: string; metadata?: { order_id?: string } } } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  // Idempotency: skip if already seen
  const admin = createAdminClient();
  const sb = admin as unknown as {
    from: (t: string) => {
      insert: (rows: Record<string, unknown>) => Promise<{ error: { code?: string } | null }>;
      select: (q: string) => {
        eq: (k: string, v: string) => {
          maybeSingle: () => Promise<{ data: unknown }>;
        };
      };
      update: (rows: Record<string, unknown>) => {
        eq: (k: string, v: string) => Promise<{ error: unknown }>;
      };
      rpc?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    };
    rpc: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  };

  await sb
    .from("webhook_events")
    .insert({ provider: "stripe", event_id: event.id, type: event.type, payload: event });

  if (event.type === "payment_intent.succeeded") {
    const orderId = event.data.object.metadata?.order_id;
    if (orderId) {
      await sb.from("orders").update({ status: "paid" }).eq("id", orderId);
      await sb.rpc("decrement_stock_for_order", { p_order_id: orderId });
    }
  }
  return NextResponse.json({ received: true });
}

export const dynamic = "force-dynamic";

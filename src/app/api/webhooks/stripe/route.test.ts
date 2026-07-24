import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests d'intégration du webhook Stripe (routage des événements + idempotence).
 * Stripe (constructEvent) et le client admin Supabase sont mockés : on vérifie
 * QUELLE réconciliation est déclenchée pour chaque événement, avec quels
 * arguments — sans base réelle. Les gardes d'état SQL sont testées séparément
 * (order-transitions.test.ts + supabase/tests/0023_*.sql).
 */

// --- État mockable partagé --------------------------------------------------
type Rec = { table?: string; op: string; args: unknown };
let calls: Rec[] = [];
let webhookInsertError: { code?: string } | null = null;
let event: Record<string, unknown> = {};
let constructThrows = false;

const orderUpdateResult = {
  data: [{ id: "ord_1", number: "HAM-1", coupon_id: null }],
  error: null,
};

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: () => {
        if (constructThrows) throw new Error("bad signature");
        return event;
      },
    },
  }),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => {}),
  orderConfirmationHtml: () => "<html></html>",
}));
vi.mock("@/lib/tracking", () => ({
  trackPurchaseServer: vi.fn(async () => {}),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      insert: async (args: unknown) => {
        calls.push({ table, op: "insert", args });
        if (table === "webhook_events" && webhookInsertError) {
          return { error: webhookInsertError };
        }
        return { error: null };
      },
      update: (args: unknown) => ({
        eq: () => ({
          neq: () => ({
            select: async () => {
              calls.push({ table, op: "update", args });
              return orderUpdateResult;
            },
          }),
        }),
      }),
    }),
    rpc: async (name: string, args: unknown) => {
      calls.push({ op: "rpc", table: name, args });
      return { error: null };
    },
  }),
}));

const { POST } = await import("./route");

function makeReq(sig = "sig_ok") {
  const headers = new Headers();
  if (sig) headers.set("stripe-signature", sig);
  return new Request("https://x/api/webhooks/stripe", {
    method: "POST",
    headers,
    body: JSON.stringify({ any: "payload" }),
  });
}

function rpcCall(name: string) {
  return calls.find((c) => c.op === "rpc" && c.table === name);
}

beforeEach(() => {
  calls = [];
  webhookInsertError = null;
  constructThrows = false;
  event = {};
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

describe("POST /api/webhooks/stripe", () => {
  it("rejette une requête sans signature (400)", async () => {
    const req = new Request("https://x", { method: "POST", body: "{}" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejette une signature invalide (400)", async () => {
    constructThrows = true;
    const res = await POST(makeReq());
    expect(res.status).toBe(400);
  });

  it("événement dupliqué (23505) → ack sans retraitement", async () => {
    webhookInsertError = { code: "23505" };
    event = {
      id: "evt_dup",
      type: "charge.refunded",
      data: { object: { payment_intent: "pi_1", amount_refunded: 1000, currency: "eur" } },
    };
    const res = await POST(makeReq());
    const body = await res.json();
    expect(body).toEqual({ received: true, duplicate: true });
    // aucun RPC déclenché
    expect(calls.filter((c) => c.op === "rpc")).toHaveLength(0);
  });

  it("charge.refunded → reconcile_refund avec le cumul absolu", async () => {
    event = {
      id: "evt_ref",
      type: "charge.refunded",
      data: {
        object: {
          payment_intent: "pi_42",
          amount_refunded: 5000,
          currency: "eur",
          refunds: {
            data: [
              { id: "re_1", amount: 5000, reason: "requested_by_customer", status: "succeeded", created: 111 },
            ],
          },
        },
      },
    };
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const call = rpcCall("reconcile_refund");
    expect(call).toBeTruthy();
    const args = call!.args as Record<string, unknown>;
    expect(args.p_payment_intent).toBe("pi_42");
    expect(args.p_refunded_cents).toBe(5000);
    expect((args.p_refunds as unknown[]).length).toBe(1);
  });

  it("charge.dispute.created → reconcile_dispute cible 'disputed'", async () => {
    event = {
      id: "evt_dc",
      type: "charge.dispute.created",
      created: 200,
      data: {
        object: {
          id: "dp_1",
          payment_intent: "pi_9",
          charge: "ch_9",
          amount: 5000,
          currency: "eur",
          reason: "fraudulent",
          status: "needs_response",
          is_charge_refundable: true,
          created: 190,
        },
      },
    };
    await POST(makeReq());
    const args = rpcCall("reconcile_dispute")!.args as Record<string, unknown>;
    expect(args.p_dispute_id).toBe("dp_1");
    expect(args.p_payment_intent).toBe("pi_9");
    expect(args.p_order_target).toBe("disputed");
  });

  it("charge.dispute.closed won → cible 'dispute_won'", async () => {
    event = {
      id: "evt_win",
      type: "charge.dispute.closed",
      created: 300,
      data: { object: { id: "dp_2", payment_intent: "pi_9", charge: "ch_9", amount: 5000, currency: "eur", status: "won", created: 190 } },
    };
    await POST(makeReq());
    const args = rpcCall("reconcile_dispute")!.args as Record<string, unknown>;
    expect(args.p_order_target).toBe("dispute_won");
    expect(args.p_closed_at).toBeTruthy();
  });

  it("charge.dispute.closed lost → cible 'dispute_lost' (même reçu dans le désordre)", async () => {
    // 'closed' peut arriver avant/sans que l'on ait vu 'created' : le mapping
    // est sans état, la cible reste correcte.
    event = {
      id: "evt_lost",
      type: "charge.dispute.closed",
      created: 300,
      data: { object: { id: "dp_3", payment_intent: "pi_9", charge: "ch_9", amount: 5000, currency: "eur", status: "lost", created: 190 } },
    };
    await POST(makeReq());
    const args = rpcCall("reconcile_dispute")!.args as Record<string, unknown>;
    expect(args.p_order_target).toBe("dispute_lost");
  });

  it("charge.dispute.updated → reconcile_dispute sans bascule d'état (target null)", async () => {
    event = {
      id: "evt_up",
      type: "charge.dispute.updated",
      created: 250,
      data: { object: { id: "dp_4", payment_intent: "pi_9", charge: "ch_9", amount: 5000, currency: "eur", status: "under_review", created: 190 } },
    };
    await POST(makeReq());
    const args = rpcCall("reconcile_dispute")!.args as Record<string, unknown>;
    expect(args.p_order_target).toBeNull();
  });

  it("payment_intent.payment_failed → mark_order_failed sur l'order metadata", async () => {
    event = {
      id: "evt_fail",
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_x", metadata: { order_id: "ord_77" } } },
    };
    await POST(makeReq());
    const args = rpcCall("mark_order_failed")!.args as Record<string, unknown>;
    expect(args.p_order_id).toBe("ord_77");
  });

  it("checkout.session.completed → marque payé + décrément stock (non-régression)", async () => {
    event = {
      id: "evt_ok",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { order_id: "ord_1" },
          payment_intent: "pi_1",
          amount_total: 12000,
          currency: "eur",
          customer_details: { email: "a@b.co", address: { line1: "1 rue", country: "FR" } },
          customer_email: "a@b.co",
        },
      },
    };
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    // l'order est mis à jour puis le stock décrémenté
    expect(calls.some((c) => c.table === "orders" && c.op === "update")).toBe(true);
    expect(rpcCall("decrement_stock_for_order")).toBeTruthy();
  });
});

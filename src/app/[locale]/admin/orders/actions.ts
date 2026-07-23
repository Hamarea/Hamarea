"use server";

import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getStripe } from "@/lib/stripe";
import { sendEmail, shippingNotificationHtml } from "@/lib/email";
import { refundOrderStatus, type OrderStatus } from "@/lib/order-transitions";

const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

const StatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
});

const ShipmentSchema = z.object({
  orderId: z.string().uuid(),
  carrier: z.string().trim().max(80).optional().nullable(),
  service: z.string().trim().max(80).optional().nullable(),
  tracking_number: z.string().trim().max(120).optional().nullable(),
  tracking_url: z.string().trim().url().max(500).optional().or(z.literal("")).nullable(),
  status: z.string().trim().max(40).default("pending"),
});

type LooseClient = {
  from: (t: string) => {
    update: (row: Record<string, unknown>) => {
      eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>;
    };
    insert: (row: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
    select: (q: string) => {
      eq: (k: string, v: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
      };
    };
  };
};

export async function updateOrderStatus(formData: FormData) {
  const actor = await requirePermission("orders.write");
  const data = StatusSchema.parse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });

  const supabase = (await createClient()) as unknown as LooseClient;
  const { error } = await supabase
    .from("orders")
    .update({ status: data.status, updated_at: new Date().toISOString() })
    .eq("id", data.orderId);
  if (error) throw new Error(error.message ?? "status_update_failed");

  await logAudit({
    actorId: actor.id,
    action: "order.status_change",
    entity: "order",
    entityId: data.orderId,
    data: { status: data.status },
  });

  revalidatePath(`/admin/orders/${data.orderId}`);
  revalidatePath("/admin/orders");
}

export async function upsertShipment(formData: FormData) {
  const actor = await requirePermission("orders.write");
  const data = ShipmentSchema.parse({
    orderId: formData.get("orderId"),
    carrier: (formData.get("carrier") as string) || null,
    service: (formData.get("service") as string) || null,
    tracking_number: (formData.get("tracking_number") as string) || null,
    tracking_url: (formData.get("tracking_url") as string) || null,
    status: (formData.get("status") as string) || "pending",
  });

  const supabase = (await createClient()) as unknown as LooseClient;
  const nowShipped = data.status === "shipped" ? { shipped_at: new Date().toISOString() } : {};
  const nowDelivered =
    data.status === "delivered" ? { delivered_at: new Date().toISOString() } : {};

  const row = {
    carrier: data.carrier,
    service: data.service,
    tracking_number: data.tracking_number,
    tracking_url: data.tracking_url || null,
    status: data.status,
    ...nowShipped,
    ...nowDelivered,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("shipments")
    .select("id, status")
    .eq("order_id", data.orderId)
    .maybeSingle();
  const existingId = (existing as { id?: string } | null)?.id;
  const existingStatus = (existing as { status?: string } | null)?.status;

  if (existingId) {
    const { error } = await supabase.from("shipments").update(row).eq("id", existingId);
    if (error) throw new Error(error.message ?? "shipment_update_failed");
  } else {
    const { error } = await supabase
      .from("shipments")
      .insert({ order_id: data.orderId, ...row });
    if (error) throw new Error(error.message ?? "shipment_insert_failed");
  }

  // Notify the customer once, when the shipment first becomes "shipped".
  // Best-effort: sendEmail is a no-op when Resend is not configured.
  if (data.status === "shipped" && existingStatus !== "shipped") {
    const { data: orderRow } = await supabase
      .from("orders")
      .select("email, number")
      .eq("id", data.orderId)
      .maybeSingle();
    const order = orderRow as
      | { email?: string | null; number?: string | number | null }
      | null;
    if (order?.email) {
      await sendEmail({
        to: order.email,
        subject: "Votre commande est expédiée",
        html: shippingNotificationHtml({
          orderNumber: order.number != null ? String(order.number) : null,
          carrier: data.carrier,
          trackingNumber: data.tracking_number,
          trackingUrl: data.tracking_url || null,
        }),
      });
    }
  }

  await logAudit({
    actorId: actor.id,
    action: "order.shipment_upsert",
    entity: "order",
    entityId: data.orderId,
    data: {
      carrier: data.carrier,
      tracking_number: data.tracking_number,
      status: data.status,
    },
  });

  revalidatePath(`/admin/orders/${data.orderId}`);
}

const RefundSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.coerce.number().positive().max(1_000_000),
  reason: z.string().trim().max(500).optional().or(z.literal("")).nullable(),
});

type RefundClient = {
  from: (t: string) => {
    select: (q: string) => {
      eq: (
        k: string,
        v: string,
      ) => {
        maybeSingle: () => Promise<{
          data: {
            stripe_payment_intent_id: string | null;
            total_cents: number;
            refunded_cents: number | null;
            status: string;
          } | null;
        }>;
      };
    };
    insert: (row: Record<string, unknown>) => Promise<{ error: { message?: string; code?: string } | null }>;
    update: (row: Record<string, unknown>) => {
      eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>;
    };
  };
};

export async function createRefund(formData: FormData) {
  const actor = await requirePermission("orders.refund");
  const data = RefundSchema.parse({
    orderId: formData.get("orderId"),
    amount: formData.get("amount"),
    reason: (formData.get("reason") as string) || null,
  });
  const amountCents = Math.round(data.amount * 100);

  const supabase = (await createClient()) as unknown as RefundClient;
  const { data: order } = await supabase
    .from("orders")
    .select("stripe_payment_intent_id, total_cents, refunded_cents, status")
    .eq("id", data.orderId)
    .maybeSingle();
  if (!order) throw new Error("order_not_found");

  // Garde cumulative : le déjà-remboursé + ce remboursement ne peut jamais
  // dépasser le total de la commande (empêche le sur-remboursement interne).
  const alreadyRefunded = order.refunded_cents ?? 0;
  if (amountCents > order.total_cents - alreadyRefunded) {
    throw new Error(
      "Le montant dépasse le solde remboursable (total − déjà remboursé).",
    );
  }
  const newRefundedCents = alreadyRefunded + amountCents;

  // Idempotence : un double-clic / retry avec le MÊME montant sur le MÊME état
  // cumulé réutilise le remboursement Stripe au lieu d'en créer un second.
  const idempotencyKey = createHash("sha256")
    .update(`${data.orderId}:${amountCents}:${alreadyRefunded}`)
    .digest("hex");

  // Real Stripe refund when a payment intent exists; otherwise just record it
  // (covers manual / off-Stripe refunds).
  let providerRefundId: string | null = null;
  const stripe = getStripe();
  if (stripe && order.stripe_payment_intent_id) {
    const refund = await stripe.refunds.create(
      {
        payment_intent: order.stripe_payment_intent_id,
        amount: amountCents,
      },
      { idempotencyKey },
    );
    providerRefundId = refund.id;
  }

  const { error } = await supabase.from("refunds").insert({
    order_id: data.orderId,
    amount_cents: amountCents,
    reason: data.reason || null,
    provider_refund_id: providerRefundId,
    status: "succeeded",
    created_by: actor.id,
  });
  // 23505 = ce remboursement Stripe est déjà journalisé (webhook ou double-clic).
  if (error && error.code !== "23505") throw new Error(error.message ?? "refund_failed");

  // Bascule d'état via la matrice pure (partiel → partially_refunded ; total →
  // refunded). Le webhook `charge.refunded` réconciliera aussi refunded_cents
  // (valeur absolue) : ici on met à jour immédiatement pour l'admin.
  const nextStatus = refundOrderStatus(
    order.status as OrderStatus,
    newRefundedCents,
    order.total_cents,
  );
  await supabase
    .from("orders")
    .update({
      refunded_cents: newRefundedCents,
      ...(nextStatus ? { status: nextStatus } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.orderId);

  await logAudit({
    actorId: actor.id,
    action: "order.refund",
    entity: "order",
    entityId: data.orderId,
    data: {
      amount_cents: amountCents,
      refunded_cents_total: newRefundedCents,
      provider_refund_id: providerRefundId,
    },
  });

  revalidatePath(`/admin/orders/${data.orderId}`);
}

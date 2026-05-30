"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";

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
        maybeSingle: () => Promise<{ data: { id: string } | null }>;
      };
    };
  };
};

export async function updateOrderStatus(formData: FormData) {
  await requireStaff();
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

  revalidatePath(`/admin/orders/${data.orderId}`);
  revalidatePath("/admin/orders");
}

export async function upsertShipment(formData: FormData) {
  await requireStaff();
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
    .select("id")
    .eq("order_id", data.orderId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("shipments").update(row).eq("id", existing.id);
    if (error) throw new Error(error.message ?? "shipment_update_failed");
  } else {
    const { error } = await supabase
      .from("shipments")
      .insert({ order_id: data.orderId, ...row });
    if (error) throw new Error(error.message ?? "shipment_insert_failed");
  }

  revalidatePath(`/admin/orders/${data.orderId}`);
}

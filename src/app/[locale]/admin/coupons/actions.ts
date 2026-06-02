"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { FormState } from "@/lib/form-state";

const CouponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .transform((v) => v.toUpperCase()),
  type: z.enum(["percent", "fixed"]),
  value: z.coerce.number().int().min(1).max(1_000_000),
  min_subtotal_cents: z.coerce.number().int().min(0).max(10_000_000).default(0),
});

type LooseClient = {
  from: (t: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { code?: string; message?: string } | null }>;
    update: (row: Record<string, unknown>) => {
      eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>;
    };
  };
};

export async function createCoupon(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("coupons.write");
    const data = CouponSchema.parse({
      code: formData.get("code"),
      type: formData.get("type"),
      value: formData.get("value"),
      min_subtotal_cents: formData.get("min_subtotal_cents") || 0,
    });

    if (data.type === "percent" && data.value > 100) {
      return { error: "Un pourcentage ne peut pas dépasser 100." };
    }

    const supabase = (await createClient()) as unknown as LooseClient;
    const { error } = await supabase.from("coupons").insert({
      code: data.code,
      type: data.type,
      value: data.value,
      min_subtotal_cents: data.min_subtotal_cents,
      active: true,
    });
    if (error) {
      if (error.code === "23505") return { error: "Ce code existe déjà." };
      return { error: "Création impossible." };
    }
    await logAudit({
      actorId: actor.id,
      action: "coupon.create",
      entity: "coupon",
      data: { code: data.code, type: data.type, value: data.value },
    });
    revalidatePath("/admin/coupons");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "forbidden" || msg === "unauthorized")
      return { error: "Action non autorisée." };
    return { error: "Champs invalides." };
  }
}

export async function toggleCoupon(formData: FormData) {
  const actor = await requirePermission("coupons.write");
  const id = z.string().uuid().parse(formData.get("id"));
  const active = formData.get("active") === "true";
  const supabase = (await createClient()) as unknown as LooseClient;
  const { error } = await supabase
    .from("coupons")
    .update({ active: !active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message ?? "toggle_failed");
  await logAudit({
    actorId: actor.id,
    action: "coupon.toggle",
    entity: "coupon",
    entityId: id,
    data: { active: !active },
  });
  revalidatePath("/admin/coupons");
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";

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

export async function createCoupon(formData: FormData) {
  await requireStaff();
  const data = CouponSchema.parse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    min_subtotal_cents: formData.get("min_subtotal_cents") || 0,
  });

  if (data.type === "percent" && data.value > 100) {
    throw new Error("percent_out_of_range");
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
    if (error.code === "23505") throw new Error("Ce code existe déjà.");
    throw new Error(error.message ?? "create_failed");
  }
  revalidatePath("/admin/coupons");
}

export async function toggleCoupon(formData: FormData) {
  await requireStaff();
  const id = z.string().uuid().parse(formData.get("id"));
  const active = formData.get("active") === "true";
  const supabase = (await createClient()) as unknown as LooseClient;
  const { error } = await supabase
    .from("coupons")
    .update({ active: !active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message ?? "toggle_failed");
  revalidatePath("/admin/coupons");
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const SiteSchema = z.object({
  name: z.string().trim().min(1).max(80),
  supportEmail: z.string().trim().email().max(200),
});

const ShippingSchema = z.object({
  freeAbove: z.coerce.number().int().min(0).max(1_000_000),
  flatRate: z.coerce.number().int().min(0).max(100_000),
});

type UpsertClient = {
  from: (t: string) => {
    upsert: (
      row: Record<string, unknown>,
      opts?: { onConflict?: string },
    ) => Promise<{ error: { message?: string } | null }>;
  };
};

async function saveKey(key: string, value: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await (supabase as unknown as UpsertClient)
    .from("shop_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message ?? "save_failed");
  revalidatePath("/admin/settings");
}

export async function saveSite(formData: FormData) {
  const actor = await requireStaff();
  const data = SiteSchema.parse({
    name: formData.get("name"),
    supportEmail: formData.get("supportEmail"),
  });
  await saveKey("site", data);
  await logAudit({
    actorId: actor.id,
    action: "settings.update",
    entity: "shop_settings",
    entityId: "site",
    data,
  });
}

export async function saveShipping(formData: FormData) {
  const actor = await requireStaff();
  const data = ShippingSchema.parse({
    freeAbove: formData.get("freeAbove"),
    flatRate: formData.get("flatRate"),
  });
  await saveKey("shipping", data);
  await logAudit({
    actorId: actor.id,
    action: "settings.update",
    entity: "shop_settings",
    entityId: "shipping",
    data,
  });
}

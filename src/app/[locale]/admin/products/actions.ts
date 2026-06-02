"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import type { FormState } from "@/lib/form-state";
import { logAudit } from "@/lib/audit";

const ProductSchema = z.object({
  name_fr: z.string().trim().min(1).max(200),
  name_en: z.string().trim().max(200).optional().nullable(),
  brand: z.string().trim().max(120).optional().nullable(),
  slug: z.string().trim().max(200).optional().nullable(),
  supplier_id: z.string().uuid().optional().or(z.literal("")).nullable(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
});

const StatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "active", "archived"]),
});

type LooseClient = {
  from: (t: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { code?: string; message?: string } | null }>;
    update: (row: Record<string, unknown>) => {
      eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>;
    };
  };
};

export async function createProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("products.write");
    const data = ProductSchema.parse({
      name_fr: formData.get("name_fr"),
      name_en: (formData.get("name_en") as string) || null,
      brand: (formData.get("brand") as string) || null,
      slug: (formData.get("slug") as string) || null,
      supplier_id: (formData.get("supplier_id") as string) || null,
      status: formData.get("status") || "draft",
    });

    const slug = (data.slug && slugify(data.slug)) || slugify(data.name_fr);
    if (!slug) return { error: "Nom ou slug invalide." };

    const name_i18n: Record<string, string> = { fr: data.name_fr };
    if (data.name_en) name_i18n.en = data.name_en;

    const supabase = (await createClient()) as unknown as LooseClient;
    const { error } = await supabase.from("products").insert({
      slug,
      name_i18n,
      brand: data.brand,
      supplier_id: data.supplier_id || null,
      status: data.status,
    });
    if (error) {
      if (error.code === "23505")
        return { error: "Un produit avec ce slug existe déjà." };
      return { error: "Création impossible." };
    }
    await logAudit({
      actorId: actor.id,
      action: "product.create",
      entity: "product",
      data: { slug, status: data.status },
    });
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "forbidden" || msg === "unauthorized")
      return { error: "Action non autorisée." };
    return { error: "Champs invalides." };
  }
}

export async function setProductStatus(formData: FormData) {
  const actor = await requirePermission("products.write");
  const data = StatusSchema.parse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  const supabase = (await createClient()) as unknown as LooseClient;
  const { error } = await supabase
    .from("products")
    .update({ status: data.status, updated_at: new Date().toISOString() })
    .eq("id", data.id);
  if (error) throw new Error(error.message ?? "status_failed");
  await logAudit({
    actorId: actor.id,
    action: "product.status_change",
    entity: "product",
    entityId: data.id,
    data: { status: data.status },
  });
  revalidatePath("/admin/products");
}

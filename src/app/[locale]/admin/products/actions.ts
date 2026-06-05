"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import type { FormState } from "@/lib/form-state";
import { logAudit } from "@/lib/audit";
import { autoTranslate } from "@/lib/translate";

const ProductSchema = z.object({
  name_fr: z.string().trim().min(1).max(200),
  name_en: z.string().trim().max(200).optional().nullable(),
  brand: z.string().trim().max(120).optional().nullable(),
  slug: z.string().trim().max(200).optional().nullable(),
  supplier_id: z.string().uuid().optional().or(z.literal("")).nullable(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  // Optional first variant so a product can be sellable right away.
  price: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  sku: z.string().trim().max(120).optional().nullable(),
});

const StatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "active", "archived"]),
});

type Result = { error: { code?: string; message?: string } | null; data?: unknown };
type Chain = {
  insert: (row: Record<string, unknown>) => Chain;
  update: (row: Record<string, unknown>) => Chain;
  delete: () => Chain;
  select: (q: string) => Chain;
  eq: (k: string, v: string) => Chain;
  in: (k: string, v: string[]) => Chain;
  single: () => Promise<Result>;
} & Promise<Result>;
type LooseClient = { from: (t: string) => Chain };

export async function createProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("products.write");
    const priceRaw = ((formData.get("price") as string) || "").trim();
    const data = ProductSchema.parse({
      name_fr: formData.get("name_fr"),
      name_en: (formData.get("name_en") as string) || null,
      brand: (formData.get("brand") as string) || null,
      slug: (formData.get("slug") as string) || null,
      supplier_id: (formData.get("supplier_id") as string) || null,
      status: formData.get("status") || "draft",
      price: priceRaw || null,
      sku: (formData.get("sku") as string) || null,
    });

    const slug = (data.slug && slugify(data.slug)) || slugify(data.name_fr);
    if (!slug) return { error: "Nom ou slug invalide." };

    // A product can't be published without a sellable variant.
    if (data.status === "active" && data.price == null) {
      return { error: "Pour publier (active), renseigne un prix (crée la 1ʳᵉ variante)." };
    }

    // Auto-translate the name into the other locales — the admin only ever
    // types one name. Falls back to the source text when DEEPL_API_KEY is unset.
    const translated = await autoTranslate(data.name_fr, "fr", ["en", "es", "de"]);
    const name_i18n: Record<string, string> = { fr: data.name_fr, ...translated };
    if (data.name_en) name_i18n.en = data.name_en; // explicit override wins

    const supabase = (await createClient()) as unknown as LooseClient;
    const { data: created, error } = await supabase
      .from("products")
      .insert({
        slug,
        name_i18n,
        brand: data.brand,
        supplier_id: data.supplier_id || null,
        status: data.status,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return { error: "Un produit avec ce slug existe déjà." };
      return { error: "Création impossible." };
    }
    const newId = (created as { id: string } | null)?.id;

    // Optional first variant (makes the product sellable immediately).
    if (newId && data.price != null) {
      const sku = (data.sku && data.sku.trim()) || `${slug.toUpperCase().slice(0, 90)}-DEFAULT`;
      const { error: vErr } = await supabase.from("product_variants").insert({
        product_id: newId,
        sku,
        price_cents: Math.round(data.price * 100),
        option_values: {},
        active: true,
      });
      if (vErr && vErr.code === "23505") {
        return { error: "Produit créé, mais le SKU existe déjà — ajoute la variante depuis la fiche." };
      }
    }

    await logAudit({
      actorId: actor.id,
      action: "product.create",
      entity: "product",
      entityId: newId,
      data: { slug, status: data.status, withVariant: data.price != null },
    });
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "forbidden" || msg === "unauthorized") return { error: "Action non autorisée." };
    return { error: "Champs invalides." };
  }
}

export async function setProductStatus(formData: FormData): Promise<void> {
  try {
    const actor = await requirePermission("products.write");
    const data = StatusSchema.parse({
      id: formData.get("id"),
      status: formData.get("status"),
    });
    const supabase = (await createClient()) as unknown as LooseClient;
    await supabase
      .from("products")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    await logAudit({
      actorId: actor.id,
      action: "product.status_change",
      entity: "product",
      entityId: data.id,
      data: { status: data.status },
    });
    revalidatePath("/admin/products");
  } catch {
    /* swallow — best-effort row action */
  }
}

/** Bulk status change for the selected products (best-effort, audited). */
export async function bulkSetStatus(formData: FormData): Promise<void> {
  try {
    const actor = await requirePermission("products.write");
    const status = z.enum(["draft", "active", "archived"]).parse(formData.get("status"));
    const ids = formData
      .getAll("ids")
      .map(String)
      .filter((v) => /^[0-9a-f-]{36}$/i.test(v));
    if (ids.length === 0) return;
    const supabase = (await createClient()) as unknown as LooseClient;
    await supabase
      .from("products")
      .update({ status, updated_at: new Date().toISOString() })
      .in("id", ids);
    await logAudit({
      actorId: actor.id,
      action: "product.bulk_status",
      entity: "product",
      data: { status, count: ids.length },
    });
    revalidatePath("/admin/products");
  } catch {
    /* swallow */
  }
}

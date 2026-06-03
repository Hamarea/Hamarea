"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { routing } from "@/i18n/routing";
import type { FormState } from "@/lib/form-state";
import { randomUUID } from "node:crypto";

type Result = { data: unknown; error: { message?: string; code?: string } | null };
type Chain = {
  select: (q?: string, opts?: Record<string, unknown>) => Chain;
  eq: (k: string, v: string | number | boolean) => Chain;
  order: (k: string, o: { ascending: boolean }) => Chain;
  limit: (n: number) => Chain;
  maybeSingle: () => Promise<Result>;
  single: () => Promise<Result>;
  insert: (row: Record<string, unknown> | Record<string, unknown>[]) => Chain;
  update: (row: Record<string, unknown>) => Chain;
  delete: () => Chain;
  upsert: (row: Record<string, unknown>, opts?: Record<string, unknown>) => Chain;
} & Promise<Result>;
type DB = { from: (t: string) => Chain };

const db = async () => (await createClient()) as unknown as DB;
const revalidate = (productId: string) => {
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
};
const ok = (): FormState => ({ ok: true });
const err = (m: string): FormState => ({ error: m });

/** Collect a `{ fr, en, es, de }` map from form fields named `<prefix>_<locale>`. */
function i18nFromForm(fd: FormData, prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const loc of routing.locales) {
    const v = ((fd.get(`${prefix}_${loc}`) as string | null) ?? "").trim();
    if (v) out[loc] = v;
  }
  return out;
}

/** Map a permission/validation throw to a friendly inline message. */
function toMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "forbidden" || msg === "unauthorized") return "Action non autorisée.";
  if (msg.startsWith("VISIBLE:")) return msg.slice(8);
  return "Champs invalides.";
}

// --- Product core ----------------------------------------------------------
const ProductSchema = z.object({
  id: z.string().uuid(),
  brand: z.string().trim().max(120).optional().nullable(),
  slug: z.string().trim().min(1).max(200),
  status: z.enum(["draft", "active", "archived"]),
  category_id: z.string().uuid().optional().or(z.literal("")).nullable(),
  supplier_id: z.string().uuid().optional().or(z.literal("")).nullable(),
});

export async function updateProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("products.write");
    const base = ProductSchema.parse({
      id: formData.get("id"),
      brand: (formData.get("brand") as string) || null,
      slug: formData.get("slug"),
      status: formData.get("status"),
      category_id: (formData.get("category_id") as string) || null,
      supplier_id: (formData.get("supplier_id") as string) || null,
    });

    const name_i18n = i18nFromForm(formData, "name");
    if (!name_i18n.fr) return err("Le nom FR est obligatoire.");
    const description_i18n = i18nFromForm(formData, "description");
    const seo = {
      title: i18nFromForm(formData, "seo_title"),
      description: i18nFromForm(formData, "seo_description"),
    };

    const sb = await db();

    // Guard: don't publish a product that has no active variant (not sellable).
    if (base.status === "active") {
      const { data: actives } = await sb
        .from("product_variants")
        .select("id")
        .eq("product_id", base.id)
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      if (!actives) {
        return err(
          "Publication impossible : ajoute au moins une variante active (avec un prix) avant de passer en « active ».",
        );
      }
    }

    const { error } = await sb
      .from("products")
      .update({
        name_i18n,
        description_i18n,
        seo,
        brand: base.brand,
        slug: slugify(base.slug) || base.slug,
        status: base.status,
        category_id: base.category_id || null,
        supplier_id: base.supplier_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", base.id);
    if (error) {
      if (error.code === "23505") return err("Ce slug est déjà utilisé.");
      return err("Enregistrement impossible.");
    }

    await logAudit({
      actorId: actor.id,
      action: "product.update",
      entity: "product",
      entityId: base.id,
      data: { slug: base.slug, status: base.status },
    });
    revalidate(base.id);
    return ok();
  } catch (e) {
    return err(toMessage(e));
  }
}

// --- Variants --------------------------------------------------------------
const VariantSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  sku: z.string().trim().min(1).max(120),
  price: z.coerce.number().min(0).max(1_000_000),
  compareAt: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  cost: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  barcode: z.string().trim().max(120).optional().nullable(),
  weight: z.coerce.number().int().min(0).max(1_000_000).optional().nullable(),
  optionName: z.string().trim().max(60).optional().nullable(),
  optionValue: z.string().trim().max(120).optional().nullable(),
  active: z.boolean().default(true),
});

function parseVariant(formData: FormData) {
  const toNum = (k: string) => {
    const v = (formData.get(k) as string | null)?.trim();
    return v ? v : null;
  };
  return VariantSchema.parse({
    productId: formData.get("productId"),
    variantId: (formData.get("variantId") as string) || null,
    sku: formData.get("sku"),
    price: formData.get("price"),
    compareAt: toNum("compareAt"),
    cost: toNum("cost"),
    barcode: (formData.get("barcode") as string) || null,
    weight: toNum("weight"),
    optionName: (formData.get("optionName") as string) || null,
    optionValue: (formData.get("optionValue") as string) || null,
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
}

/** Build a structured option_values map; falls back to a free `label`. */
function buildOptions(name?: string | null, value?: string | null) {
  if (name && value) return { [name]: value };
  if (value) return { label: value };
  return {};
}

const cents = (n: number) => Math.round(n * 100);

export async function createVariant(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("products.write");
    const d = parseVariant(formData);
    const sb = await db();
    const { error } = await sb.from("product_variants").insert({
      product_id: d.productId,
      sku: d.sku,
      price_cents: cents(d.price),
      compare_at_price_cents: d.compareAt != null ? cents(d.compareAt) : null,
      cost_cents: d.cost != null ? cents(d.cost) : null,
      barcode: d.barcode,
      weight_g: d.weight ?? null,
      option_values: buildOptions(d.optionName, d.optionValue),
      active: d.active,
    });
    if (error) {
      if (error.code === "23505") return err("Ce SKU existe déjà.");
      return err("Création de variante impossible.");
    }
    await logAudit({
      actorId: actor.id,
      action: "variant.create",
      entity: "product",
      entityId: d.productId,
      data: { sku: d.sku, price_cents: cents(d.price) },
    });
    revalidate(d.productId);
    return ok();
  } catch (e) {
    return err(toMessage(e));
  }
}

export async function updateVariant(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("products.write");
    const d = parseVariant(formData);
    if (!d.variantId) return err("Variante introuvable.");
    const sb = await db();
    const { error } = await sb
      .from("product_variants")
      .update({
        sku: d.sku,
        price_cents: cents(d.price),
        compare_at_price_cents: d.compareAt != null ? cents(d.compareAt) : null,
        cost_cents: d.cost != null ? cents(d.cost) : null,
        barcode: d.barcode,
        weight_g: d.weight ?? null,
        option_values: buildOptions(d.optionName, d.optionValue),
        active: d.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", d.variantId);
    if (error) {
      if (error.code === "23505") return err("Ce SKU existe déjà.");
      return err("Enregistrement de la variante impossible.");
    }
    await logAudit({
      actorId: actor.id,
      action: "variant.update",
      entity: "variant",
      entityId: d.variantId,
      data: { sku: d.sku, price_cents: cents(d.price) },
    });
    revalidate(d.productId);
    return ok();
  } catch (e) {
    return err(toMessage(e));
  }
}

/** Best-effort row action (plain form): never throws to the error boundary. */
export async function deleteVariant(formData: FormData): Promise<void> {
  try {
    const actor = await requirePermission("products.write");
    const productId = z.string().uuid().parse(formData.get("productId"));
    const variantId = z.string().uuid().parse(formData.get("variantId"));
    const sb = await db();
    await sb.from("product_variants").delete().eq("id", variantId);
    await logAudit({
      actorId: actor.id,
      action: "variant.delete",
      entity: "variant",
      entityId: variantId,
    });
    revalidate(productId);
  } catch {
    /* swallow — UI re-renders unchanged */
  }
}

// --- Inventory (manual stock) ----------------------------------------------
const InventorySchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0).max(1_000_000),
  reorder_point: z.coerce.number().int().min(0).max(1_000_000).default(5),
});

export async function setInventory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("products.write");
    const d = InventorySchema.parse({
      productId: formData.get("productId"),
      variantId: formData.get("variantId"),
      quantity: formData.get("quantity"),
      reorder_point: formData.get("reorder_point") || 5,
    });

    const sb = await db();
    const { data: wh } = await sb
      .from("warehouses")
      .select("id")
      .eq("is_default", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const warehouseId = (wh as { id: string } | null)?.id;
    if (!warehouseId) return err("Aucun entrepôt par défaut défini.");

    const { data: cur } = await sb
      .from("inventory")
      .select("quantity")
      .eq("variant_id", d.variantId)
      .eq("warehouse_id", warehouseId)
      .maybeSingle();
    const previous = (cur as { quantity: number } | null)?.quantity ?? 0;
    const delta = d.quantity - previous;

    const { error } = await sb.from("inventory").upsert(
      {
        variant_id: d.variantId,
        warehouse_id: warehouseId,
        quantity: d.quantity,
        reorder_point: d.reorder_point,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "variant_id,warehouse_id" },
    );
    if (error) return err("Mise à jour du stock impossible.");

    if (delta !== 0) {
      await sb.from("stock_movements").insert({
        variant_id: d.variantId,
        warehouse_id: warehouseId,
        delta,
        reason: "adjustment",
        note: "réglage manuel (admin)",
        created_by: actor.id,
      });
    }
    await logAudit({
      actorId: actor.id,
      action: "inventory.set",
      entity: "variant",
      entityId: d.variantId,
      data: { quantity: d.quantity, delta, reorder_point: d.reorder_point },
    });
    revalidate(d.productId);
    return ok();
  } catch (e) {
    return err(toMessage(e));
  }
}

// --- Images ----------------------------------------------------------------
const BUCKET = "product-images";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

/** Next free position for a product's images (max + 1). */
async function nextImagePosition(sb: DB, productId: string): Promise<number> {
  const { data } = await sb
    .from("product_images")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const max = (data as { position: number } | null)?.position;
  return typeof max === "number" ? max + 1 : 0;
}

const ImageSchema = z.object({
  productId: z.string().uuid(),
  url: z.string().trim().url().max(1000),
  alt_fr: z.string().trim().max(200).optional().nullable(),
  alt_en: z.string().trim().max(200).optional().nullable(),
});

export async function addImage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("products.write");
    const d = ImageSchema.parse({
      productId: formData.get("productId"),
      url: formData.get("url"),
      alt_fr: (formData.get("alt_fr") as string) || null,
      alt_en: (formData.get("alt_en") as string) || null,
    });
    const sb = await db();
    const alt_i18n: Record<string, string> = {};
    if (d.alt_fr) alt_i18n.fr = d.alt_fr;
    if (d.alt_en) alt_i18n.en = d.alt_en;
    const { error } = await sb.from("product_images").insert({
      product_id: d.productId,
      storage_path: d.url,
      alt_i18n,
      position: await nextImagePosition(sb, d.productId),
    });
    if (error) return err("Ajout de l'image impossible.");
    await logAudit({ actorId: actor.id, action: "image.add", entity: "product", entityId: d.productId });
    revalidate(d.productId);
    return ok();
  } catch (e) {
    return err(toMessage(e));
  }
}

export async function uploadImage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("products.write");
    const productId = z.string().uuid().parse(formData.get("productId"));
    const altFr = ((formData.get("alt_fr") as string) || "").trim();

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return err("Aucun fichier sélectionné.");
    if (file.size > 5_000_000) return err("Fichier trop volumineux (max 5 Mo).");
    if (!ALLOWED_TYPES.includes(file.type)) return err("Format non supporté (JPEG, PNG, WebP, AVIF, GIF).");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return err("Stockage non configuré (SUPABASE_SERVICE_ROLE_KEY).");

    const ext =
      (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${productId}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const admin = createAdminClient();
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (upErr) return err("Téléversement impossible.");

    const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const sb = await db();
    const { error } = await sb.from("product_images").insert({
      product_id: productId,
      storage_path: publicUrl,
      alt_i18n: altFr ? { fr: altFr } : {},
      position: await nextImagePosition(sb, productId),
    });
    if (error) return err("Enregistrement de l'image impossible.");

    await logAudit({ actorId: actor.id, action: "image.upload", entity: "product", entityId: productId });
    revalidate(productId);
    return ok();
  } catch (e) {
    return err(toMessage(e));
  }
}

/** Delete an image row AND the underlying Storage object (if it lives in our bucket). */
export async function deleteImage(formData: FormData): Promise<void> {
  try {
    const actor = await requirePermission("products.write");
    const productId = z.string().uuid().parse(formData.get("productId"));
    const imageId = z.string().uuid().parse(formData.get("imageId"));
    const storagePath = (formData.get("storagePath") as string) || "";

    const sb = await db();
    await sb.from("product_images").delete().eq("id", imageId);

    // Remove the file from Storage when it's one we uploaded (public URL into our bucket).
    const marker = `/object/public/${BUCKET}/`;
    const idx = storagePath.indexOf(marker);
    if (idx !== -1 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const objectPath = decodeURIComponent(storagePath.slice(idx + marker.length));
      try {
        await createAdminClient().storage.from(BUCKET).remove([objectPath]);
      } catch {
        /* file already gone / external URL — ignore */
      }
    }
    await logAudit({ actorId: actor.id, action: "image.delete", entity: "product", entityId: productId });
    revalidate(productId);
  } catch {
    /* swallow */
  }
}

/** Reorder an image up/down by swapping `position` with its neighbour. */
export async function reorderImage(formData: FormData): Promise<void> {
  try {
    await requirePermission("products.write");
    const productId = z.string().uuid().parse(formData.get("productId"));
    const imageId = z.string().uuid().parse(formData.get("imageId"));
    const dir = formData.get("dir") === "up" ? "up" : "down";

    const sb = await db();
    const { data } = await sb
      .from("product_images")
      .select("id, position")
      .eq("product_id", productId)
      .order("position", { ascending: true });
    const list = ((data as { id: string; position: number }[] | null) ?? []).slice();
    const i = list.findIndex((x) => x.id === imageId);
    if (i === -1) return;
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return;

    const a = list[i];
    const b = list[j];
    await sb.from("product_images").update({ position: b.position }).eq("id", a.id);
    await sb.from("product_images").update({ position: a.position }).eq("id", b.id);
    revalidate(productId);
  } catch {
    /* swallow */
  }
}

// --- Duplicate -------------------------------------------------------------
type DupVariant = {
  sku: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  cost_cents: number | null;
  barcode: string | null;
  weight_g: number | null;
  option_values: Record<string, unknown> | null;
  position: number;
  active: boolean;
};
type DupImage = { storage_path: string; alt_i18n: Record<string, string> | null; position: number };
type DupProduct = {
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string> | null;
  seo: Record<string, unknown> | null;
  brand: string | null;
  category_id: string | null;
  supplier_id: string | null;
  product_variants: DupVariant[];
  product_images: DupImage[];
};

/** Clone a product (as draft) with its variants & image references. New SKUs/slug. */
export async function duplicateProduct(formData: FormData): Promise<void> {
  try {
    const actor = await requirePermission("products.write");
    const id = z.string().uuid().parse(formData.get("id"));
    const sb = await db();
    const { data } = await sb
      .from("products")
      .select(
        "name_i18n, description_i18n, seo, brand, category_id, supplier_id, product_variants(sku, price_cents, compare_at_price_cents, cost_cents, barcode, weight_g, option_values, position, active), product_images(storage_path, alt_i18n, position)",
      )
      .eq("id", id)
      .maybeSingle();
    const p = data as DupProduct | null;
    if (!p) return;

    const suffix = randomUUID().slice(0, 6);
    const baseSlug = slugify((p.name_i18n?.fr ?? "produit") + "-copie-" + suffix);
    const name_i18n = { ...p.name_i18n };
    if (name_i18n.fr) name_i18n.fr = `${name_i18n.fr} (copie)`;

    const { data: created } = await sb
      .from("products")
      .insert({
        slug: baseSlug,
        name_i18n,
        description_i18n: p.description_i18n ?? {},
        seo: p.seo ?? {},
        brand: p.brand,
        category_id: p.category_id,
        supplier_id: p.supplier_id,
        status: "draft",
      })
      .select("id")
      .single();
    const newId = (created as { id: string } | null)?.id;
    if (!newId) return;

    for (const v of p.product_variants ?? []) {
      await sb.from("product_variants").insert({
        product_id: newId,
        sku: `${v.sku}-COPIE-${suffix}`,
        price_cents: v.price_cents,
        compare_at_price_cents: v.compare_at_price_cents,
        cost_cents: v.cost_cents,
        barcode: null, // barcodes are unique to a physical SKU — don't copy
        weight_g: v.weight_g,
        option_values: v.option_values ?? {},
        position: v.position,
        active: v.active,
      });
    }
    for (const img of p.product_images ?? []) {
      await sb.from("product_images").insert({
        product_id: newId,
        storage_path: img.storage_path,
        alt_i18n: img.alt_i18n ?? {},
        position: img.position,
      });
    }

    await logAudit({
      actorId: actor.id,
      action: "product.duplicate",
      entity: "product",
      entityId: newId,
      data: { from: id },
    });
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${newId}`);
  } catch {
    /* swallow */
  }
}

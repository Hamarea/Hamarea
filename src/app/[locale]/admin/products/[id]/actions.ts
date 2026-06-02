"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
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

// --- Product core ----------------------------------------------------------
const ProductSchema = z.object({
  id: z.string().uuid(),
  name_fr: z.string().trim().min(1).max(200),
  name_en: z.string().trim().max(200).optional().nullable(),
  description_fr: z.string().trim().max(5000).optional().nullable(),
  brand: z.string().trim().max(120).optional().nullable(),
  slug: z.string().trim().min(1).max(200),
  status: z.enum(["draft", "active", "archived"]),
  category_id: z.string().uuid().optional().or(z.literal("")).nullable(),
  supplier_id: z.string().uuid().optional().or(z.literal("")).nullable(),
});

export async function updateProduct(formData: FormData) {
  const actor = await requirePermission("products.write");
  const data = ProductSchema.parse({
    id: formData.get("id"),
    name_fr: formData.get("name_fr"),
    name_en: (formData.get("name_en") as string) || null,
    description_fr: (formData.get("description_fr") as string) || null,
    brand: (formData.get("brand") as string) || null,
    slug: formData.get("slug"),
    status: formData.get("status"),
    category_id: (formData.get("category_id") as string) || null,
    supplier_id: (formData.get("supplier_id") as string) || null,
  });

  const name_i18n: Record<string, string> = { fr: data.name_fr };
  if (data.name_en) name_i18n.en = data.name_en;
  const description_i18n: Record<string, string> = {};
  if (data.description_fr) description_i18n.fr = data.description_fr;

  const sb = await db();
  const { error } = await sb
    .from("products")
    .update({
      name_i18n,
      description_i18n,
      brand: data.brand,
      slug: slugify(data.slug) || data.slug,
      status: data.status,
      category_id: data.category_id || null,
      supplier_id: data.supplier_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);
  if (error) {
    if (error.code === "23505") throw new Error("Ce slug est déjà utilisé.");
    throw new Error(error.message ?? "update_failed");
  }

  await logAudit({
    actorId: actor.id,
    action: "product.update",
    entity: "product",
    entityId: data.id,
    data: { slug: data.slug, status: data.status },
  });
  revalidate(data.id);
}

// --- Variants --------------------------------------------------------------
const VariantSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string().trim().min(1).max(120),
  price: z.coerce.number().min(0).max(1_000_000),
  option: z.string().trim().max(120).optional().nullable(),
  active: z.boolean().default(true),
});

export async function createVariant(formData: FormData) {
  const actor = await requirePermission("products.write");
  const data = VariantSchema.parse({
    productId: formData.get("productId"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    option: (formData.get("option") as string) || null,
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  const sb = await db();
  const { error } = await sb.from("product_variants").insert({
    product_id: data.productId,
    sku: data.sku,
    price_cents: Math.round(data.price * 100),
    option_values: data.option ? { label: data.option } : {},
    active: data.active,
  });
  if (error) {
    if (error.code === "23505") throw new Error("Ce SKU existe déjà.");
    throw new Error(error.message ?? "variant_create_failed");
  }
  await logAudit({
    actorId: actor.id,
    action: "variant.create",
    entity: "product",
    entityId: data.productId,
    data: { sku: data.sku, price_cents: Math.round(data.price * 100) },
  });
  revalidate(data.productId);
}

const VariantUpdateSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  sku: z.string().trim().min(1).max(120),
  price: z.coerce.number().min(0).max(1_000_000),
  active: z.boolean().default(false),
});

export async function updateVariant(formData: FormData) {
  const actor = await requirePermission("products.write");
  const data = VariantUpdateSchema.parse({
    productId: formData.get("productId"),
    variantId: formData.get("variantId"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  const sb = await db();
  const { error } = await sb
    .from("product_variants")
    .update({
      sku: data.sku,
      price_cents: Math.round(data.price * 100),
      active: data.active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.variantId);
  if (error) {
    if (error.code === "23505") throw new Error("Ce SKU existe déjà.");
    throw new Error(error.message ?? "variant_update_failed");
  }
  await logAudit({
    actorId: actor.id,
    action: "variant.update",
    entity: "variant",
    entityId: data.variantId,
    data: { sku: data.sku, price_cents: Math.round(data.price * 100) },
  });
  revalidate(data.productId);
}

export async function deleteVariant(formData: FormData) {
  const actor = await requirePermission("products.write");
  const productId = z.string().uuid().parse(formData.get("productId"));
  const variantId = z.string().uuid().parse(formData.get("variantId"));
  const sb = await db();
  const { error } = await sb.from("product_variants").delete().eq("id", variantId);
  if (error) throw new Error(error.message ?? "variant_delete_failed");
  await logAudit({
    actorId: actor.id,
    action: "variant.delete",
    entity: "variant",
    entityId: variantId,
  });
  revalidate(productId);
}

// --- Inventory (manual stock) ----------------------------------------------
const InventorySchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0).max(1_000_000),
  reorder_point: z.coerce.number().int().min(0).max(1_000_000).default(5),
});

export async function setInventory(formData: FormData) {
  const actor = await requirePermission("products.write");
  const data = InventorySchema.parse({
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
  if (!warehouseId) throw new Error("Aucun entrepôt par défaut défini.");

  const { data: cur } = await sb
    .from("inventory")
    .select("quantity")
    .eq("variant_id", data.variantId)
    .eq("warehouse_id", warehouseId)
    .maybeSingle();
  const previous = (cur as { quantity: number } | null)?.quantity ?? 0;
  const delta = data.quantity - previous;

  const { error } = await sb.from("inventory").upsert(
    {
      variant_id: data.variantId,
      warehouse_id: warehouseId,
      quantity: data.quantity,
      reorder_point: data.reorder_point,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "variant_id,warehouse_id" },
  );
  if (error) throw new Error(error.message ?? "inventory_failed");

  if (delta !== 0) {
    await sb.from("stock_movements").insert({
      variant_id: data.variantId,
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
    entityId: data.variantId,
    data: { quantity: data.quantity, delta, reorder_point: data.reorder_point },
  });
  revalidate(data.productId);
}

// --- Images (by URL) -------------------------------------------------------
const ImageSchema = z.object({
  productId: z.string().uuid(),
  url: z.string().trim().url().max(1000),
  alt: z.string().trim().max(200).optional().nullable(),
  position: z.coerce.number().int().min(0).max(999).default(0),
});

export async function addImage(formData: FormData) {
  const actor = await requirePermission("products.write");
  const data = ImageSchema.parse({
    productId: formData.get("productId"),
    url: formData.get("url"),
    alt: (formData.get("alt") as string) || null,
    position: formData.get("position") || 0,
  });
  const sb = await db();
  const { error } = await sb.from("product_images").insert({
    product_id: data.productId,
    storage_path: data.url,
    alt_i18n: data.alt ? { fr: data.alt } : {},
    position: data.position,
  });
  if (error) throw new Error(error.message ?? "image_add_failed");
  await logAudit({
    actorId: actor.id,
    action: "image.add",
    entity: "product",
    entityId: data.productId,
  });
  revalidate(data.productId);
}

export async function deleteImage(formData: FormData) {
  const actor = await requirePermission("products.write");
  const productId = z.string().uuid().parse(formData.get("productId"));
  const imageId = z.string().uuid().parse(formData.get("imageId"));
  const sb = await db();
  const { error } = await sb.from("product_images").delete().eq("id", imageId);
  if (error) throw new Error(error.message ?? "image_delete_failed");
  await logAudit({
    actorId: actor.id,
    action: "image.delete",
    entity: "product",
    entityId: productId,
  });
  revalidate(productId);
}

// --- Image upload (Supabase Storage) ---------------------------------------
const BUCKET = "product-images";
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export async function uploadImage(formData: FormData) {
  const actor = await requirePermission("products.write");
  const productId = z.string().uuid().parse(formData.get("productId"));

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Aucun fichier sélectionné.");
  }
  if (file.size > 5_000_000) throw new Error("Fichier trop volumineux (max 5 Mo).");
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Format non supporté (JPEG, PNG, WebP, AVIF, GIF).");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Stockage non configuré (SUPABASE_SERVICE_ROLE_KEY).");
  }

  const ext =
    (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "jpg";
  const path = `${productId}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (upErr) throw new Error(upErr.message ?? "upload_failed");

  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const sb = await db();
  const { error } = await sb.from("product_images").insert({
    product_id: productId,
    storage_path: publicUrl,
    alt_i18n: {},
    position: 0,
  });
  if (error) throw new Error(error.message ?? "image_record_failed");

  await logAudit({
    actorId: actor.id,
    action: "image.upload",
    entity: "product",
    entityId: productId,
  });
  revalidate(productId);
}

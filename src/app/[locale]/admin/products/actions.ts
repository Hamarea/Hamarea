"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import type { FormState } from "@/lib/form-state";
import { logAudit } from "@/lib/audit";
import { autoTranslate } from "@/lib/translate";
import { randomUUID } from "node:crypto";

const BUCKET = "product-images";
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

const ProductSchema = z.object({
  name_fr: z.string().trim().min(1).max(200),
  name_en: z.string().trim().max(200).optional().nullable(),
  brand: z.string().trim().max(120).optional().nullable(),
  slug: z.string().trim().max(200).optional().nullable(),
  category_id: z.string().uuid().optional().or(z.literal("")).nullable(),
  supplier_id: z.string().uuid().optional().or(z.literal("")).nullable(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  // Optional first variant so a product can be sellable right away.
  price: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  sku: z.string().trim().max(120).optional().nullable(),
  // Optional short description + a first photo (file or URL), so a product can
  // be created COMPLETE (and publishable) in one step.
  description_fr: z.string().trim().max(5000).optional().nullable(),
  image_url: z.string().trim().url().max(1000).optional().or(z.literal("")).nullable(),
});

/** Map a thrown error to a precise, admin-friendly inline message. */
function toMessage(e: unknown): string {
  if (e instanceof z.ZodError) {
    const i = e.issues[0];
    const field = i?.path?.join(".") || "";
    return field ? `Champ « ${field} » invalide : ${i.message}.` : "Champs invalides.";
  }
  const msg = e instanceof Error ? e.message : "";
  if (msg === "forbidden" || msg === "unauthorized") return "Action non autorisée.";
  return "Une erreur inattendue est survenue.";
}

/**
 * Revalidate the admin list AND the public storefront (shop, product page,
 * home) so a published product appears in the catalog IMMEDIATELY — no
 * redeploy, no cache wait. This is what "connects" creation to the catalog.
 */
function revalidateCatalog() {
  revalidatePath("/admin/products");
  revalidatePath("/[locale]/products", "page");
  revalidatePath("/[locale]/products/[slug]", "page");
  revalidatePath("/[locale]", "page");
}

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
  let createdId: string | null = null;
  try {
    const actor = await requirePermission("products.write");
    const priceRaw = ((formData.get("price") as string) || "").trim();
    const data = ProductSchema.parse({
      name_fr: formData.get("name_fr"),
      name_en: (formData.get("name_en") as string) || null,
      brand: (formData.get("brand") as string) || null,
      slug: (formData.get("slug") as string) || null,
      category_id: (formData.get("category_id") as string) || null,
      supplier_id: (formData.get("supplier_id") as string) || null,
      status: formData.get("status") || "draft",
      price: priceRaw || null,
      sku: (formData.get("sku") as string) || null,
      description_fr: (formData.get("description_fr") as string) || null,
      image_url: (formData.get("image_url") as string) || null,
    });

    const slug = (data.slug && slugify(data.slug)) || slugify(data.name_fr);
    if (!slug) return { error: "Nom ou lien (slug) invalide." };

    // A product can't be published without a sellable variant.
    if (data.status === "active" && data.price == null) {
      return { error: "Pour publier (En ligne), renseignez un prix — il crée la 1ʳᵉ variante vendable." };
    }

    // Validate the optional photo UP FRONT, so we never half-create a product.
    const file = formData.get("file");
    const hasFile = file instanceof File && file.size > 0;
    if (hasFile) {
      if (file.size > 5_000_000) return { error: "Photo trop volumineuse (max 5 Mo)." };
      if (!ALLOWED_IMAGE_TYPES.includes(file.type))
        return { error: "Format de photo non supporté (JPEG, PNG, WebP, AVIF, GIF)." };
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
        return {
          error:
            "Stockage non configuré (SUPABASE_SERVICE_ROLE_KEY) — ajoutez la photo par URL, ou depuis la fiche.",
        };
    }

    // Auto-translate the name into the other locales — the admin only ever
    // types one name. Falls back to the source text when DEEPL_API_KEY is unset.
    const translated = await autoTranslate(data.name_fr, "fr", ["en", "es", "de"]);
    const name_i18n: Record<string, string> = { fr: data.name_fr, ...translated };
    if (data.name_en) name_i18n.en = data.name_en; // explicit override wins

    // Optional short description — translated the same way.
    let description_i18n: Record<string, string> = {};
    if (data.description_fr) {
      const dtr = await autoTranslate(data.description_fr, "fr", ["en", "es", "de"]);
      description_i18n = { fr: data.description_fr, ...dtr };
    }

    const preorder =
      formData.get("preorder") === "on" || formData.get("preorder") === "true";
    const featured =
      formData.get("featured") === "on" || formData.get("featured") === "true";

    const supabase = (await createClient()) as unknown as LooseClient;
    const { data: created, error } = await supabase
      .from("products")
      .insert({
        slug,
        name_i18n,
        description_i18n,
        brand: data.brand,
        category_id: data.category_id || null,
        supplier_id: data.supplier_id || null,
        status: data.status,
        preorder,
        featured,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return { error: "Un produit avec ce lien (slug) existe déjà — changez le nom." };
      // Surface the real cause (admin-only area) — e.g. a missing column from an
      // unapplied migration — instead of a misleading "Champs invalides".
      return { error: `Création impossible : ${error.message ?? "erreur base de données"}.` };
    }
    const newId = (created as { id: string } | null)?.id ?? null;
    if (!newId) return { error: "Création impossible (identifiant manquant)." };
    createdId = newId;

    // Optional first variant (makes the product sellable / publishable).
    if (data.price != null) {
      const sku = (data.sku && data.sku.trim()) || `${slug.toUpperCase().slice(0, 90)}-DEFAULT`;
      const { error: vErr } = await supabase.from("product_variants").insert({
        product_id: newId,
        sku,
        price_cents: Math.round(data.price * 100),
        option_values: {},
        active: true,
      });
      if (vErr) {
        await logAudit({
          actorId: actor.id,
          action: "product.create",
          entity: "product",
          entityId: newId,
          data: { slug, status: data.status, variantError: vErr.code ?? true },
        });
        revalidateCatalog();
        return vErr.code === "23505"
          ? { error: "Produit créé, mais ce SKU existe déjà — ajoutez la variante depuis la fiche." }
          : { error: "Produit créé, mais le prix (variante) a échoué — ajoutez-la depuis la fiche." };
      }
    }

    // Optional first photo: uploaded file (Storage) OR an external URL.
    let withImage = false;
    if (hasFile) {
      const ext =
        (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${newId}/${randomUUID()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const admin = createAdminClient();
      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType: file.type, upsert: false });
      if (!upErr) {
        const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        await supabase.from("product_images").insert({
          product_id: newId,
          storage_path: publicUrl,
          alt_i18n: { fr: data.name_fr },
          position: 0,
        });
        withImage = true;
      }
    } else if (data.image_url) {
      await supabase.from("product_images").insert({
        product_id: newId,
        storage_path: data.image_url,
        alt_i18n: { fr: data.name_fr },
        position: 0,
      });
      withImage = true;
    }

    await logAudit({
      actorId: actor.id,
      action: "product.create",
      entity: "product",
      entityId: newId,
      data: {
        slug,
        status: data.status,
        withVariant: data.price != null,
        withImage,
        category_id: data.category_id || null,
      },
    });
    revalidateCatalog();
  } catch (e) {
    return { error: toMessage(e) };
  }
  // Land the admin straight on the full product sheet (photos, description,
  // variantes, stock, SEO…). The create form is intentionally short.
  if (createdId) redirect(`/admin/products/${createdId}`);
  return { ok: true };
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
    revalidateCatalog();
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
    revalidateCatalog();
  } catch {
    /* swallow */
  }
}

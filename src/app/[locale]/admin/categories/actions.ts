"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { autoTranslate } from "@/lib/translate";
import type { FormState } from "@/lib/form-state";
import { randomUUID } from "node:crypto";

const BUCKET = "product-images";
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

type Result = { error: { code?: string; message?: string } | null };
type Chain = {
  insert: (row: Record<string, unknown>) => Chain;
  update: (row: Record<string, unknown>) => Chain;
  delete: () => Chain;
  eq: (k: string, v: string | boolean) => Chain;
} & Promise<Result>;
type LooseClient = { from: (t: string) => Chain };

const CategorySchema = z.object({
  name_fr: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(120).optional().nullable(),
  description_fr: z.string().trim().max(2000).optional().nullable(),
  image_url: z.string().trim().url().max(1000).optional().or(z.literal("")).nullable(),
});

/** Map a thrown error (permission / zod) to a readable inline message. */
function toMessage(e: unknown): string {
  if (e instanceof z.ZodError) {
    const i = e.issues[0];
    const field = i?.path?.join(".") || "";
    return field ? `Champ « ${field} » invalide : ${i.message}.` : "Champs invalides.";
  }
  const msg = e instanceof Error ? e.message : "";
  if (msg === "forbidden" || msg === "unauthorized") return "Action non autorisée.";
  if (msg.startsWith("VISIBLE:")) return msg.slice(8);
  return "Une erreur inattendue est survenue.";
}

/**
 * Revalidate the admin pages AND the public storefront, so a new/edited
 * category appears in the shop filter AND in the home "L'Univers" grid
 * immediately (no redeploy, no cache wait).
 */
function revalidateCatalog() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/[locale]/products", "page");
  revalidatePath("/[locale]", "page");
}

/**
 * Upload an optional category cover to Storage and return its public URL, or
 * `null` when there is no file. Throws a VISIBLE: message on a real problem so
 * the admin gets a precise reason (size / format / storage not configured).
 */
async function uploadCover(file: FormDataEntryValue | null): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > 5_000_000) throw new Error("VISIBLE:Image trop volumineuse (max 5 Mo).");
  if (!ALLOWED_IMAGE_TYPES.includes(file.type))
    throw new Error("VISIBLE:Format d'image non supporté (JPEG, PNG, WebP, AVIF, GIF).");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error(
      "VISIBLE:Stockage non configuré (SUPABASE_SERVICE_ROLE_KEY) — ajoutez l'image par URL.",
    );
  const ext =
    (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `categories/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (error) throw new Error("VISIBLE:Téléversement de l'image impossible.");
  return admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Build a translated i18n map from a single FR source ({} when empty). */
async function i18nFromFr(textFr: string | null | undefined): Promise<Record<string, string>> {
  const fr = (textFr ?? "").trim();
  if (!fr) return {};
  const translated = await autoTranslate(fr, "fr", ["en", "es", "de"]);
  return { fr, ...translated };
}

export async function createCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("products.write");
    const data = CategorySchema.parse({
      name_fr: formData.get("name_fr"),
      slug: (formData.get("slug") as string) || null,
      description_fr: (formData.get("description_fr") as string) || null,
      image_url: (formData.get("image_url") as string) || null,
    });

    const slug = (data.slug && slugify(data.slug)) || slugify(data.name_fr);
    if (!slug) return { error: "Nom ou lien (slug) invalide." };

    // Cover: uploaded file wins, else the optional URL.
    const uploaded = await uploadCover(formData.get("file"));
    const image_url = uploaded ?? (data.image_url || null);

    // The admin types ONE name/description (FR); other locales fill themselves.
    const name_i18n = { fr: data.name_fr, ...(await autoTranslate(data.name_fr, "fr", ["en", "es", "de"])) };
    const description_i18n = await i18nFromFr(data.description_fr);

    const supabase = (await createClient()) as unknown as LooseClient;
    const { error } = await supabase.from("categories").insert({
      slug,
      name_i18n,
      description_i18n,
      image_url,
      active: true,
    });
    if (error) {
      if (error.code === "23505") return { error: "Une catégorie avec ce lien existe déjà." };
      return { error: `Création impossible : ${error.message ?? "erreur base de données"}.` };
    }

    await logAudit({
      actorId: actor.id,
      action: "category.create",
      entity: "category",
      data: { slug, withImage: Boolean(image_url) },
    });
    revalidateCatalog();
    return { ok: true };
  } catch (e) {
    return { error: toMessage(e) };
  }
}

const UpdateSchema = CategorySchema.extend({ id: z.string().uuid() });

/** Edit a category: name, slug, description and (optionally replace) the cover. */
export async function updateCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("products.write");
    const data = UpdateSchema.parse({
      id: formData.get("id"),
      name_fr: formData.get("name_fr"),
      slug: (formData.get("slug") as string) || null,
      description_fr: (formData.get("description_fr") as string) || null,
      image_url: (formData.get("image_url") as string) || null,
    });

    const slug = (data.slug && slugify(data.slug)) || slugify(data.name_fr);
    if (!slug) return { error: "Nom ou lien (slug) invalide." };

    const name_i18n = { fr: data.name_fr, ...(await autoTranslate(data.name_fr, "fr", ["en", "es", "de"])) };
    const description_i18n = await i18nFromFr(data.description_fr);

    // Only touch image_url when the admin provides a new one (upload or URL);
    // otherwise the existing cover is preserved.
    const uploaded = await uploadCover(formData.get("file"));
    const newImage = uploaded ?? (data.image_url || null);

    const row: Record<string, unknown> = {
      slug,
      name_i18n,
      description_i18n,
      updated_at: new Date().toISOString(),
    };
    if (newImage) row.image_url = newImage;

    const supabase = (await createClient()) as unknown as LooseClient;
    const { error } = await supabase.from("categories").update(row).eq("id", data.id);
    if (error) {
      if (error.code === "23505") return { error: "Une catégorie avec ce lien existe déjà." };
      return { error: `Enregistrement impossible : ${error.message ?? "erreur base de données"}.` };
    }

    await logAudit({
      actorId: actor.id,
      action: "category.update",
      entity: "category",
      entityId: data.id,
      data: { slug, imageChanged: Boolean(newImage) },
    });
    revalidateCatalog();
    return { ok: true };
  } catch (e) {
    return { error: toMessage(e) };
  }
}

/** Show/hide a category in the storefront (best-effort row action). */
export async function setCategoryActive(formData: FormData): Promise<void> {
  try {
    const actor = await requirePermission("products.write");
    const id = z.string().uuid().parse(formData.get("id"));
    const active = formData.get("active") === "true";
    const supabase = (await createClient()) as unknown as LooseClient;
    await supabase
      .from("categories")
      .update({ active, updated_at: new Date().toISOString() })
      .eq("id", id);
    await logAudit({
      actorId: actor.id,
      action: "category.set_active",
      entity: "category",
      entityId: id,
      data: { active },
    });
    revalidateCatalog();
  } catch {
    /* swallow — UI re-renders unchanged */
  }
}

/**
 * Delete a category. Products keep existing — their `category_id` is set to
 * NULL by the FK (`on delete set null`), so nothing in the catalog is lost.
 */
export async function deleteCategory(formData: FormData): Promise<void> {
  try {
    const actor = await requirePermission("products.write");
    const id = z.string().uuid().parse(formData.get("id"));
    const supabase = (await createClient()) as unknown as LooseClient;
    await supabase.from("categories").delete().eq("id", id);
    await logAudit({
      actorId: actor.id,
      action: "category.delete",
      entity: "category",
      entityId: id,
    });
    revalidateCatalog();
  } catch {
    /* swallow */
  }
}

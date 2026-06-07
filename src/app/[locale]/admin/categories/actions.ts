"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { autoTranslate } from "@/lib/translate";
import type { FormState } from "@/lib/form-state";

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
  return "Une erreur inattendue est survenue.";
}

/**
 * Revalidate the admin pages AND the public storefront, so a new/edited
 * category appears in the shop filter immediately (no redeploy, no cache wait).
 */
function revalidateCatalog() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/[locale]/products", "page");
  revalidatePath("/[locale]", "page");
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
    });

    const slug = (data.slug && slugify(data.slug)) || slugify(data.name_fr);
    if (!slug) return { error: "Nom ou lien (slug) invalide." };

    // The admin types ONE name (FR); the other locales fill themselves.
    const translated = await autoTranslate(data.name_fr, "fr", ["en", "es", "de"]);
    const name_i18n: Record<string, string> = { fr: data.name_fr, ...translated };

    const supabase = (await createClient()) as unknown as LooseClient;
    const { error } = await supabase.from("categories").insert({
      slug,
      name_i18n,
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
      data: { slug },
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

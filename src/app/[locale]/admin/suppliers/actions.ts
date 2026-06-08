"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { FormState } from "@/lib/form-state";

const SupplierSchema = z.object({
  name: z.string().trim().min(1).max(160),
  contact_email: z.string().trim().email().max(200).optional().or(z.literal("")).nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase())
    .optional()
    .or(z.literal(""))
    .nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

type LooseClient = {
  from: (t: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
    update: (row: Record<string, unknown>) => {
      eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>;
    };
    delete: () => {
      eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>;
    };
  };
};

export async function createSupplier(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("suppliers.write");
    const data = SupplierSchema.parse({
      name: formData.get("name"),
      contact_email: (formData.get("contact_email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      country: (formData.get("country") as string) || null,
      notes: (formData.get("notes") as string) || null,
    });

    const supabase = (await createClient()) as unknown as LooseClient;
    const { error } = await supabase.from("suppliers").insert({
      name: data.name,
      contact_email: data.contact_email || null,
      phone: data.phone,
      country: data.country || null,
      notes: data.notes,
    });
    if (error) return { error: "Création impossible." };
    await logAudit({
      actorId: actor.id,
      action: "supplier.create",
      entity: "supplier",
      data: { name: data.name, country: data.country || null },
    });
    revalidatePath("/admin/suppliers");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "forbidden" || msg === "unauthorized")
      return { error: "Action non autorisée." };
    return { error: "Champs invalides." };
  }
}

export async function updateSupplier(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("suppliers.write");
    const data = SupplierSchema.extend({ id: z.string().uuid() }).parse({
      id: formData.get("id"),
      name: formData.get("name"),
      contact_email: (formData.get("contact_email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      country: (formData.get("country") as string) || null,
      notes: (formData.get("notes") as string) || null,
    });
    const supabase = (await createClient()) as unknown as LooseClient;
    const { error } = await supabase
      .from("suppliers")
      .update({
        name: data.name,
        contact_email: data.contact_email || null,
        phone: data.phone,
        country: data.country || null,
        notes: data.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) return { error: "Enregistrement impossible." };
    await logAudit({
      actorId: actor.id,
      action: "supplier.update",
      entity: "supplier",
      entityId: data.id,
      data: { name: data.name, country: data.country || null },
    });
    revalidatePath("/admin/suppliers");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "forbidden" || msg === "unauthorized")
      return { error: "Action non autorisée." };
    return { error: "Champs invalides." };
  }
}

export async function deleteSupplier(formData: FormData) {
  const actor = await requirePermission("suppliers.write");
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = (await createClient()) as unknown as LooseClient;
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw new Error(error.message ?? "delete_failed");
  await logAudit({
    actorId: actor.id,
    action: "supplier.delete",
    entity: "supplier",
    entityId: id,
  });
  revalidatePath("/admin/suppliers");
}

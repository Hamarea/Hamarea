"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

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
    delete: () => {
      eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>;
    };
  };
};

export async function createSupplier(formData: FormData) {
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
  if (error) throw new Error(error.message ?? "create_failed");
  await logAudit({
    actorId: actor.id,
    action: "supplier.create",
    entity: "supplier",
    data: { name: data.name, country: data.country || null },
  });
  revalidatePath("/admin/suppliers");
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

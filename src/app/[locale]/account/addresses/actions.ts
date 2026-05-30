"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

const AddressSchema = z.object({
  type: z.enum(["shipping", "billing"]).default("shipping"),
  full_name: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().min(1).max(120),
  zip: z.string().trim().min(1).max(20),
  state: z.string().trim().max(120).optional().nullable(),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase()),
  phone: z.string().trim().max(40).optional().nullable(),
  is_default: z.boolean().default(false),
});

type AddrClient = {
  from: (t: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
    update: (row: Record<string, unknown>) => {
      eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }> & {
        eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>;
      };
    };
    delete: () => {
      eq: (k: string, v: string) => {
        eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>;
      };
    };
  };
};

async function clearDefaults(sb: AddrClient, userId: string) {
  await sb.from("addresses").update({ is_default: false }).eq("user_id", userId);
}

export async function addAddress(formData: FormData) {
  const actor = await requireUser();
  const data = AddressSchema.parse({
    type: formData.get("type") || "shipping",
    full_name: formData.get("full_name"),
    line1: formData.get("line1"),
    line2: (formData.get("line2") as string) || null,
    city: formData.get("city"),
    zip: formData.get("zip"),
    state: (formData.get("state") as string) || null,
    country: formData.get("country"),
    phone: (formData.get("phone") as string) || null,
    is_default: formData.get("is_default") === "on",
  });

  const supabase = (await createClient()) as unknown as AddrClient;
  if (data.is_default) await clearDefaults(supabase, actor.id);

  const { error } = await supabase
    .from("addresses")
    .insert({ ...data, user_id: actor.id });
  if (error) throw new Error(error.message ?? "insert_failed");
  revalidatePath("/account/addresses");
}

export async function deleteAddress(formData: FormData) {
  const actor = await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = (await createClient()) as unknown as AddrClient;
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", actor.id);
  if (error) throw new Error(error.message ?? "delete_failed");
  revalidatePath("/account/addresses");
}

export async function setDefaultAddress(formData: FormData) {
  const actor = await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = (await createClient()) as unknown as AddrClient;
  await clearDefaults(supabase, actor.id);
  const { error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", actor.id);
  if (error) throw new Error(error.message ?? "update_failed");
  revalidatePath("/account/addresses");
}

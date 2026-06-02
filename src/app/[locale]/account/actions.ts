"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";

const ProfileSchema = z.object({
  full_name: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  locale: z.enum(["fr", "en", "es", "de"]).default("fr"),
  currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
  marketing_opt_in: z.boolean().default(false),
});

type UpdateClient = {
  from: (t: string) => {
    update: (row: Record<string, unknown>) => {
      eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>;
    };
  };
};

export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requireUser();

    const data = ProfileSchema.parse({
      full_name: (formData.get("full_name") as string) || null,
      phone: (formData.get("phone") as string) || null,
      locale: formData.get("locale") || "fr",
      currency: formData.get("currency") || "EUR",
      marketing_opt_in: formData.get("marketing_opt_in") === "on",
    });

    const supabase = await createClient();
    // Note: `role`/`id` are intentionally NOT writable here — the DB trigger
    // prevent_role_self_escalation (0010) enforces that at the source.
    const { error } = await (supabase as unknown as UpdateClient)
      .from("profiles")
      .update({
        full_name: data.full_name,
        phone: data.phone,
        locale: data.locale,
        currency: data.currency,
        marketing_opt_in: data.marketing_opt_in,
        updated_at: new Date().toISOString(),
      })
      .eq("id", actor.id);

    if (error) return { error: "Échec de l'enregistrement." };
    revalidatePath("/account");
    return { ok: true };
  } catch {
    return { error: "Une erreur est survenue. Réessaie." };
  }
}

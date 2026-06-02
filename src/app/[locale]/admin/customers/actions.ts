"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const RoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["customer", "staff", "admin"]),
});

type LooseClient = {
  from: (t: string) => {
    update: (row: Record<string, unknown>) => {
      eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>;
    };
  };
};

export async function setUserRole(input: { userId: string; role: string }) {
  const actor = await requireAdmin();
  const data = RoleSchema.parse(input);

  // Guard: an admin cannot change their own role (avoid self-lockout).
  if (data.userId === actor.id) throw new Error("cannot_change_own_role");

  const supabase = (await createClient()) as unknown as LooseClient;
  const { error } = await supabase
    .from("profiles")
    .update({ role: data.role, updated_at: new Date().toISOString() })
    .eq("id", data.userId);
  if (error) throw new Error(error.message ?? "role_update_failed");

  await logAudit({
    actorId: actor.id,
    action: "customer.role_change",
    entity: "profile",
    entityId: data.userId,
    data: { role: data.role },
  });

  revalidatePath("/admin/customers");
}

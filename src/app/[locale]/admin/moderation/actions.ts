"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";

const ModerateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected"]),
  note: z.string().max(2000).optional().nullable(),
});

export type ModerateInput = z.infer<typeof ModerateSchema>;

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { code?: string; message?: string } | null }>;
};

export async function moderateReview(input: ModerateInput) {
  await requirePermission("moderation.write");
  const data = ModerateSchema.parse(input);
  const supabase = await createClient();

  const { error } = await (supabase as unknown as RpcClient).rpc("moderate_review", {
    p_id: data.id,
    p_status: data.status,
    p_note: data.note ?? null,
  });

  if (error) {
    if (error.code === "PT002") throw new Error("forbidden");
    throw new Error(error.message ?? "moderation_failed");
  }

  revalidatePath("/admin/moderation");
  revalidatePath("/admin/reviews");
}

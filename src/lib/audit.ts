import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth";

type AuditInput = {
  action: string;
  entity?: string | null;
  entityId?: string | null;
  data?: Record<string, unknown> | null;
  /** Pass the actor id when the caller already resolved it (avoids a round-trip). */
  actorId?: string | null;
};

type InsertClient = {
  from: (t: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
  };
};

/**
 * Append an entry to `public.audit_logs`. Best-effort: never throws, so a logging
 * failure can never break the underlying admin action. Relies on the
 * `audit_logs_admin_all` RLS policy (admin/staff may insert) — callers are already
 * gated by requireStaff/requireAdmin before reaching this.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const actorId = input.actorId ?? (await getActor())?.id ?? null;

    let ip: string | null = null;
    try {
      const h = await headers();
      ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        null;
    } catch {
      // headers() unavailable (non-request scope) — skip IP.
    }

    const supabase = (await createClient()) as unknown as InsertClient;
    await supabase.from("audit_logs").insert({
      actor_id: actorId,
      action: input.action,
      entity: input.entity ?? null,
      entity_id: input.entityId ?? null,
      data: input.data ?? null,
      ip,
    });
  } catch (err) {
    console.error("[audit] log failed", err);
  }
}

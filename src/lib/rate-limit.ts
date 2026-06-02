import { createAdminClient } from "@/lib/supabase/admin";

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>;
};

/**
 * Fixed-window rate limiter backed by the `rate_limits` table + `rate_limit_hit`
 * RPC (migration 0012). Server-side only (service-role client).
 *
 * Returns true when the call is ALLOWED, false when the limit is exceeded.
 * Fail-open by design: if the backend is unavailable or the migration has not
 * been applied yet, the request is allowed (availability over strictness).
 */
export async function rateLimitHit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return true;
    const admin = createAdminClient() as unknown as RpcClient;
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

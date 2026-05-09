import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * In preview mode (no Supabase env vars), return a stub that mimics the parts
 * of the client we actually use: chained query builders that resolve to empty
 * results, and an auth.getUser() that returns no user. Lets the storefront and
 * admin UI render without throwing, with sample/empty data.
 */
function createStubClient() {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = () => builder;
  builder.insert = () => builder;
  builder.update = () => builder;
  builder.delete = () => builder;
  builder.eq = chain;
  builder.gt = chain;
  builder.gte = chain;
  builder.lt = chain;
  builder.lte = chain;
  builder.ilike = chain;
  builder.like = chain;
  builder.or = chain;
  builder.order = chain;
  builder.limit = chain;
  builder.range = chain;
  builder.maybeSingle = async () => ({ data: null, error: null, count: 0 });
  builder.single = async () => ({ data: null, error: null, count: 0 });
  // Awaiting the builder resolves to an empty list response.
  builder.then = (
    onFulfilled: (v: { data: unknown[]; error: null; count: number }) => unknown,
  ) => Promise.resolve({ data: [], error: null, count: 0 }).then(onFulfilled);

  return {
    from: () => builder,
    rpc: async () => ({ data: null, error: null }),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
  } as unknown as ReturnType<typeof createServerClient<Database>>;
}

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return createStubClient();

  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }>,
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — ignore (middleware handles refresh).
        }
      },
    },
  });
}

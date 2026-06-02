import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitHit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type LooseQuery = {
  from: (t: string) => {
    select: (q: string) => {
      eq: (
        k: string,
        v: string,
      ) => { maybeSingle: () => Promise<{ data: unknown }> } & Promise<{
        data: unknown;
      }>;
    };
  };
};

/**
 * RGPD — droit d'accès & portabilité (art. 15/20). Returns every personal
 * record tied to the signed-in user as a downloadable JSON file. Every query is
 * scoped by RLS to the current user, so a user can only ever export their own data.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Throttle exports: 5 / hour / user (fail-open).
  if (!(await rateLimitHit(`export:${user.id}`, 5, 3600))) {
    return NextResponse.json(
      { error: "Trop de demandes d'export. Réessaie plus tard." },
      { status: 429 },
    );
  }

  const sb = supabase as unknown as LooseQuery;
  const [profile, addresses, orders, wishlists, reviews] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    sb.from("addresses").select("*").eq("user_id", user.id),
    sb
      .from("orders")
      .select("*, order_items(*), shipments(*), payments(*)")
      .eq("user_id", user.id),
    sb.from("wishlists").select("*, wishlist_items(*)").eq("user_id", user.id),
    sb.from("reviews").select("*").eq("user_id", user.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email ?? null },
    profile: (profile as { data: unknown }).data ?? null,
    addresses: (addresses as { data: unknown }).data ?? [],
    orders: (orders as { data: unknown }).data ?? [],
    wishlists: (wishlists as { data: unknown }).data ?? [],
    reviews: (reviews as { data: unknown }).data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="hamarea-data-${user.id}.json"`,
    },
  });
}

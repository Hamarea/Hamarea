import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Row = {
  number: string;
  email: string;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
};

function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Staff-only CSV export of orders. */
export async function GET() {
  const actor = await getActor();
  if (!actor || (actor.role !== "admin" && actor.role !== "staff")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  const { data } = await (supabase as unknown as {
    from: (t: string) => {
      select: (q: string) => {
        order: (
          k: string,
          o: { ascending: boolean },
        ) => { limit: (n: number) => Promise<{ data: Row[] | null }> };
      };
    };
  })
    .from("orders")
    .select("number, email, status, total_cents, currency, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  const rows = data ?? [];
  const header = ["number", "email", "status", "total", "currency", "created_at"].join(",");
  const lines = rows.map((o) =>
    [
      cell(o.number),
      cell(o.email),
      cell(o.status),
      cell((o.total_cents / 100).toFixed(2)),
      cell(o.currency),
      cell(o.created_at),
    ].join(","),
  );
  const csv = [header, ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}

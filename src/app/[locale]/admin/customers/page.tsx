import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth";
import { CustomerRow, type CustomerView } from "./customer-row";

const PAGE_SIZE = 25;

type ListBuilder = {
  select: (q: string, opts?: { count?: "exact" }) => ListBuilder;
  or: (f: string) => ListBuilder;
  order: (k: string, o: { ascending: boolean }) => ListBuilder;
  range: (
    from: number,
    to: number,
  ) => Promise<{ data: CustomerView[] | null; count: number | null }>;
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const t = await getTranslations();
  const supabase = await createClient();
  const actor = await getActor();
  const canManage = actor?.role === "admin";
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let rows: CustomerView[] = [];
  let total = 0;
  try {
    let qb = (supabase as unknown as { from: (t: string) => ListBuilder })
      .from("profiles")
      .select("id, email, full_name, role, permissions, created_at", { count: "exact" });
    if (q) qb = qb.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
    const { data, count } = await qb
      .order("created_at", { ascending: false })
      .range(from, to);
    rows = data ?? [];
    total = count ?? 0;
  } catch {
    rows = [];
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const linkTo = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/customers${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">{t("admin.customers")}</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        {canManage
          ? "Vous pouvez promouvoir un client en staff ou admin."
          : "La gestion des rôles est réservée aux administrateurs."}
      </p>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Nom ou e-mail…"
          className="max-w-xs"
        />
        <Button type="submit">Rechercher</Button>
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-[var(--color-muted)]"
                >
                  Aucun client.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <CustomerRow
                  key={c.id}
                  customer={c}
                  canManage={canManage}
                  isSelf={c.id === actor?.id}
                />
              ))
            )}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span>
          {total} client(s) · page {page}/{totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={linkTo(page - 1) as never}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-bg)]"
            >
              ← Précédent
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={linkTo(page + 1) as never}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-bg)]"
            >
              Suivant →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

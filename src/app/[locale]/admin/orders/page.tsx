import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

type OrderRow = {
  id: string;
  number: string;
  email: string;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
};

const STATUS_VARIANT: Record<
  string,
  "default" | "success" | "warning" | "danger" | "secondary"
> = {
  pending: "warning",
  paid: "secondary",
  processing: "secondary",
  shipped: "default",
  delivered: "success",
  cancelled: "danger",
  refunded: "danger",
};

const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];
const PAGE_SIZE = 25;

type ListBuilder = {
  select: (q: string, opts?: { count?: "exact" }) => ListBuilder;
  or: (f: string) => ListBuilder;
  eq: (k: string, v: string) => ListBuilder;
  order: (k: string, o: { ascending: boolean }) => ListBuilder;
  range: (
    from: number,
    to: number,
  ) => Promise<{ data: OrderRow[] | null; count: number | null }>;
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const t = await getTranslations();
  const supabase = await createClient();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const status = ORDER_STATUSES.includes(sp.status ?? "") ? sp.status! : "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let orders: OrderRow[] = [];
  let total = 0;
  try {
    let qb = (supabase as unknown as { from: (t: string) => ListBuilder })
      .from("orders")
      .select(
        "id, number, email, status, total_cents, currency, created_at",
        { count: "exact" },
      );
    if (q) qb = qb.or(`number.ilike.%${q}%,email.ilike.%${q}%`);
    if (status) qb = qb.eq("status", status);
    const { data, count } = await qb
      .order("created_at", { ascending: false })
      .range(from, to);
    orders = data ?? [];
    total = count ?? 0;
  } catch {
    orders = [];
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const linkTo = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">{t("admin.orders")}</h1>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/admin/export/orders"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-bg)]"
        >
          Export CSV
        </a>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="N° de commande ou e-mail…"
          className="max-w-xs"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
        >
          <option value="">Tous les statuts</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`account.orderStatus.${s}` as never)}
            </option>
          ))}
        </select>
        <Button type="submit">Rechercher</Button>
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">N°</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-[var(--color-muted)]"
                >
                  Aucune commande.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/admin/orders/${o.id}` as never}
                      className="text-[var(--color-primary-600)] hover:underline"
                    >
                      {o.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{o.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[o.status] ?? "default"}>
                      {t(`account.orderStatus.${o.status}` as never)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatMoney(o.total_cents, o.currency)}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span>
          {total} commande(s) · page {page}/{totalPages}
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

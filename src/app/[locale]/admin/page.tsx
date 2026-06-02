import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  AlertTriangle,
  Receipt,
  Download,
} from "lucide-react";

const PAID = ["paid", "shipped", "delivered"];
const ALL_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

type RecentOrder = {
  id: string;
  number: string;
  email: string;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
};
type TopProduct = { name: string; qty: number; revenue: number };

type QB = {
  select: (q: string, opts?: { count?: "exact"; head?: boolean }) => QB;
  eq: (k: string, v: string | number | boolean) => QB;
  in: (k: string, v: string[]) => QB;
  gte: (k: string, v: string) => QB;
  order: (k: string, o: { ascending: boolean }) => QB;
  limit: (n: number) => QB;
} & Promise<{ data: unknown; count: number | null }>;
type DB = { from: (t: string) => QB };

const emptyStats = {
  revenue: 0,
  aov: 0,
  orders30: 0,
  newCustomers30: 0,
  lowStock: 0,
  statusCounts: {} as Record<string, number>,
  recent: [] as RecentOrder[],
  top: [] as TopProduct[],
};

async function getStats() {
  try {
    const supabase = (await createClient()) as unknown as DB;
    const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
    const since90 = new Date(Date.now() - 90 * 864e5).toISOString();

    const [revRes, orders30Res, newCustRes, invRes, statusRes, recentRes] =
      await Promise.all([
        supabase.from("orders").select("total_cents").in("status", PAID).gte("created_at", since30),
        supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", since30),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since30),
        supabase.from("inventory").select("quantity, reorder_point"),
        supabase.from("orders").select("status").gte("created_at", since90).limit(2000),
        supabase
          .from("orders")
          .select("id, number, email, status, total_cents, currency, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

    const revRows = ((await revRes).data ?? []) as { total_cents: number | null }[];
    const revenue = revRows.reduce((s, r) => s + (r.total_cents ?? 0), 0);
    const paidCount = revRows.length;
    const aov = paidCount > 0 ? Math.round(revenue / paidCount) : 0;

    const orders30 = (await orders30Res).count ?? 0;
    const newCustomers30 = (await newCustRes).count ?? 0;

    const inv = ((await invRes).data ?? []) as { quantity: number; reorder_point: number }[];
    const lowStock = inv.filter((r) => r.quantity <= r.reorder_point).length;

    const statusRows = ((await statusRes).data ?? []) as { status: string }[];
    const statusCounts: Record<string, number> = {};
    for (const r of statusRows) statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;

    const recent = ((await recentRes).data ?? []) as RecentOrder[];

    // Top products (isolated: an embedded-filter quirk must not blank the page).
    let top: TopProduct[] = [];
    try {
      const topRes = await supabase
        .from("order_items")
        .select("name_snapshot, quantity, total_cents, orders!inner(created_at, status)")
        .gte("orders.created_at", since30)
        .in("orders.status", PAID)
        .limit(5000);
      const items = ((topRes as { data: unknown }).data ?? []) as {
        name_snapshot: string;
        quantity: number;
        total_cents: number;
      }[];
      const agg = new Map<string, TopProduct>();
      for (const it of items) {
        const cur = agg.get(it.name_snapshot) ?? {
          name: it.name_snapshot,
          qty: 0,
          revenue: 0,
        };
        cur.qty += it.quantity ?? 0;
        cur.revenue += it.total_cents ?? 0;
        agg.set(it.name_snapshot, cur);
      }
      top = [...agg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    } catch {
      top = [];
    }

    return { revenue, aov, orders30, newCustomers30, lowStock, statusCounts, recent, top };
  } catch {
    return emptyStats;
  }
}

const KPI = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string | number;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted)]">
        <Icon className="h-4 w-4" /> {label}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">{value}</p>
    </CardContent>
  </Card>
);

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

export default async function AdminDashboard() {
  const t = await getTranslations();
  const s = await getStats();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl">{t("admin.dashboard")}</h1>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/admin/export/orders"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-bg)]"
        >
          <Download className="h-4 w-4" /> Export commandes (CSV)
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KPI icon={TrendingUp} label="Revenu (30j)" value={formatMoney(s.revenue)} />
        <KPI icon={Receipt} label="Panier moyen (30j)" value={formatMoney(s.aov)} />
        <KPI icon={ShoppingBag} label="Commandes (30j)" value={s.orders30} />
        <KPI icon={Users} label="Nouveaux comptes (30j)" value={s.newCustomers30} />
        <KPI icon={AlertTriangle} label="Stock bas" value={s.lowStock} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top produits (30j)</CardTitle>
          </CardHeader>
          <CardContent>
            {s.top.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                Aucune vente sur la période.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {s.top.map((p) => (
                  <li key={p.name} className="flex items-center justify-between gap-3">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 text-[var(--color-muted)]">
                      ×{p.qty} · {formatMoney(p.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commandes par statut (90j)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {ALL_STATUSES.map((st) => (
                <li key={st} className="flex items-center justify-between">
                  <Badge variant={STATUS_VARIANT[st] ?? "default"}>
                    {t(`account.orderStatus.${st}` as never)}
                  </Badge>
                  <span className="font-medium">{s.statusCounts[st] ?? 0}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            {s.recent.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">
                Aucune commande pour le moment.
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {s.recent.map((o) => (
                    <tr key={o.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-2 font-mono text-xs">
                        <Link
                          href={`/admin/orders/${o.id}` as never}
                          className="text-[var(--color-primary-600)] hover:underline"
                        >
                          {o.number}
                        </Link>
                      </td>
                      <td className="py-2">{o.email}</td>
                      <td className="py-2">
                        <Badge variant={STATUS_VARIANT[o.status] ?? "default"}>
                          {t(`account.orderStatus.${o.status}` as never)}
                        </Badge>
                      </td>
                      <td className="py-2 text-right font-medium">
                        {formatMoney(o.total_cents, o.currency)}
                      </td>
                      <td className="py-2 text-right text-[var(--color-muted)]">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

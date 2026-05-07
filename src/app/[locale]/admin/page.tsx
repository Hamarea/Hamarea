import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";
import { TrendingUp, ShoppingBag, Users, AlertTriangle } from "lucide-react";

async function getStats() {
  try {
    const supabase = await createClient();
    type Counter = { count: number | null };
    const sb = supabase as unknown as {
      from: (t: string) => {
        select: (q: string, opts?: { count: "exact"; head: true }) => Promise<Counter>;
      };
    };
    const [orders30, totalOrders, totalCustomers] = await Promise.all([
      sb.from("orders").select("*", { count: "exact", head: true }),
      sb.from("orders").select("*", { count: "exact", head: true }),
      sb.from("profiles").select("*", { count: "exact", head: true }),
    ]);
    return {
      revenue: 0,
      orders: totalOrders.count ?? 0,
      customers: totalCustomers.count ?? 0,
      lowStock: orders30.count ?? 0,
    };
  } catch {
    return { revenue: 0, orders: 0, customers: 0, lowStock: 0 };
  }
}

export default async function AdminDashboard() {
  const t = await getTranslations();
  const stats = await getStats();

  return (
    <div>
      <h1 className="font-display text-3xl mb-8">{t("admin.dashboard")}</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted)]">
              <TrendingUp className="h-4 w-4" /> Revenu (30j)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(stats.revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted)]">
              <ShoppingBag className="h-4 w-4" /> Commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.orders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted)]">
              <Users className="h-4 w-4" /> Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.customers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted)]">
              <AlertTriangle className="h-4 w-4" /> Stock bas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.lowStock}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--color-muted)]">
            Connecte Supabase et Stripe (.env.local) pour afficher les commandes
            entrantes en temps réel ici.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mise en route</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. Appliquer les migrations Supabase (<code>supabase/migrations</code>).</p>
            <p>2. Promouvoir un utilisateur :
              <code className="block mt-1 rounded bg-[var(--color-bg)] px-2 py-1 text-xs">
                update profiles set role = &apos;admin&apos; where email = &apos;moi@hamarea.com&apos;;
              </code>
            </p>
            <p>3. Créer une catégorie puis un produit dans &laquo; Produits &raquo;.</p>
            <p>4. Configurer Stripe + webhook sur <code>/api/webhooks/stripe</code>.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

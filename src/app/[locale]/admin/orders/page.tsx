import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "secondary"> = {
  pending: "warning",
  paid: "secondary",
  processing: "secondary",
  shipped: "default",
  delivered: "success",
  cancelled: "danger",
  refunded: "danger",
};

export default async function AdminOrdersPage() {
  const t = await getTranslations();
  const supabase = await createClient();

  let orders: OrderRow[] = [];
  try {
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          order: (k: string, opts: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: OrderRow[] | null }>;
          };
        };
      };
    })
      .from("orders")
      .select("id, number, email, status, total_cents, currency, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    orders = data ?? [];
  } catch {
    orders = [];
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">{t("admin.orders")}</h1>

      <Card>
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
                <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-muted)]">
                  Aucune commande pour le moment.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-b border-[var(--color-border)]">
                  <td className="px-4 py-3 font-mono text-xs">{o.number}</td>
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
    </div>
  );
}

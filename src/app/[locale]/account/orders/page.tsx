import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

type OrderRow = {
  id: string;
  number: string;
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

export default async function OrdersPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let orders: OrderRow[] = [];
  if (user) {
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          eq: (k: string, v: string) => {
            order: (k: string, opts: { ascending: boolean }) => Promise<{ data: OrderRow[] | null }>;
          };
        };
      };
    })
      .from("orders")
      .select("id, number, status, total_cents, currency, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    orders = data ?? [];
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">{t("account.myOrders")}</h1>
      {orders.length === 0 ? (
        <Card className="p-8 text-center text-[var(--color-muted)]">
          Aucune commande pour l’instant.
        </Card>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}` as never} className="block">
                <Card className="flex items-center justify-between p-4 transition-colors hover:bg-[var(--color-primary-50)]">
                  <div>
                    <p className="font-medium">{o.number}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {new Date(o.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[o.status] ?? "default"}>
                    {t(`account.orderStatus.${o.status}` as never)}
                  </Badge>
                  <p className="font-semibold">
                    {formatMoney(o.total_cents, o.currency)}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

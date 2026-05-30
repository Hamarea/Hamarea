import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";
import { ArrowLeft, Truck } from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "secondary"> = {
  pending: "warning",
  paid: "secondary",
  processing: "secondary",
  shipped: "default",
  delivered: "success",
  cancelled: "danger",
  refunded: "danger",
};

type Item = {
  id: string;
  name_snapshot: string;
  quantity: number;
  total_cents: number;
};
type Shipment = {
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  status: string;
  shipped_at: string | null;
  delivered_at: string | null;
} | null;
type Order = {
  id: string;
  number: string;
  status: string;
  currency: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  created_at: string;
  order_items: Item[];
  shipments: Shipment[];
};

export default async function ClientOrderDetail({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: order } = await (supabase as unknown as {
    from: (t: string) => {
      select: (q: string) => {
        eq: (k: string, v: string) => {
          eq: (k: string, v: string) => {
            maybeSingle: () => Promise<{ data: Order | null }>;
          };
        };
      };
    };
  })
    .from("orders")
    .select(
      "id, number, status, currency, subtotal_cents, shipping_cents, tax_cents, total_cents, created_at, order_items(id, name_snapshot, quantity, total_cents), shipments(carrier, tracking_number, tracking_url, status, shipped_at, delivered_at)",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) notFound();
  const shipment = order.shipments?.[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> {t("account.myOrders")}
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="font-display text-3xl">{order.number}</h1>
          <Badge variant={STATUS_VARIANT[order.status] ?? "default"}>
            {t(`account.orderStatus.${order.status}` as never)}
          </Badge>
        </div>
        <p className="text-sm text-[var(--color-muted)]">
          {new Date(order.created_at).toLocaleDateString()}
        </p>
      </div>

      {shipment && (shipment.tracking_number || shipment.tracking_url) && (
        <Card className="border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-5">
          <h2 className="mb-2 flex items-center gap-2 font-medium">
            <Truck className="h-4 w-4" /> Suivi de votre colis
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            {shipment.carrier ? `${shipment.carrier} · ` : ""}
            {shipment.tracking_number ?? ""} · statut : {shipment.status}
          </p>
          {shipment.tracking_url && (
            <div className="mt-3">
              <Button asChild size="sm">
                <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer">
                  Suivre mon colis
                </a>
              </Button>
            </div>
          )}
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-3 font-medium">Articles</h2>
        <table className="w-full text-sm">
          <tbody>
            {(order.order_items ?? []).map((it) => (
              <tr key={it.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="py-2">{it.name_snapshot}</td>
                <td className="py-2 text-right">×{it.quantity}</td>
                <td className="py-2 text-right font-medium">
                  {formatMoney(it.total_cents, order.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--color-muted)]">Sous-total</dt>
            <dd>{formatMoney(order.subtotal_cents, order.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--color-muted)]">Livraison</dt>
            <dd>{formatMoney(order.shipping_cents, order.currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-[var(--color-border)] pt-2 font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(order.total_cents, order.currency)}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

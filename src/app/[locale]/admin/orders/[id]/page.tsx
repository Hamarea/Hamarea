import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";
import { updateOrderStatus, upsertShipment, createRefund } from "../actions";
import { ArrowLeft } from "lucide-react";

const STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

type OrderItem = {
  id: string;
  sku: string;
  name_snapshot: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
};
type Payment = {
  id: string;
  provider: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
};
type Shipment = {
  carrier: string | null;
  service: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  status: string;
} | null;
type Order = {
  id: string;
  number: string;
  email: string;
  status: string;
  currency: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  shipping_address: Record<string, unknown>;
  billing_address: Record<string, unknown>;
  stripe_payment_intent_id: string | null;
  placed_at: string | null;
  created_at: string;
  order_items: OrderItem[];
  payments: Payment[];
  shipments: Shipment[];
};

function Addr({ a }: { a: Record<string, unknown> }) {
  if (!a || Object.keys(a).length === 0)
    return <p className="text-[var(--color-muted)]">—</p>;
  const g = (k: string) => (a[k] ? String(a[k]) : "");
  return (
    <p className="text-[var(--color-muted)]">
      {g("full_name")}
      <br />
      {g("line1")} {g("line2")}
      <br />
      {g("postal_code") || g("zip")} {g("city")} {g("country")}
      {g("phone") ? (
        <>
          <br />
          {g("phone")}
        </>
      ) : null}
    </p>
  );
}

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  await getTranslations();
  const supabase = await createClient();

  const { data: order } = await (supabase as unknown as {
    from: (t: string) => {
      select: (q: string) => {
        eq: (k: string, v: string) => {
          maybeSingle: () => Promise<{ data: Order | null }>;
        };
      };
    };
  })
    .from("orders")
    .select(
      "id, number, email, status, currency, subtotal_cents, shipping_cents, tax_cents, discount_cents, total_cents, shipping_address, billing_address, stripe_payment_intent_id, placed_at, created_at, order_items(id, sku, name_snapshot, quantity, unit_price_cents, total_cents), payments(id, provider, status, amount_cents, currency, created_at), shipments(carrier, service, tracking_number, tracking_url, status)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();
  const shipment = order.shipments?.[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Commandes
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="font-display text-3xl">{order.number}</h1>
          <Badge>{order.status}</Badge>
        </div>
        <p className="text-sm text-[var(--color-muted)]">
          {order.email} · {new Date(order.created_at).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 font-medium">Articles</h2>
            <table className="w-full text-sm">
              <tbody>
                {(order.order_items ?? []).map((it) => (
                  <tr key={it.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2">
                      {it.name_snapshot}
                      <span className="block font-mono text-xs text-[var(--color-muted)]">
                        {it.sku}
                      </span>
                    </td>
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
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">TVA</dt>
                <dd>{formatMoney(order.tax_cents, order.currency)}</dd>
              </div>
              {order.discount_cents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-[var(--color-muted)]">Remise</dt>
                  <dd>−{formatMoney(order.discount_cents, order.currency)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-[var(--color-border)] pt-2 font-semibold">
                <dt>Total</dt>
                <dd>{formatMoney(order.total_cents, order.currency)}</dd>
              </div>
            </dl>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5 text-sm">
              <h2 className="mb-2 font-medium">Adresse de livraison</h2>
              <Addr a={order.shipping_address} />
            </Card>
            <Card className="p-5 text-sm">
              <h2 className="mb-2 font-medium">Adresse de facturation</h2>
              <Addr a={order.billing_address} />
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="mb-3 font-medium">Paiements</h2>
            {(order.payments ?? []).length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">Aucun paiement enregistré.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>
                      {p.provider} · <Badge variant="outline">{p.status}</Badge>
                    </span>
                    <span>{formatMoney(p.amount_cents, p.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
            {order.stripe_payment_intent_id && (
              <p className="mt-2 font-mono text-xs text-[var(--color-muted)]">
                PI: {order.stripe_payment_intent_id}
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 font-medium">Statut</h2>
            <form action={updateOrderStatus} className="space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <select
                name="status"
                defaultValue={order.status}
                className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <SubmitButton className="w-full">
                Mettre à jour le statut
              </SubmitButton>
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-medium">Expédition &amp; suivi</h2>
            <form action={upsertShipment} className="space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="space-y-1.5">
                <Label htmlFor="carrier">Transporteur</Label>
                <Input
                  id="carrier"
                  name="carrier"
                  defaultValue={shipment?.carrier ?? ""}
                  placeholder="Colissimo, DHL…"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tracking_number">N° de suivi</Label>
                <Input
                  id="tracking_number"
                  name="tracking_number"
                  defaultValue={shipment?.tracking_number ?? ""}
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tracking_url">Lien de suivi</Label>
                <Input
                  id="tracking_url"
                  name="tracking_url"
                  type="url"
                  defaultValue={shipment?.tracking_url ?? ""}
                  placeholder="https://…"
                  maxLength={500}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ship_status">Statut d&apos;expédition</Label>
                <select
                  id="ship_status"
                  name="status"
                  defaultValue={shipment?.status ?? "pending"}
                  className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
                >
                  <option value="pending">En préparation</option>
                  <option value="shipped">Expédié</option>
                  <option value="in_transit">En transit</option>
                  <option value="delivered">Livré</option>
                </select>
              </div>
              <SubmitButton variant="secondary" className="w-full">
                Enregistrer le suivi
              </SubmitButton>
            </form>
          </Card>

          <Card className="border-[var(--color-danger)]/40 p-5">
            <h2 className="mb-1 font-medium text-[var(--color-danger)]">
              Remboursement
            </h2>
            <p className="mb-3 text-xs text-[var(--color-muted)]">
              Déclenche un remboursement Stripe réel (si un paiement existe) et
              l&apos;enregistre dans l&apos;historique.
            </p>
            <form action={createRefund} className="space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="space-y-1.5">
                <Label htmlFor="amount">Montant ({order.currency})</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={(order.total_cents / 100).toFixed(2)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason">Raison (optionnel)</Label>
                <Input id="reason" name="reason" maxLength={500} />
              </div>
              <SubmitButton
                variant="outline"
                className="w-full border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
              >
                Rembourser
              </SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

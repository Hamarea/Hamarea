import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

// Vue lecture seule des paiements (table alimentée par le webhook Stripe).
// L'accès est déjà gardé par le middleware + le layout admin (rôle) + la RLS
// `payments_admin_all`. Pas de mutation ici → pas de requirePermission.

type PaymentRow = {
  id: string;
  order_id: string;
  provider: string;
  provider_payment_id: string | null;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  orders: { number: string | null } | null;
};

const STATUS_VARIANT: Record<
  string,
  "default" | "success" | "warning" | "danger" | "secondary"
> = {
  succeeded: "success",
  pending: "warning",
  requires_action: "warning",
  failed: "danger",
  refunded: "danger",
};

const PAGE_SIZE = 25;

type ListBuilder = {
  select: (q: string, opts?: { count?: "exact" }) => ListBuilder;
  order: (k: string, o: { ascending: boolean }) => ListBuilder;
  range: (
    from: number,
    to: number,
  ) => Promise<{ data: PaymentRow[] | null; count: number | null }>;
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let payments: PaymentRow[] = [];
  let total = 0;
  try {
    const { data, count } = await (
      supabase as unknown as { from: (t: string) => ListBuilder }
    )
      .from("payments")
      .select(
        "id, order_id, provider, provider_payment_id, status, amount_cents, currency, created_at, orders(number)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    payments = data ?? [];
    total = count ?? 0;
  } catch {
    payments = [];
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl">Paiements</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Transactions enregistrées par le webhook Stripe.
        </p>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Commande</th>
              <th className="px-4 py-3 font-medium">Fournisseur</th>
              <th className="px-4 py-3 font-medium">Réf. paiement</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium text-right">Montant</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-[var(--color-muted)]"
                >
                  Aucun paiement.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)]"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/admin/orders/${p.order_id}` as never}
                      className="text-[var(--color-primary-600)] hover:underline"
                    >
                      {p.orders?.number ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{p.provider}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted)]">
                    {p.provider_payment_id ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[p.status] ?? "default"}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatMoney(p.amount_cents, p.currency)}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span>
          {total} paiement(s) · page {page}/{totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={`/admin/payments?page=${page - 1}` as never}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-bg)]"
            >
              ← Précédent
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`/admin/payments?page=${page + 1}` as never}
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

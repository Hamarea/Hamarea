import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  locale: string | null;
  currency: string | null;
  role: string;
  marketing_opt_in: boolean | null;
  created_at: string;
};
type Order = {
  id: string;
  number: string;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
};
type Address = {
  id: string;
  full_name: string | null;
  line1: string;
  line2: string | null;
  zip: string;
  city: string;
  country: string;
  type: string;
};

const PAID = ["paid", "shipped", "delivered"];
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
const ROLE_VARIANT: Record<string, "accent" | "secondary" | "outline"> = {
  admin: "accent",
  staff: "secondary",
  customer: "outline",
};

type EqChain = {
  maybeSingle: () => Promise<{ data: Profile | null }>;
  order: (
    k: string,
    o: { ascending: boolean },
  ) => Promise<{ data: unknown[] | null }>;
};
type SB = {
  from: (t: string) => { select: (q: string) => { eq: (k: string, v: string) => EqChain } };
};

export default async function AdminCustomerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations();
  const supabase = (await createClient()) as unknown as SB;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, phone, locale, currency, role, marketing_opt_in, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  let orders: Order[] = [];
  try {
    const { data } = await supabase
      .from("orders")
      .select("id, number, status, total_cents, currency, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false });
    orders = (data as Order[] | null) ?? [];
  } catch {
    orders = [];
  }

  let addresses: Address[] = [];
  try {
    const { data } = await supabase
      .from("addresses")
      .select("id, full_name, line1, line2, zip, city, country, type")
      .eq("user_id", id)
      .order("created_at", { ascending: false });
    addresses = (data as Address[] | null) ?? [];
  } catch {
    addresses = [];
  }

  const paid = orders.filter((o) => PAID.includes(o.status));
  const totalSpent = paid.reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const currency = orders[0]?.currency ?? "EUR";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Clients
        </Link>
        <h1 className="mt-2 font-display text-3xl">
          {profile.full_name ?? profile.email ?? "Client"}
        </h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <Badge variant={ROLE_VARIANT[profile.role] ?? "outline"}>{profile.role}</Badge>
          <span>Inscrit le {new Date(profile.created_at).toLocaleDateString("fr-FR")}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-[var(--color-muted)]">Commandes payées</p>
          <p className="text-2xl font-bold">{paid.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-muted)]">Total dépensé</p>
          <p className="text-2xl font-bold">{formatMoney(totalSpent, currency)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-muted)]">Commandes (toutes)</p>
          <p className="text-2xl font-bold">{orders.length}</p>
        </Card>
      </div>

      {/* Coordonnées */}
      <Card className="p-6">
        <h2 className="mb-3 font-medium">Coordonnées</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 border-b border-[var(--color-border)] pb-1">
            <dt className="text-[var(--color-muted)]">E-mail</dt>
            <dd>{profile.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-[var(--color-border)] pb-1">
            <dt className="text-[var(--color-muted)]">Téléphone</dt>
            <dd>{profile.phone ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-[var(--color-border)] pb-1">
            <dt className="text-[var(--color-muted)]">Langue</dt>
            <dd>{(profile.locale ?? "—").toUpperCase()}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-[var(--color-border)] pb-1">
            <dt className="text-[var(--color-muted)]">Newsletter</dt>
            <dd>{profile.marketing_opt_in ? "Oui" : "Non"}</dd>
          </div>
        </dl>
      </Card>

      {/* Historique de commandes */}
      <Card className="overflow-x-auto">
        <div className="px-6 pt-5">
          <h2 className="font-medium">Historique de commandes</h2>
        </div>
        <table className="mt-3 w-full text-sm">
          <thead className="border-y border-[var(--color-border)] bg-[var(--color-bg)]">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">N°</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[var(--color-muted)]">
                  Aucune commande.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/admin/orders/${o.id}` as never}
                      className="text-[var(--color-primary-600)] hover:underline"
                    >
                      {o.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[o.status] ?? "default"}>
                      {t(`account.orderStatus.${o.status}` as never)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatMoney(o.total_cents, o.currency)}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">
                    {new Date(o.created_at).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Adresses */}
      {addresses.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-3 font-medium">Adresses</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {addresses.map((a) => (
              <div key={a.id} className="rounded-md border border-[var(--color-border)] p-3 text-sm">
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                  {a.type === "billing" ? "Facturation" : "Livraison"}
                </p>
                <p className="font-medium">{a.full_name ?? "—"}</p>
                <p className="text-[var(--color-muted)]">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                  <br />
                  {a.zip} {a.city} · {a.country}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/lib/supabase/server";

type AuditRow = {
  id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  data: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
  actor: { email: string | null; full_name: string | null } | null;
};

// Libellés FR lisibles pour les codes d'action (repli sur le code brut).
const ACTION_LABELS: Record<string, string> = {
  "product.create": "Produit créé",
  "product.update": "Produit modifié",
  "product.delete": "Produit supprimé",
  "product.status_change": "Statut produit changé",
  "product.bulk_status": "Statut produits (lot)",
  "product.duplicate": "Produit dupliqué",
  "variant.create": "Variante créée",
  "variant.update": "Variante modifiée",
  "variant.delete": "Variante supprimée",
  "variant.generate": "Variantes générées",
  "inventory.set": "Stock ajusté",
  "image.add": "Image ajoutée",
  "image.upload": "Image téléversée",
  "image.delete": "Image supprimée",
  "coupon.create": "Coupon créé",
  "coupon.toggle": "Coupon activé/désactivé",
  "coupon.delete": "Coupon supprimé",
  "supplier.create": "Fournisseur créé",
  "supplier.update": "Fournisseur modifié",
  "supplier.delete": "Fournisseur supprimé",
  "settings.update": "Réglages modifiés",
  "review.moderate": "Avis modéré",
  "order.status": "Statut commande changé",
  "order.refund": "Remboursement",
  "customer.role_change": "Rôle / permissions modifiés",
};
const actionLabel = (a: string) => ACTION_LABELS[a] ?? a;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const ql = q.toLowerCase();

  let rows: AuditRow[] = [];
  try {
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          order: (
            k: string,
            o: { ascending: boolean },
          ) => { limit: (n: number) => Promise<{ data: AuditRow[] | null }> };
        };
      };
    })
      .from("audit_logs")
      .select(
        "id, action, entity, entity_id, data, ip, created_at, actor:actor_id(email, full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    rows = data ?? [];
  } catch {
    rows = [];
  }

  if (ql) {
    rows = rows.filter(
      (r) =>
        r.action.toLowerCase().includes(ql) ||
        actionLabel(r.action).toLowerCase().includes(ql) ||
        (r.entity ?? "").toLowerCase().includes(ql) ||
        (r.actor?.email ?? "").toLowerCase().includes(ql) ||
        (r.actor?.full_name ?? "").toLowerCase().includes(ql),
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Journal d&apos;audit</h1>
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        200 dernières actions sensibles (produits, stock, commandes, coupons,
        fournisseurs, rôles, réglages, modération).
      </p>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Filtrer : action, auteur, cible…"
          className="max-w-xs"
        />
        <SubmitButton>Filtrer</SubmitButton>
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Auteur</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Cible</th>
              <th className="px-4 py-3 font-medium">Détail</th>
              <th className="px-4 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-[var(--color-muted)]"
                >
                  {q ? "Aucun résultat pour ce filtre." : "Aucune entrée pour l'instant."}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--color-border)] align-top"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--color-muted)]">
                    {new Date(r.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    {r.actor?.full_name ?? r.actor?.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{actionLabel(r.action)}</span>
                    <span className="block font-mono text-[10px] text-[var(--color-muted)]">
                      {r.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.entity ?? "—"}
                    {r.entity_id ? (
                      <span className="block font-mono text-[10px] text-[var(--color-muted)]">
                        {r.entity_id.slice(0, 8)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {r.data && Object.keys(r.data).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(r.data).map(([k, v]) => (
                          <span
                            key={k}
                            className="rounded bg-[var(--color-bg)] px-1.5 py-0.5 text-[11px]"
                          >
                            <span className="text-[var(--color-muted)]">{k} :</span>{" "}
                            {v === null || v === undefined
                              ? "—"
                              : typeof v === "object"
                                ? JSON.stringify(v)
                                : String(v)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-muted)]">
                    {r.ip ?? "—"}
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

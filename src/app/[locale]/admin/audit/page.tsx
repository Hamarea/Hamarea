import { Card } from "@/components/ui/card";
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

export default async function AdminAuditPage() {
  const supabase = await createClient();

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

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Journal d&apos;audit</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        200 dernières actions sensibles (statut commande, expédition, rôles,
        produits, coupons, fournisseurs, réglages, modération).
      </p>

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
                  Aucune entrée pour l&apos;instant.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--color-border)] align-top"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    {r.actor?.email ?? r.actor?.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.action}</td>
                  <td className="px-4 py-3">
                    {r.entity ?? "—"}
                    {r.entity_id ? (
                      <span className="block text-xs text-[var(--color-muted)]">
                        {r.entity_id.slice(0, 8)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs">
                      {r.data ? JSON.stringify(r.data) : "—"}
                    </code>
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

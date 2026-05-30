import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth";
import { CustomerRow, type CustomerView } from "./customer-row";

export default async function AdminCustomersPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const actor = await getActor();
  const canManage = actor?.role === "admin";

  let rows: CustomerView[] = [];
  try {
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          order: (k: string, opts: { ascending: boolean }) => Promise<{ data: CustomerView[] | null }>;
        };
      };
    })
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false });
    rows = data ?? [];
  } catch {
    rows = [];
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">{t("admin.customers")}</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        {canManage
          ? "Vous pouvez promouvoir un client en staff ou admin."
          : "La gestion des rôles est réservée aux administrateurs."}
      </p>
      <Card>
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-[var(--color-muted)]">
                  Aucun client inscrit.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <CustomerRow
                  key={c.id}
                  customer={c}
                  canManage={canManage}
                  isSelf={c.id === actor?.id}
                />
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
};

export default async function AdminCustomersPage() {
  const t = await getTranslations();
  const supabase = await createClient();

  let rows: Row[] = [];
  try {
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          order: (k: string, opts: { ascending: boolean }) => Promise<{ data: Row[] | null }>;
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
      <h1 className="font-display text-3xl mb-6">{t("admin.customers")}</h1>
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
                <tr key={c.id} className="border-b border-[var(--color-border)]">
                  <td className="px-4 py-3 font-medium">{c.full_name ?? "—"}</td>
                  <td className="px-4 py-3">{c.email}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        c.role === "admin"
                          ? "accent"
                          : c.role === "staff"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {c.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">
                    {new Date(c.created_at).toLocaleDateString()}
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

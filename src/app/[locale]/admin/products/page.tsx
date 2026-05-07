import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { Plus } from "lucide-react";

type ProductRow = {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  status: "draft" | "active" | "archived";
  brand: string | null;
  created_at: string;
};

export default async function AdminProductsPage() {
  const t = await getTranslations();
  const supabase = await createClient();

  let products: ProductRow[] = [];
  try {
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          order: (k: string, opts: { ascending: boolean }) => Promise<{ data: ProductRow[] | null }>;
        };
      };
    })
      .from("products")
      .select("id, slug, name_i18n, status, brand, created_at")
      .order("created_at", { ascending: false });
    products = data ?? [];
  } catch {
    products = [];
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">{t("admin.products")}</h1>
        <Button>
          <Plus className="h-4 w-4" /> Nouveau produit
        </Button>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Marque</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-muted)]">
                  Aucun produit. Crée ton premier produit pour démarrer.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-[var(--color-border)]">
                  <td className="px-4 py-3 font-medium">
                    {p.name_i18n?.fr ?? p.slug}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{p.slug}</td>
                  <td className="px-4 py-3">{p.brand ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        p.status === "active"
                          ? "success"
                          : p.status === "draft"
                          ? "warning"
                          : "outline"
                      }
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">
                    {new Date(p.created_at).toLocaleDateString()}
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

import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { Plus } from "lucide-react";
import { createProduct, setProductStatus } from "./actions";

type ProductRow = {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  status: "draft" | "active" | "archived";
  brand: string | null;
  created_at: string;
};

const STATUSES = ["draft", "active", "archived"] as const;

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
      </div>

      <details className="mb-6">
        <summary className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[var(--color-primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-700)]">
          <Plus className="h-4 w-4" /> Nouveau produit
        </summary>
        <Card className="mt-3 p-6">
          <form action={createProduct} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name_fr">Nom (FR)</Label>
              <Input id="name_fr" name="name_fr" required maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name_en">Nom (EN, optionnel)</Label>
              <Input id="name_en" name="name_en" maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (optionnel, auto sinon)</Label>
              <Input id="slug" name="slug" maxLength={200} placeholder="auto depuis le nom" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand">Marque (optionnel)</Label>
              <Input id="brand" name="brand" maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Statut</Label>
              <select
                id="status"
                name="status"
                defaultValue="draft"
                className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit">Créer le produit</Button>
            </div>
          </form>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Crée la fiche produit. Variantes, prix et images : édition détaillée à
            ajouter (table <code>product_variants</code> / <code>product_images</code>).
          </p>
        </Card>
      </details>

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
                    <form action={setProductStatus} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <select
                        name="status"
                        defaultValue={p.status}
                        className="h-9 rounded-md border border-[var(--color-border)] bg-white px-2 text-sm"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="ghost" size="sm">
                        OK
                      </Button>
                    </form>
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

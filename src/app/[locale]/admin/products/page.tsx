import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
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
const PAGE_SIZE = 25;

type ListBuilder = {
  select: (q: string, opts?: { count?: "exact" }) => ListBuilder;
  or: (f: string) => ListBuilder;
  order: (k: string, o: { ascending: boolean }) => ListBuilder;
  range: (
    from: number,
    to: number,
  ) => Promise<{ data: ProductRow[] | null; count: number | null }>;
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const t = await getTranslations();
  const supabase = await createClient();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let products: ProductRow[] = [];
  let total = 0;
  let suppliers: { id: string; name: string }[] = [];
  try {
    let qb = (supabase as unknown as { from: (t: string) => ListBuilder })
      .from("products")
      .select("id, slug, name_i18n, status, brand, created_at", {
        count: "exact",
      });
    if (q) qb = qb.or(`slug.ilike.%${q}%,brand.ilike.%${q}%`);
    const { data, count } = await qb
      .order("created_at", { ascending: false })
      .range(from, to);
    products = data ?? [];
    total = count ?? 0;

    const { data: sup } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          order: (
            k: string,
            opts: { ascending: boolean },
          ) => Promise<{ data: { id: string; name: string }[] | null }>;
        };
      };
    })
      .from("suppliers")
      .select("id, name")
      .order("name", { ascending: true });
    suppliers = sup ?? [];
  } catch {
    products = [];
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const linkTo = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };

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
              <Label htmlFor="supplier_id">Fournisseur (optionnel)</Label>
              <select
                id="supplier_id"
                name="supplier_id"
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              >
                <option value="">— Aucun —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
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

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Slug ou marque…"
          className="max-w-xs"
        />
        <Button type="submit">Rechercher</Button>
      </form>

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
                  Aucun produit.
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

      <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span>
          {total} produit(s) · page {page}/{totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={linkTo(page - 1) as never}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-bg)]"
            >
              ← Précédent
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={linkTo(page + 1) as never}
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

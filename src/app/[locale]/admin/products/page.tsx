import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { Plus } from "lucide-react";
import { createProduct } from "./actions";
import { ProductsTable, type AdminProductRow } from "@/components/admin/products-table";
import { SavedViews } from "@/components/admin/saved-views";
import { FilterChips } from "@/components/admin/filter-chips";
import { ImageDropZone } from "@/components/admin/image-drop-zone";

type VariantLite = {
  price_cents: number;
  currency: string;
  active: boolean;
  position: number;
  inventory: { quantity: number }[] | null;
};
type ProductRow = {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  status: "draft" | "active" | "archived";
  brand: string | null;
  preorder: boolean;
  created_at: string;
  product_variants: VariantLite[] | null;
  product_images: { storage_path: string; position: number }[] | null;
};

const STATUSES = ["draft", "active", "archived"] as const;
const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  active: "Active",
  archived: "Archivée",
};
const PAGE_SIZE = 25;

type ListBuilder = {
  select: (q: string, opts?: { count?: "exact" }) => ListBuilder;
  or: (f: string) => ListBuilder;
  eq: (k: string, v: string) => ListBuilder;
  order: (k: string, o: { ascending: boolean }) => ListBuilder;
  range: (from: number, to: number) => Promise<{ data: ProductRow[] | null; count: number | null }>;
};

function toRow(p: ProductRow): AdminProductRow {
  const variants = [...(p.product_variants ?? [])].sort((a, b) => a.position - b.position);
  const priceVariant = variants.find((v) => v.active) ?? variants[0];
  const stock = variants.reduce(
    (sum, v) => sum + (v.inventory ?? []).reduce((s, i) => s + (i.quantity ?? 0), 0),
    0,
  );
  const image = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name_i18n?.fr ?? p.name_i18n?.en ?? p.slug,
    brand: p.brand,
    status: p.status,
    price_cents: priceVariant?.price_cents ?? null,
    currency: priceVariant?.currency ?? "EUR",
    stock: variants.length > 0 ? stock : null,
    image: image?.storage_path ?? null,
    preorder: p.preorder ?? false,
    created_at: p.created_at,
  };
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const t = await getTranslations();
  const supabase = await createClient();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status! : "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Active categories — populate the "Catégorie" select in the create form so a
  // product can be filed in the catalog from the moment it's created.
  let categoryOptions: { id: string; name: string }[] = [];
  try {
    const { data: cats } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          eq: (k: string, v: boolean) => {
            order: (
              k: string,
              o: { ascending: boolean },
            ) => Promise<{ data: { id: string; name_i18n: Record<string, string> | null }[] | null }>;
          };
        };
      };
    })
      .from("categories")
      .select("id, name_i18n")
      .eq("active", true)
      .order("position", { ascending: true });
    categoryOptions = (cats ?? []).map((c) => ({
      id: c.id,
      name: c.name_i18n?.fr ?? c.name_i18n?.en ?? c.id,
    }));
  } catch {
    categoryOptions = [];
  }

  let rows: AdminProductRow[] = [];
  let total = 0;
  try {
    let qb = (supabase as unknown as { from: (t: string) => ListBuilder })
      .from("products")
      .select(
        "id, slug, name_i18n, status, brand, preorder, created_at, product_variants(price_cents, currency, active, position, inventory(quantity)), product_images(storage_path, position)",
        { count: "exact" },
      );
    if (status) qb = qb.eq("status", status);
    if (q) {
      const esc = q.replace(/[%_,()]/g, " ").trim();
      // Search the product NAME (JSONB) as well as slug & brand.
      qb = qb.or(
        `name_i18n->>fr.ilike.%${esc}%,name_i18n->>en.ilike.%${esc}%,slug.ilike.%${esc}%,brand.ilike.%${esc}%`,
      );
    }
    const { data, count } = await qb.order("created_at", { ascending: false }).range(from, to);
    rows = (data ?? []).map(toRow);
    total = count ?? 0;
  } catch {
    rows = [];
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const linkTo = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">{t("admin.products")}</h1>
      </div>

      <details className="mb-6">
        <summary className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[var(--color-primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-700)]">
          <Plus className="h-4 w-4" /> Nouveau produit
        </summary>
        <Card className="mt-3 p-6">
          <ActionForm
            action={createProduct}
            className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4"
            successMessage="Produit créé."
            resetOnSuccess
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name_fr">Nom du produit *</Label>
              <Input
                id="name_fr"
                name="name_fr"
                required
                maxLength={200}
                placeholder="ex : Sacoche étanche"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand">Marque</Label>
              <Input id="brand" name="brand" maxLength={120} placeholder="ex : Hamarea" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category_id">Catégorie</Label>
              <select
                id="category_id"
                name="category_id"
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              >
                <option value="">— Aucune —</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Prix (€)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="ex : 24.90"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Visibilité</Label>
              <select
                id="status"
                name="status"
                defaultValue="draft"
                className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              >
                <option value="draft">Brouillon (caché)</option>
                <option value="active">En ligne (visible)</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
              <Label htmlFor="description_fr">Description courte</Label>
              <textarea
                id="description_fr"
                name="description_fr"
                rows={3}
                maxLength={5000}
                placeholder="Quelques phrases sur le produit (traduites automatiquement)."
                className="w-full resize-y rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Photo (depuis l&apos;ordinateur)</Label>
              <ImageDropZone name="file" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="image_url">… ou photo par URL</Label>
              <Input id="image_url" name="image_url" type="url" placeholder="https://…" maxLength={1000} />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-4">
              <input type="checkbox" name="preorder" value="true" className="h-4 w-4" />
              <span>
                <strong>Précommande</strong> — affiche un bandeau « Précommander » sur le produit
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-4">
              <input type="checkbox" name="featured" value="true" className="h-4 w-4" />
              <span>
                <strong>Vedette</strong> — met le produit en avant sur la page d&apos;accueil
              </span>
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <SubmitButton>Créer le produit</SubmitButton>
            </div>
          </ActionForm>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            🌍 La traduction (EN / ES / DE) est <strong>automatique</strong>. Le lien et la
            référence sont générés tout seuls. Choisissez <strong>« En ligne »</strong> (avec un
            prix) pour publier tout de suite dans le catalogue — sinon le produit reste en
            brouillon. Variantes, photos supplémentaires et SEO : ensuite, sur la fiche.
            {categoryOptions.length === 0 && (
              <>
                {" "}
                <Link href={"/admin/categories" as never} className="text-[var(--color-primary-600)] underline">
                  Créez d&apos;abord une catégorie
                </Link>{" "}
                pour pouvoir la choisir ici.
              </>
            )}
          </p>
        </Card>
      </details>

      <SavedViews currentQ={q} currentStatus={status} />

      <FilterChips
        items={[
          { label: "Tous", href: { pathname: "/admin/products", query: q ? { q } : {} }, active: !status },
          {
            label: STATUS_LABEL.active,
            href: { pathname: "/admin/products", query: { ...(q ? { q } : {}), status: "active" } },
            active: status === "active",
          },
          {
            label: STATUS_LABEL.draft,
            href: { pathname: "/admin/products", query: { ...(q ? { q } : {}), status: "draft" } },
            active: status === "draft",
          },
          {
            label: STATUS_LABEL.archived,
            href: { pathname: "/admin/products", query: { ...(q ? { q } : {}), status: "archived" } },
            active: status === "archived",
          },
        ]}
      />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input name="q" defaultValue={q} placeholder="Nom, slug ou marque…" className="max-w-xs" />
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
        >
          <option value="">Tous les statuts</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <SubmitButton>Filtrer</SubmitButton>
        {(q || status) && (
          <Link
            href={"/admin/products" as never}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-bg)]"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      <ProductsTable rows={rows} />

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

import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  updateProduct,
  createVariant,
  updateVariant,
  deleteVariant,
  setInventory,
  addImage,
  deleteImage,
  uploadImage,
} from "./actions";

const STATUSES = ["draft", "active", "archived"] as const;
const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm";

type Inventory = { quantity: number; reserved: number; reorder_point: number };
type Variant = {
  id: string;
  sku: string;
  price_cents: number;
  currency: string;
  active: boolean;
  option_values: Record<string, unknown> | null;
  position: number;
  inventory: Inventory[] | null;
};
type Image = {
  id: string;
  storage_path: string;
  alt_i18n: Record<string, string> | null;
  position: number;
};
type Product = {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string> | null;
  brand: string | null;
  status: string;
  category_id: string | null;
  supplier_id: string | null;
  product_variants: Variant[];
  product_images: Image[];
};

export default async function AdminProductEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (q: string) => {
        eq: (k: string, v: string) => {
          maybeSingle: () => Promise<{ data: Product | null }>;
        };
        order: (
          k: string,
          o: { ascending: boolean },
        ) => Promise<{ data: { id: string; name_i18n?: Record<string, string>; name?: string }[] | null }>;
      };
    };
  };

  const { data: product } = await sb
    .from("products")
    .select(
      "id, slug, name_i18n, description_i18n, brand, status, category_id, supplier_id, product_variants(id, sku, price_cents, currency, active, option_values, position, inventory(quantity, reserved, reorder_point)), product_images(id, storage_path, alt_i18n, position)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!product) notFound();

  const { data: categories } = await sb
    .from("categories")
    .select("id, name_i18n")
    .order("position", { ascending: true });
  const { data: suppliers } = await sb
    .from("suppliers")
    .select("id, name")
    .order("name", { ascending: true });

  const variants = [...(product.product_variants ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const images = [...(product.product_images ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Produits
        </Link>
        <h1 className="mt-2 font-display text-3xl">
          {product.name_i18n?.fr ?? product.slug}
        </h1>
      </div>

      {/* Infos produit */}
      <Card className="p-6">
        <h2 className="mb-4 font-medium">Informations</h2>
        <form action={updateProduct} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={product.id} />
          <div className="space-y-1.5">
            <Label htmlFor="name_fr">Nom (FR)</Label>
            <Input id="name_fr" name="name_fr" required maxLength={200} defaultValue={product.name_i18n?.fr ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name_en">Nom (EN)</Label>
            <Input id="name_en" name="name_en" maxLength={200} defaultValue={product.name_i18n?.en ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" required maxLength={200} defaultValue={product.slug} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand">Marque</Label>
            <Input id="brand" name="brand" maxLength={120} defaultValue={product.brand ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category_id">Catégorie</Label>
            <select id="category_id" name="category_id" defaultValue={product.category_id ?? ""} className={SELECT_CLASS}>
              <option value="">— Aucune —</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_i18n?.fr ?? c.id}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supplier_id">Fournisseur</Label>
            <select id="supplier_id" name="supplier_id" defaultValue={product.supplier_id ?? ""} className={SELECT_CLASS}>
              <option value="">— Aucun —</option>
              {(suppliers ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description_fr">Description (FR)</Label>
            <textarea
              id="description_fr"
              name="description_fr"
              rows={4}
              maxLength={5000}
              defaultValue={product.description_i18n?.fr ?? ""}
              className="w-full resize-y rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Statut</Label>
            <select id="status" name="status" defaultValue={product.status} className={SELECT_CLASS}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Card>

      {/* Variantes */}
      <Card className="p-6">
        <h2 className="mb-4 font-medium">Variantes &amp; prix</h2>
        <div className="space-y-4">
          {variants.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">
              Aucune variante. Ajoute-en une ci-dessous (un produit a besoin d&apos;au
              moins une variante avec un prix pour être vendable).
            </p>
          )}
          {variants.map((v) => {
            const inv = v.inventory?.[0];
            const label = (v.option_values?.label as string) ?? "";
            return (
              <div
                key={v.id}
                className="rounded-md border border-[var(--color-border)] p-4"
              >
                <div className="flex flex-wrap items-end gap-3">
                  <form action={updateVariant} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="variantId" value={v.id} />
                    <div className="space-y-1">
                      <Label className="text-xs">SKU</Label>
                      <Input name="sku" defaultValue={v.sku} maxLength={120} className="w-44" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Prix ({v.currency})</Label>
                      <Input
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={(v.price_cents / 100).toFixed(2)}
                        className="w-28"
                      />
                    </div>
                    <label className="flex items-center gap-2 pb-2 text-sm">
                      <input type="checkbox" name="active" defaultChecked={v.active} className="h-4 w-4" />
                      Actif
                    </label>
                    <Button type="submit" size="sm" variant="secondary">
                      Enregistrer
                    </Button>
                  </form>
                  <form action={deleteVariant} className="pb-1">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="variantId" value={v.id} />
                    <Button type="submit" size="sm" variant="ghost" aria-label="Supprimer la variante">
                      <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                    </Button>
                  </form>
                </div>
                {label && (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">Option : {label}</p>
                )}

                <form action={setInventory} className="mt-3 flex flex-wrap items-end gap-3 border-t border-[var(--color-border)] pt-3">
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="variantId" value={v.id} />
                  <div className="space-y-1">
                    <Label className="text-xs">Stock</Label>
                    <Input name="quantity" type="number" min="0" defaultValue={inv?.quantity ?? 0} className="w-24" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Seuil d&apos;alerte</Label>
                    <Input name="reorder_point" type="number" min="0" defaultValue={inv?.reorder_point ?? 5} className="w-24" />
                  </div>
                  <Button type="submit" size="sm" variant="outline">
                    Mettre à jour le stock
                  </Button>
                  {inv && (
                    <span className="pb-2 text-xs text-[var(--color-muted)]">
                      Réservé : {inv.reserved}
                    </span>
                  )}
                </form>
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <h3 className="mb-2 text-sm font-medium">Ajouter une variante</h3>
          <form action={createVariant} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <div className="space-y-1">
              <Label className="text-xs">SKU</Label>
              <Input name="sku" required maxLength={120} className="w-44" placeholder="HAM-XXX" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prix (EUR)</Label>
              <Input name="price" type="number" step="0.01" min="0" required className="w-28" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Option (optionnel)</Label>
              <Input name="option" maxLength={120} className="w-40" placeholder="Bleu / M" />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="active" defaultChecked className="h-4 w-4" />
              Actif
            </label>
            <Button type="submit" size="sm">
              Ajouter
            </Button>
          </form>
        </div>
      </Card>

      {/* Images */}
      <Card className="p-6">
        <h2 className="mb-4 font-medium">Images</h2>
        <div className="flex flex-wrap gap-4">
          {images.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">Aucune image.</p>
          )}
          {images.map((img) => (
            <div key={img.id} className="w-32">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.storage_path}
                alt={img.alt_i18n?.fr ?? ""}
                className="h-32 w-32 rounded-md border border-[var(--color-border)] object-cover"
              />
              <form action={deleteImage} className="mt-1">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="imageId" value={img.id} />
                <Button type="submit" size="sm" variant="ghost" className="w-full">
                  Supprimer
                </Button>
              </form>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <h3 className="mb-2 text-sm font-medium">Téléverser une image</h3>
          <form action={uploadImage} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <input
              type="file"
              name="file"
              accept="image/*"
              required
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primary-600)] file:px-3 file:py-1.5 file:text-white"
            />
            <Button type="submit" size="sm">
              Téléverser
            </Button>
          </form>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            JPEG, PNG, WebP, AVIF — 5 Mo max. Nécessite le bucket Storage
            « product-images » (SQL fourni).
          </p>
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <h3 className="mb-2 text-sm font-medium">… ou ajouter par URL</h3>
          <form action={addImage} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <div className="space-y-1">
              <Label className="text-xs">URL</Label>
              <Input name="url" type="url" required className="w-80" placeholder="https://…" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Texte alt</Label>
              <Input name="alt" maxLength={200} className="w-48" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Position</Label>
              <Input name="position" type="number" min="0" defaultValue={images.length} className="w-20" />
            </div>
            <Button type="submit" size="sm">
              Ajouter
            </Button>
          </form>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Images par URL pour l&apos;instant. Upload de fichiers (Supabase Storage) :
            évolution possible.
          </p>
        </div>
      </Card>
    </div>
  );
}

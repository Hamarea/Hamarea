import type { ComponentProps } from "react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { LangTabs } from "@/components/admin/lang-tabs";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";
import { ArrowLeft, Trash2, ChevronUp, ChevronDown, Copy } from "lucide-react";
import {
  updateProduct,
  createVariant,
  updateVariant,
  deleteVariant,
  setInventory,
  addImage,
  deleteImage,
  reorderImage,
  uploadImage,
  duplicateProduct,
} from "./actions";

const STATUSES = ["draft", "active", "archived"] as const;
const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  active: "Active",
  archived: "Archivée",
};
const LOCALE_LABEL: Record<string, string> = { fr: "FR", en: "EN", es: "ES", de: "DE" };
const SELECT_CLASS = "flex h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm";
const TEXTAREA_CLASS = "w-full resize-y rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm";

type Inventory = { quantity: number; reserved: number; reorder_point: number };
type Variant = {
  id: string;
  sku: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  cost_cents: number | null;
  barcode: string | null;
  weight_g: number | null;
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
type Seo = { title?: Record<string, string>; description?: Record<string, string> };
type Product = {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string> | null;
  seo: Seo | null;
  brand: string | null;
  status: string;
  category_id: string | null;
  supplier_id: string | null;
  product_variants: Variant[];
  product_images: Image[];
};

const euros = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2));

/** Derive {name,value} from option_values (handles the legacy `{label}` shape). */
function optionFields(ov: Record<string, unknown> | null): { name: string; value: string } {
  const entries = Object.entries(ov ?? {});
  if (entries.length === 0) return { name: "", value: "" };
  const [k, v] = entries[0];
  if (k === "label") return { name: "", value: String(v ?? "") };
  return { name: k, value: String(v ?? "") };
}

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
        eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: Product | null }> };
        order: (k: string, o: { ascending: boolean }) => Promise<{
          data: { id: string; name_i18n?: Record<string, string>; name?: string }[] | null;
        }>;
      };
    };
  };

  const { data: product } = await sb
    .from("products")
    .select(
      "id, slug, name_i18n, description_i18n, seo, brand, status, category_id, supplier_id, product_variants(id, sku, price_cents, compare_at_price_cents, cost_cents, barcode, weight_g, currency, active, option_values, position, inventory(quantity, reserved, reorder_point)), product_images(id, storage_path, alt_i18n, position)",
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

  const variants = [...(product.product_variants ?? [])].sort((a, b) => a.position - b.position);
  const images = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position);
  const seo = product.seo ?? {};

  // Per-locale content panels (name + description + SEO) — submitted together.
  const langPanels = routing.locales.map((loc) => ({
    code: loc,
    label: LOCALE_LABEL[loc] ?? loc.toUpperCase(),
    node: (
      <>
        <div className="space-y-1.5">
          <Label htmlFor={`name_${loc}`}>Nom ({loc.toUpperCase()}){loc === "fr" ? " *" : ""}</Label>
          <Input
            id={`name_${loc}`}
            name={`name_${loc}`}
            required={loc === "fr"}
            maxLength={200}
            defaultValue={product.name_i18n?.[loc] ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`description_${loc}`}>Description ({loc.toUpperCase()})</Label>
          <textarea
            id={`description_${loc}`}
            name={`description_${loc}`}
            rows={4}
            maxLength={5000}
            defaultValue={product.description_i18n?.[loc] ?? ""}
            className={TEXTAREA_CLASS}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`seo_title_${loc}`}>SEO — titre ({loc.toUpperCase()})</Label>
            <Input
              id={`seo_title_${loc}`}
              name={`seo_title_${loc}`}
              maxLength={70}
              defaultValue={seo.title?.[loc] ?? ""}
              placeholder="≤ 70 caractères"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`seo_description_${loc}`}>SEO — description ({loc.toUpperCase()})</Label>
            <Input
              id={`seo_description_${loc}`}
              name={`seo_description_${loc}`}
              maxLength={320}
              defaultValue={seo.description?.[loc] ?? ""}
              placeholder="≤ 320 caractères"
            />
          </div>
        </div>
      </>
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Produits
          </Link>
          <h1 className="mt-2 font-display text-3xl">{product.name_i18n?.fr ?? product.slug}</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {product.slug} · {STATUS_LABEL[product.status] ?? product.status}
          </p>
        </div>
        <form action={duplicateProduct}>
          <input type="hidden" name="id" value={product.id} />
          <SubmitButton variant="outline" size="sm">
            <Copy className="h-4 w-4" /> Dupliquer
          </SubmitButton>
        </form>
      </div>

      {/* Contenu (multilingue + SEO) */}
      <Card className="p-6">
        <h2 className="mb-4 font-medium">Contenu &amp; SEO</h2>
        <ActionForm action={updateProduct} successMessage="Enregistré." className="space-y-4">
          <input type="hidden" name="id" value={product.id} />
          <LangTabs panels={langPanels} />

          <div className="grid gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug *</Label>
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
            <div className="space-y-1.5">
              <Label htmlFor="status">Statut</Label>
              <select id="status" name="status" defaultValue={product.status} className={SELECT_CLASS}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SubmitButton>Enregistrer</SubmitButton>
        </ActionForm>
      </Card>

      {/* Variantes */}
      <Card className="p-6">
        <h2 className="mb-4 font-medium">Variantes &amp; prix</h2>
        <div className="space-y-4">
          {variants.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">
              Aucune variante. Ajoute-en une ci-dessous (un produit a besoin d&apos;au moins une variante
              active avec un prix pour être vendable / publiable).
            </p>
          )}
          {variants.map((v) => {
            const inv = v.inventory?.[0];
            const opt = optionFields(v.option_values);
            return (
              <div key={v.id} className="rounded-md border border-[var(--color-border)] p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <ActionForm action={updateVariant} successMessage="Variante enregistrée." className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="variantId" value={v.id} />
                    <Field label="SKU" name="sku" defaultValue={v.sku} className="w-40" required maxLength={120} />
                    <Field label={`Prix (${v.currency})`} name="price" type="number" step="0.01" min="0" defaultValue={euros(v.price_cents)} className="w-24" required />
                    <Field label="Prix barré" name="compareAt" type="number" step="0.01" min="0" defaultValue={euros(v.compare_at_price_cents)} className="w-24" />
                    <Field label="Coût" name="cost" type="number" step="0.01" min="0" defaultValue={euros(v.cost_cents)} className="w-24" />
                    <Field label="Code-barres" name="barcode" defaultValue={v.barcode ?? ""} className="w-36" maxLength={120} />
                    <Field label="Poids (g)" name="weight" type="number" min="0" defaultValue={v.weight_g != null ? String(v.weight_g) : ""} className="w-20" />
                    <Field label="Option" name="optionName" defaultValue={opt.name} className="w-28" placeholder="Taille" maxLength={60} />
                    <Field label="Valeur" name="optionValue" defaultValue={opt.value} className="w-28" placeholder="M" maxLength={120} />
                    <label className="flex items-center gap-2 pb-2 text-sm">
                      <input type="checkbox" name="active" defaultChecked={v.active} className="h-4 w-4" /> Actif
                    </label>
                    <SubmitButton size="sm" variant="secondary">Enregistrer</SubmitButton>
                  </ActionForm>
                  <form action={deleteVariant} className="pb-1">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="variantId" value={v.id} />
                    <SubmitButton size="sm" variant="ghost" aria-label="Supprimer la variante">
                      <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                    </SubmitButton>
                  </form>
                </div>

                <ActionForm action={setInventory} successMessage="Stock mis à jour." className="mt-3 flex flex-wrap items-end gap-3 border-t border-[var(--color-border)] pt-3">
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="variantId" value={v.id} />
                  <Field label="Stock" name="quantity" type="number" min="0" defaultValue={String(inv?.quantity ?? 0)} className="w-24" />
                  <Field label="Seuil d'alerte" name="reorder_point" type="number" min="0" defaultValue={String(inv?.reorder_point ?? 5)} className="w-24" />
                  <SubmitButton size="sm" variant="outline">Mettre à jour le stock</SubmitButton>
                  {inv && <span className="pb-2 text-xs text-[var(--color-muted)]">Réservé : {inv.reserved}</span>}
                </ActionForm>
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <h3 className="mb-2 text-sm font-medium">Ajouter une variante</h3>
          <ActionForm action={createVariant} successMessage="Variante ajoutée." resetOnSuccess className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <Field label="SKU" name="sku" required maxLength={120} className="w-40" placeholder="HAM-XXX" />
            <Field label="Prix (EUR)" name="price" type="number" step="0.01" min="0" required className="w-24" />
            <Field label="Prix barré" name="compareAt" type="number" step="0.01" min="0" className="w-24" />
            <Field label="Coût" name="cost" type="number" step="0.01" min="0" className="w-24" />
            <Field label="Option" name="optionName" className="w-28" placeholder="Taille" maxLength={60} />
            <Field label="Valeur" name="optionValue" className="w-28" placeholder="M" maxLength={120} />
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="active" defaultChecked className="h-4 w-4" /> Actif
            </label>
            <SubmitButton size="sm">Ajouter</SubmitButton>
          </ActionForm>
        </div>
      </Card>

      {/* Images */}
      <Card className="p-6">
        <h2 className="mb-4 font-medium">Images</h2>
        <div className="flex flex-wrap gap-4">
          {images.length === 0 && <p className="text-sm text-[var(--color-muted)]">Aucune image.</p>}
          {images.map((img, i) => (
            <div key={img.id} className="w-36">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.storage_path}
                alt={img.alt_i18n?.fr ?? ""}
                className="h-36 w-36 rounded-md border border-[var(--color-border)] object-cover"
              />
              <div className="mt-1 flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <form action={reorderImage}>
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="imageId" value={img.id} />
                    <input type="hidden" name="dir" value="up" />
                    <SubmitButton size="sm" variant="ghost" className="h-8 w-8 px-0" aria-label="Monter" disabled={i === 0}>
                      <ChevronUp className="h-4 w-4" />
                    </SubmitButton>
                  </form>
                  <form action={reorderImage}>
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="imageId" value={img.id} />
                    <input type="hidden" name="dir" value="down" />
                    <SubmitButton size="sm" variant="ghost" className="h-8 w-8 px-0" aria-label="Descendre" disabled={i === images.length - 1}>
                      <ChevronDown className="h-4 w-4" />
                    </SubmitButton>
                  </form>
                </div>
                <form action={deleteImage}>
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="storagePath" value={img.storage_path} />
                  <SubmitButton size="sm" variant="ghost" className="h-8 w-8 px-0" aria-label="Supprimer l'image">
                    <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                  </SubmitButton>
                </form>
              </div>
              {i === 0 && (
                <p className="mt-0.5 text-center text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                  Principale
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <h3 className="mb-2 text-sm font-medium">Téléverser une image</h3>
          <ActionForm action={uploadImage} successMessage="Image ajoutée." className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <input
              type="file"
              name="file"
              accept="image/*"
              required
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primary-600)] file:px-3 file:py-1.5 file:text-white"
            />
            <Field label="Texte alt (FR)" name="alt_fr" className="w-56" maxLength={200} />
            <SubmitButton size="sm">Téléverser</SubmitButton>
          </ActionForm>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            JPEG, PNG, WebP, AVIF, GIF — 5 Mo max. Bucket Storage « product-images ».
          </p>
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <h3 className="mb-2 text-sm font-medium">… ou ajouter par URL</h3>
          <ActionForm action={addImage} successMessage="Image ajoutée." resetOnSuccess className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <Field label="URL" name="url" type="url" required className="w-72" placeholder="https://…" />
            <Field label="Alt (FR)" name="alt_fr" className="w-40" maxLength={200} />
            <Field label="Alt (EN)" name="alt_en" className="w-40" maxLength={200} />
            <SubmitButton size="sm">Ajouter</SubmitButton>
          </ActionForm>
        </div>
      </Card>
    </div>
  );
}

/** Compact labelled input used across the variant/stock/image forms. */
function Field({
  label,
  className,
  ...props
}: { label: string } & ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input className={className} {...props} />
    </div>
  );
}

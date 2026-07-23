import type { ComponentProps } from "react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { LangTabs } from "@/components/admin/lang-tabs";
import { UnsavedGuard } from "@/components/admin/unsaved-guard";
import { PricingForm } from "@/components/admin/pricing-form";
import { VariantsEditor, type VariantRow } from "@/components/admin/variants-editor";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { deriveGlobalPair, samePair } from "@/lib/pricing";
import { routing } from "@/i18n/routing";
import { ArrowLeft, Trash2, ChevronUp, ChevronDown, Copy, ExternalLink } from "lucide-react";
import {
  updateProduct,
  deleteVariant,
  addImage,
  deleteImage,
  reorderImage,
  uploadImage,
  duplicateProduct,
  deleteProduct,
  updatePricing,
  saveVariantsAndStock,
  addColorVariant,
} from "./actions";
import { setProductStatus } from "@/app/[locale]/admin/products/actions";

const STATUSES = ["draft", "active", "archived"] as const;
const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  active: "En vente",
  archived: "Archivé",
};
const STATUS_BADGE: Record<string, string> = {
  draft: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  active: "bg-green-600/10 text-green-700",
  archived: "bg-[var(--color-muted)]/15 text-[var(--color-muted)]",
};
const LOCALE_LABEL: Record<string, string> = { fr: "FR", en: "EN", es: "ES", de: "DE" };
const SELECT_CLASS = "flex h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm";
const TEXTAREA_CLASS = "w-full resize-y rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm";

type Inventory = { quantity: number; reserved: number; reorder_point: number; warehouse_id: string };
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
  variant_id: string | null;
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
  featured: boolean | null;
  category_id: string | null;
  supplier_id: string | null;
  updated_at: string | null;
  product_variants: Variant[];
  product_images: Image[];
};

const eurosFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const euros = (c: number) => eurosFmt.format(c / 100);

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
      "id, slug, name_i18n, description_i18n, seo, brand, status, featured, category_id, supplier_id, updated_at, product_variants(id, sku, price_cents, compare_at_price_cents, cost_cents, barcode, weight_g, currency, active, option_values, position, inventory(quantity, reserved, reorder_point, warehouse_id)), product_images(id, variant_id, storage_path, alt_i18n, position)",
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
  const warehousesRes = await sb
    .from("warehouses")
    .select("id, name, is_default")
    .order("created_at", { ascending: true });
  const warehouses = (warehousesRes.data ?? []) as unknown as {
    id: string;
    name: string;
    is_default: boolean;
  }[];
  const defaultWh = warehouses.find((w) => w.is_default) ?? warehouses[0];

  const variants = [...(product.product_variants ?? [])].sort((a, b) => a.position - b.position);
  const images = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position);

  // --- Modèle « poste de pilotage » : prix global dérivé des variantes -------
  const globalPair = deriveGlobalPair(variants);
  const normalPriceEuros = globalPair
    ? (globalPair.compare_at_price_cents ?? globalPair.price_cents) / 100
    : 0;
  const promoPriceEuros =
    globalPair?.compare_at_price_cents != null ? globalPair.price_cents / 100 : null;
  const specificCount = globalPair
    ? variants.filter((v) => !samePair(v, globalPair)).length
    : 0;

  const stockOf = (v: Variant): Inventory | undefined => {
    const list = v.inventory ?? [];
    return list.find((x) => x.warehouse_id === defaultWh?.id) ?? list[0];
  };
  const totalStock = variants.reduce(
    (sum, v) => sum + (v.inventory ?? []).reduce((s, x) => s + x.quantity, 0),
    0,
  );
  const activeCount = variants.filter((v) => v.active).length;

  const variantLabel = (v: Variant): string => {
    const ov = (v.option_values ?? {}) as Record<string, unknown>;
    const color = (ov.color ?? ov.Couleur ?? ov.couleur) as string | undefined;
    const all = Object.values(ov)
      .filter((x): x is string => typeof x === "string" && x.length > 0 && !x.startsWith("#"))
      .join(" / ");
    return color || all || v.sku;
  };
  const variantLabelById = new Map(variants.map((v) => [v.id, variantLabel(v)]));

  const rows: VariantRow[] = variants.map((v) => {
    const ov = (v.option_values ?? {}) as Record<string, unknown>;
    const hex = typeof ov.hex === "string" && /^#[0-9a-fA-F]{6}$/.test(ov.hex) ? ov.hex : null;
    const inv = stockOf(v);
    return {
      id: v.id,
      sku: v.sku,
      color: variantLabel(v),
      hex,
      active: v.active,
      priceEuros: v.price_cents / 100,
      isCustom: globalPair ? !samePair(v, globalPair) : false,
      quantity: inv?.quantity ?? 0,
      reorderPoint: inv?.reorder_point ?? 5,
      costEuros: v.cost_cents != null ? v.cost_cents / 100 : null,
      barcode: v.barcode,
      weightG: v.weight_g,
    };
  });

  const storefrontHref = product.slug.includes("sacoche")
    ? "/sacoche"
    : (`/products/${product.slug}` as const);
  const updatedAt = product.updated_at
    ? new Date(product.updated_at).toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const seo = product.seo ?? {};

  // Onglets de contenu : nom + description uniquement (le SEO vit dans
  // « Référencement & avancé » plus bas).
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
      </>
    ),
  }));

  return (
    <div className="space-y-6">
      {/* ── Bloc 1 : état de la boutique ─────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Produits
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl">{product.name_i18n?.fr ?? product.slug}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[product.status] ?? ""}`}
            >
              {STATUS_LABEL[product.status] ?? product.status}
            </span>
          </div>
          {updatedAt && (
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Dernière modification : {updatedAt}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={storefrontHref as never}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-bg)]"
          >
            <ExternalLink className="h-4 w-4" /> Voir sur la boutique
          </Link>
          <form action={setProductStatus} className="flex items-center gap-1.5">
            <input type="hidden" name="id" value={product.id} />
            <label htmlFor="quick-status" className="sr-only">
              Statut
            </label>
            <select
              id="quick-status"
              name="status"
              defaultValue={product.status}
              className="h-9 rounded-md border border-[var(--color-border)] bg-white px-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <SubmitButton size="sm" variant="secondary">
              Appliquer
            </SubmitButton>
          </form>
          <form action={duplicateProduct}>
            <input type="hidden" name="id" value={product.id} />
            <SubmitButton variant="ghost" size="sm" aria-label="Dupliquer le produit">
              <Copy className="h-4 w-4" />
            </SubmitButton>
          </form>
        </div>
      </div>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Prix affiché">
          {globalPair ? (
            <>
              {euros(globalPair.price_cents)}
              {globalPair.compare_at_price_cents != null && (
                <span className="ml-1.5 text-sm font-normal text-[var(--color-muted)] line-through">
                  {euros(globalPair.compare_at_price_cents)}
                </span>
              )}
            </>
          ) : (
            "—"
          )}
        </Stat>
        <Stat label="Promotion">
          {promoPriceEuros != null && globalPair?.compare_at_price_cents ? (
            <span className="text-[var(--color-danger)]">
              −
              {Math.round(
                (1 - globalPair.price_cents / globalPair.compare_at_price_cents) * 100,
              )}{" "}
              %
            </span>
          ) : (
            "Aucune"
          )}
        </Stat>
        <Stat label="Stock total">{totalStock}</Stat>
        <Stat label="Couleurs actives">
          {activeCount} / {variants.length}
        </Stat>
      </div>

      {/* ── Bloc 2 : prix ────────────────────────────────────────────────── */}
      <Card className="p-6">
        <h2 className="mb-1 font-medium">Prix</h2>
        <p className="mb-4 text-xs text-[var(--color-muted)]">
          Le prix se règle une seule fois ici et s&apos;applique à toutes les couleurs.
          Renseigne un prix promotionnel pour afficher l&apos;ancien prix barré sur la boutique.
        </p>
        <PricingForm
          productId={product.id}
          initialPrice={normalPriceEuros}
          initialPromo={promoPriceEuros}
          specificCount={specificCount}
          action={updatePricing}
        />
      </Card>

      {/* ── Bloc 3 : couleurs & stock ────────────────────────────────────── */}
      <Card className="p-6">
        <h2 className="mb-4 font-medium">Couleurs &amp; stock</h2>
        <VariantsEditor
          productId={product.id}
          variants={rows}
          globalEffectiveEuros={globalPair ? globalPair.price_cents / 100 : null}
          saveAction={saveVariantsAndStock}
          deleteAction={deleteVariant}
        />

        <div className="mt-6 border-t border-[var(--color-border)] pt-4">
          <h3 className="mb-2 text-sm font-medium">Ajouter une couleur</h3>
          <ActionForm
            action={addColorVariant}
            successMessage="Couleur ajoutée."
            resetOnSuccess
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="productId" value={product.id} />
            <Field label="Couleur" name="color" required maxLength={60} className="w-36" placeholder="Rose" />
            <div className="space-y-1">
              <Label className="text-xs">Pastille</Label>
              <input
                type="color"
                name="hex"
                defaultValue="#cccccc"
                className="h-10 w-14 cursor-pointer rounded-md border border-[var(--color-border)] bg-white p-1"
              />
            </div>
            <Field label="Stock initial" name="stock" type="number" min="0" defaultValue="0" className="w-24" />
            <Field label="Prix spécifique (€) — optionnel" name="customPrice" type="number" step="0.01" min="0.01" className="w-44" placeholder="hérite du prix global" />
            <SubmitButton size="sm">Ajouter</SubmitButton>
          </ActionForm>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            La référence interne (SKU) est générée automatiquement. Sans prix
            spécifique, la couleur suit le prix global.
          </p>
        </div>
      </Card>

      {/* ── Bloc 4 : photos ──────────────────────────────────────────────── */}
      <Card className="p-6">
        <h2 className="mb-4 font-medium">Photos</h2>
        <div className="flex flex-wrap gap-4">
          {images.length === 0 && <p className="text-sm text-[var(--color-muted)]">Aucune photo.</p>}
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
                  <SubmitButton size="sm" variant="ghost" className="h-8 w-8 px-0" aria-label="Supprimer la photo">
                    <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                  </SubmitButton>
                </form>
              </div>
              {img.variant_id && variantLabelById.get(img.variant_id) && (
                <p className="mt-0.5 text-center text-[10px] font-medium text-[var(--color-primary-600)]">
                  🎨 {variantLabelById.get(img.variant_id)}
                </p>
              )}
              {i === 0 && (
                <p className="mt-0.5 text-center text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                  Principale
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <h3 className="mb-2 text-sm font-medium">Ajouter des photos</h3>
          <ActionForm action={uploadImage} successMessage="Photo ajoutée." className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <input
              type="file"
              name="file"
              accept="image/*"
              required
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primary-600)] file:px-3 file:py-1.5 file:text-white"
            />
            {variants.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Couleur associée</Label>
                <select
                  name="variantId"
                  defaultValue=""
                  className="h-10 rounded-md border border-[var(--color-border)] bg-white px-2 text-sm"
                >
                  <option value="">Toutes les couleurs</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {variantLabel(v)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Field label="Texte alternatif (optionnel)" name="alt_fr" className="w-52" maxLength={200} placeholder="Description de la photo" />
            <SubmitButton size="sm">Téléverser</SubmitButton>
          </ActionForm>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            JPEG, PNG, WebP, AVIF, GIF — 5 Mo max. La première photo est la photo principale.
          </p>

          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-medium text-[var(--color-muted)] hover:underline">
              Avancé : ajouter une photo par URL
            </summary>
            <ActionForm action={addImage} successMessage="Photo ajoutée." resetOnSuccess className="mt-3 flex flex-wrap items-end gap-3">
              <input type="hidden" name="productId" value={product.id} />
              <Field label="URL" name="url" type="url" required className="w-72" placeholder="https://…" />
              <Field label="Alt (FR)" name="alt_fr" className="w-40" maxLength={200} />
              <Field label="Alt (EN)" name="alt_en" className="w-40" maxLength={200} />
              <SubmitButton size="sm" variant="secondary">Ajouter par URL</SubmitButton>
            </ActionForm>
          </details>
        </div>
      </Card>

      {/* ── Bloc 5 : contenu de la page produit ──────────────────────────── */}
      <Card className="p-6">
        <h2 className="mb-4 font-medium">Contenu produit</h2>
        <ActionForm action={updateProduct} successMessage="Contenu enregistré." className="space-y-4">
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="status" value={product.status} />
          <UnsavedGuard />
          <LangTabs panels={langPanels} />

          <details className="rounded-md border border-[var(--color-border)] p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Référencement &amp; informations avancées
            </summary>
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {routing.locales.map((loc) => (
                  <div key={loc} className="space-y-3 rounded-md bg-[var(--color-bg)]/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                      SEO {LOCALE_LABEL[loc] ?? loc}
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor={`seo_title_${loc}`}>Titre</Label>
                      <Input
                        id={`seo_title_${loc}`}
                        name={`seo_title_${loc}`}
                        maxLength={70}
                        defaultValue={seo.title?.[loc] ?? ""}
                        placeholder="≤ 70 caractères"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`seo_description_${loc}`}>Description</Label>
                      <Input
                        id={`seo_description_${loc}`}
                        name={`seo_description_${loc}`}
                        maxLength={320}
                        defaultValue={seo.description?.[loc] ?? ""}
                        placeholder="≤ 320 caractères"
                      />
                    </div>
                  </div>
                ))}
              </div>

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
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input
                    type="checkbox"
                    name="featured"
                    defaultChecked={product.featured ?? false}
                    className="h-4 w-4"
                  />
                  <span>
                    <strong>Vedette</strong> (accueil)
                  </span>
                </label>
              </div>
            </div>
          </details>

          <SubmitButton>Enregistrer le contenu</SubmitButton>
        </ActionForm>
      </Card>

      {/* Zone de danger — suppression définitive */}
      <Card className="border-[var(--color-danger)]/40 p-6">
        <h2 className="mb-1 font-medium text-[var(--color-danger)]">
          Zone de danger
        </h2>
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          Supprime définitivement ce produit, ses couleurs, son stock et ses
          photos. Les commandes déjà passées sont conservées (historique).
          Action irréversible.
        </p>
        <details>
          <summary className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-danger)]/50 px-4 py-2 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10">
            <Trash2 className="h-4 w-4" /> Supprimer le produit
          </summary>
          <form action={deleteProduct} className="mt-3">
            <input type="hidden" name="id" value={product.id} />
            <SubmitButton variant="destructive" size="sm">
              <Trash2 className="h-4 w-4" /> Oui, supprimer définitivement
            </SubmitButton>
          </form>
        </details>
      </Card>
    </div>
  );
}

/** Indicateur clé du bandeau d'état. */
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{children}</p>
    </div>
  );
}

/** Compact labelled input used across the small forms. */
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

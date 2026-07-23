"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/form-state";

export type VariantRow = {
  id: string;
  sku: string;
  color: string;
  hex: string | null;
  active: boolean;
  /** Prix affiché de la variante, en euros. */
  priceEuros: number;
  /** True si la variante ne suit pas le prix global. */
  isCustom: boolean;
  quantity: number;
  reorderPoint: number;
  costEuros: number | null;
  barcode: string | null;
  weightG: number | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

/**
 * Tableau compact « Couleurs & stock » : une ligne par couleur, un seul bouton
 * Enregistrer pour tout le tableau (état actif, stock, prix hérité/spécifique,
 * libellé + pastille). Les champs techniques (SKU, coût, code-barres, poids,
 * seuil) restent accessibles ligne par ligne via « Avancé ».
 */
export function VariantsEditor({
  productId,
  variants,
  globalEffectiveEuros,
  saveAction,
  deleteAction,
}: {
  productId: string;
  variants: VariantRow[];
  /** Prix global affiché (promo comprise), en euros — null si indéterminé. */
  globalEffectiveEuros: number | null;
  saveAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(saveAction, {});
  const [custom, setCustom] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(variants.map((v) => [v.id, v.isCustom])),
  );

  useEffect(() => {
    if (state.ok) toast.success("Couleurs et stocks enregistrés.");
  }, [state]);

  if (variants.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        Aucune couleur. Ajoute-en une ci-dessous — le produit a besoin d&apos;au
        moins une couleur active pour être vendable.
      </p>
    );
  }

  return (
    <>
      <form action={formAction} id="variants-form" className="space-y-4">
        <input type="hidden" name="productId" value={productId} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th className="py-2 pr-3 font-medium">Couleur</th>
                <th className="py-2 pr-3 font-medium">Active</th>
                <th className="py-2 pr-3 font-medium">Stock</th>
                <th className="py-2 pr-3 font-medium">Prix</th>
                <th className="py-2 font-medium sr-only">Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <VariantLine
                  key={v.id}
                  v={v}
                  custom={custom[v.id] ?? false}
                  setCustom={(val) => setCustom((c) => ({ ...c, [v.id]: val }))}
                  globalEffectiveEuros={globalEffectiveEuros}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3">
          <SubmitButton>Enregistrer les couleurs et stocks</SubmitButton>
          {state.error && (
            <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
          )}
        </div>
      </form>

      {/* Formulaires de suppression hors du formulaire principal (pas de forms imbriqués). */}
      {variants.map((v) => (
        <form key={v.id} id={`delete-variant-${v.id}`} action={deleteAction}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={v.id} />
        </form>
      ))}
    </>
  );
}

function VariantLine({
  v,
  custom,
  setCustom,
  globalEffectiveEuros,
}: {
  v: VariantRow;
  custom: boolean;
  setCustom: (val: boolean) => void;
  globalEffectiveEuros: number | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-b border-[var(--color-border)]/60">
        <td className="py-2.5 pr-3">
          <input type="hidden" name="variantIds" value={v.id} />
          <div className="flex items-center gap-2">
            <input
              type="color"
              name={`hex_${v.id}`}
              defaultValue={v.hex ?? "#cccccc"}
              aria-label={`Pastille de la couleur ${v.color}`}
              className="h-7 w-7 shrink-0 cursor-pointer rounded-full border border-[var(--color-border)] bg-transparent p-0.5"
            />
            <Input
              name={`color_${v.id}`}
              defaultValue={v.color}
              maxLength={60}
              aria-label="Nom de la couleur"
              className="h-9 w-28"
            />
          </div>
        </td>
        <td className="py-2.5 pr-3">
          <input
            type="checkbox"
            name={`active_${v.id}`}
            defaultChecked={v.active}
            aria-label={`Couleur ${v.color} active`}
            className="h-4 w-4"
          />
        </td>
        <td className="py-2.5 pr-3">
          <Input
            name={`quantity_${v.id}`}
            type="number"
            min="0"
            defaultValue={String(v.quantity)}
            aria-label={`Stock ${v.color}`}
            className="h-9 w-20"
          />
        </td>
        <td className="py-2.5 pr-3">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
              <input
                type="checkbox"
                name={`useCustom_${v.id}`}
                checked={custom}
                onChange={(e) => setCustom(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Spécifique
            </label>
            {custom ? (
              <Input
                name={`price_${v.id}`}
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={v.priceEuros.toFixed(2)}
                aria-label={`Prix spécifique ${v.color}`}
                className="h-9 w-24"
              />
            ) : (
              <span className="whitespace-nowrap text-[var(--color-muted)]">
                Global{globalEffectiveEuros != null ? ` · ${fmt(globalEffectiveEuros)}` : ""}
              </span>
            )}
          </div>
        </td>
        <td className="py-2.5 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="rounded-md px-2 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-bg)]"
              aria-expanded={open}
            >
              {open ? "Réduire" : "Avancé"}
            </button>
            <button
              type="submit"
              form={`delete-variant-${v.id}`}
              aria-label={`Supprimer la couleur ${v.color}`}
              className="rounded-md p-1.5 hover:bg-[var(--color-danger)]/10"
            >
              <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
            </button>
          </div>
        </td>
      </tr>
      {/* Monté en permanence (hidden) pour que les valeurs soient toujours soumises. */}
      <tr
        hidden={!open}
        className="border-b border-[var(--color-border)]/60 bg-[var(--color-bg)]/60"
      >
        <td colSpan={5} className="px-2 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <AdvField label="SKU" name={`sku_${v.id}`} defaultValue={v.sku} className="w-40" maxLength={120} />
              <AdvField label="Coût d'achat (€)" name={`cost_${v.id}`} type="number" step="0.01" min="0" defaultValue={v.costEuros != null ? v.costEuros.toFixed(2) : ""} className="w-28" />
              <AdvField label="Code-barres" name={`barcode_${v.id}`} defaultValue={v.barcode ?? ""} className="w-36" maxLength={120} />
              <AdvField label="Poids (g)" name={`weight_${v.id}`} type="number" min="0" defaultValue={v.weightG != null ? String(v.weightG) : ""} className="w-24" />
              <AdvField label="Seuil d'alerte stock" name={`reorder_${v.id}`} type="number" min="0" defaultValue={String(v.reorderPoint)} className="w-24" />
            </div>
          </td>
        </tr>
    </>
  );
}

function AdvField({
  label,
  className,
  ...props
}: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1">
      <span className="block text-xs text-[var(--color-muted)]">{label}</span>
      <Input className={className} {...props} />
    </div>
  );
}

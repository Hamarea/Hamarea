"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/form-state";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

/**
 * Bloc « Prix » : un prix normal, un prix promo optionnel, un seul bouton.
 * Aperçu immédiat du rendu client, garde-fous intégrés :
 *  - promo ≥ prix normal refusée avant envoi ;
 *  - baisse de plus de 30 % du prix affiché → confirmation explicite.
 */
export function PricingForm({
  productId,
  initialPrice,
  initialPromo,
  specificCount,
  action,
}: {
  productId: string;
  /** Prix normal actuel en euros (0 si aucune variante). */
  initialPrice: number;
  /** Prix promo actuel en euros, ou null si pas de promotion. */
  initialPromo: number | null;
  /** Nombre de couleurs ayant un prix spécifique (hors prix global). */
  specificCount: number;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [price, setPrice] = useState(initialPrice ? initialPrice.toFixed(2) : "");
  const [promo, setPromo] = useState(initialPromo ? initialPromo.toFixed(2) : "");

  useEffect(() => {
    if (state.ok) toast.success("Prix mis à jour.");
  }, [state]);

  const priceNum = Number(price.replace(",", "."));
  const promoNum = promo.trim() ? Number(promo.replace(",", ".")) : null;
  const validPrice = Number.isFinite(priceNum) && priceNum > 0;
  const validPromo =
    promoNum == null || (Number.isFinite(promoNum) && promoNum > 0);
  const promoTooHigh =
    validPrice && promoNum != null && validPromo && promoNum >= priceNum;

  const effective = promoNum ?? priceNum;
  const previousEffective = initialPromo ?? initialPrice;
  const saving = promoNum != null && validPrice ? priceNum - promoNum : 0;
  const savingPct =
    promoNum != null && validPrice ? Math.round((saving / priceNum) * 100) : 0;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!validPrice || promoTooHigh) {
      e.preventDefault();
      return;
    }
    if (
      previousEffective > 0 &&
      Number.isFinite(effective) &&
      effective < previousEffective * 0.7
    ) {
      const drop = Math.round((1 - effective / previousEffective) * 100);
      const okDrop = window.confirm(
        `Le prix affiché passe de ${fmt(previousEffective)} à ${fmt(effective)}, ` +
          `soit une baisse de ${drop} %. Confirmer cette modification ?`,
      );
      if (!okDrop) e.preventDefault();
    }
  };

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />

      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-md">
        <div className="space-y-1.5">
          <Label htmlFor="global-price">Prix de vente (EUR)</Label>
          <Input
            id="global-price"
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="global-promo">Prix promotionnel (optionnel)</Label>
          <Input
            id="global-promo"
            name="promo"
            type="number"
            step="0.01"
            min="0.01"
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
            placeholder="Aucune promotion"
          />
        </div>
      </div>

      {promoTooHigh && (
        <p className="text-sm text-[var(--color-danger)]">
          Le prix promotionnel doit être inférieur au prix normal.
        </p>
      )}

      {/* Aperçu client */}
      {validPrice && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
            Aperçu client
          </p>
          {promoNum != null && !promoTooHigh && validPromo ? (
            <p className="mt-1">
              <span className="text-lg font-semibold">{fmt(promoNum)}</span>{" "}
              <span className="text-[var(--color-muted)] line-through">
                {fmt(priceNum)}
              </span>
              <span className="ml-2 rounded-full bg-[var(--color-danger)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--color-danger)]">
                −{savingPct} %
              </span>
              <span className="ml-2 text-xs text-[var(--color-muted)]">
                Économie client : {fmt(saving)}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-lg font-semibold">{fmt(priceNum)}</p>
          )}
        </div>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="applyAll" defaultChecked className="mt-0.5 h-4 w-4" />
        <span>
          Appliquer à toutes les couleurs
          {specificCount > 0 && (
            <span className="block text-xs text-[var(--color-muted)]">
              Remplace aussi les {specificCount} prix spécifique{specificCount > 1 ? "s" : ""} —
              décoche pour les préserver.
            </span>
          )}
        </span>
      </label>

      <SubmitButton disabled={!validPrice || promoTooHigh}>
        Mettre à jour les prix
      </SubmitButton>
      {state.error && (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      )}
    </form>
  );
}

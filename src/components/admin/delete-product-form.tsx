"use client";

import { Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteProduct } from "@/app/[locale]/admin/products/[id]/actions";

/**
 * Delete-a-product form with a native confirmation. Reused in the products list
 * (icon only) and on the product sheet header (with a label). The server action
 * cascades variants/images/stock and redirects back to the list on success.
 */
export function DeleteProductForm({ id, label }: { id: string; label?: string }) {
  return (
    <form
      action={deleteProduct}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Supprimer définitivement ce produit (variantes, photos et stock inclus) ? Cette action est irréversible.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="ghost" size="sm" aria-label="Supprimer le produit">
        <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
        {label ? <span className="ml-1">{label}</span> : null}
      </SubmitButton>
    </form>
  );
}

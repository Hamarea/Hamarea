import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { createClient } from "@/lib/supabase/server";
import { setInventory } from "@/app/[locale]/admin/products/[id]/actions";

type InvRow = {
  variant_id: string;
  warehouse_id: string;
  quantity: number;
  reserved: number;
  reorder_point: number;
  product_variants: {
    sku: string;
    product_id: string;
    option_values: Record<string, unknown> | null;
    products: { name_i18n: Record<string, string> | null } | null;
  };
};

export default async function AdminStockPage() {
  const t = await getTranslations();
  const supabase = await createClient();

  let rows: InvRow[] = [];
  try {
    const { data } = await (supabase as unknown as {
      from: (t: string) => { select: (q: string) => Promise<{ data: InvRow[] | null }> };
    })
      .from("inventory")
      .select(
        "variant_id, warehouse_id, quantity, reserved, reorder_point, product_variants(sku, product_id, option_values, products(name_i18n))",
      );
    rows = data ?? [];
  } catch {
    rows = [];
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">{t("admin.stock")}</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Modifie la quantité et le seuil d&apos;alerte directement ici, puis
        « Enregistrer ». « Réservé » = quantité en cours de commande. « Stock
        bas » s&apos;affiche quand le disponible passe sous le seuil.
      </p>
      <Card>
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium">Stock (modifiable)</th>
              <th className="px-4 py-3 font-medium text-right">Réservé</th>
              <th className="px-4 py-3 font-medium">Alerte</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-[var(--color-muted)]">
                  Aucun stock défini.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const available = r.quantity - r.reserved;
                const low = available <= r.reorder_point;
                const pv = r.product_variants;
                const productName =
                  pv?.products?.name_i18n?.fr ??
                  pv?.products?.name_i18n?.en ??
                  "Produit";
                const ov = (pv?.option_values ?? {}) as Record<string, unknown>;
                const color = (ov.color ?? ov.Couleur ?? ov.couleur) as
                  | string
                  | undefined;
                return (
                  <tr key={r.variant_id} className="border-b border-[var(--color-border)]">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {productName}
                        {color ? ` · ${color}` : ""}
                      </div>
                      <div className="font-mono text-[11px] text-[var(--color-muted)]">
                        {pv?.sku ?? r.variant_id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ActionForm
                        action={setInventory}
                        successMessage="Stock mis à jour."
                        className="flex flex-wrap items-end gap-2"
                      >
                        <input type="hidden" name="productId" value={pv?.product_id ?? ""} />
                        <input type="hidden" name="variantId" value={r.variant_id} />
                        <input type="hidden" name="warehouseId" value={r.warehouse_id} />
                        <div>
                          <label className="block text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                            Quantité
                          </label>
                          <Input
                            name="quantity"
                            type="number"
                            min={0}
                            defaultValue={String(r.quantity)}
                            className="w-24"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                            Seuil d&apos;alerte
                          </label>
                          <Input
                            name="reorder_point"
                            type="number"
                            min={0}
                            defaultValue={String(r.reorder_point)}
                            className="w-24"
                          />
                        </div>
                        <SubmitButton size="sm" variant="outline">
                          Enregistrer
                        </SubmitButton>
                      </ActionForm>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.reserved}</td>
                    <td className="px-4 py-3">
                      {low ? (
                        <Badge variant="danger">Stock bas</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

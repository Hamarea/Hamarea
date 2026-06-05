import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

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
      <h1 className="font-display text-3xl mb-6">{t("admin.stock")}</h1>
      <Card>
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium text-right">Quantité</th>
              <th className="px-4 py-3 font-medium text-right">Réservé</th>
              <th className="px-4 py-3 font-medium text-right">Seuil</th>
              <th className="px-4 py-3 font-medium">Alerte</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-muted)]">
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
                    <td className="px-4 py-3 text-right">{r.quantity}</td>
                    <td className="px-4 py-3 text-right">{r.reserved}</td>
                    <td className="px-4 py-3 text-right">{r.reorder_point}</td>
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

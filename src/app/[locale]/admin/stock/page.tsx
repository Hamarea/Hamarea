import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { FilterChips } from "@/components/admin/filter-chips";
import { QuantityStepper } from "@/components/admin/quantity-stepper";
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

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const t = await getTranslations();
  const supabase = await createClient();
  const sp = await searchParams;
  const f = sp.f === "low" || sp.f === "out" ? sp.f : "";

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

  // Compute availability buckets: out (≤0) · low (0<avail≤seuil) · ok.
  const enriched = rows.map((r) => ({ ...r, available: r.quantity - r.reserved }));
  const isOut = (a: number) => a <= 0;
  const isLow = (a: number, seuil: number) => a > 0 && a <= seuil;
  const counts = {
    all: enriched.length,
    low: enriched.filter((r) => isLow(r.available, r.reorder_point)).length,
    out: enriched.filter((r) => isOut(r.available)).length,
  };
  const filtered =
    f === "out"
      ? enriched.filter((r) => isOut(r.available))
      : f === "low"
        ? enriched.filter((r) => isLow(r.available, r.reorder_point))
        : enriched;

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl">{t("admin.stock")}</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Modifie la quantité et le seuil d&apos;alerte directement ici, puis
        « Enregistrer ». « Réservé » = quantité en cours de commande.
        « Disponible » = quantité − réservé.
      </p>

      <FilterChips
        items={[
          { label: "Tous", href: { pathname: "/admin/stock" }, active: !f, count: counts.all },
          {
            label: "Stock bas",
            href: { pathname: "/admin/stock", query: { f: "low" } },
            active: f === "low",
            count: counts.low,
          },
          {
            label: "Rupture",
            href: { pathname: "/admin/stock", query: { f: "out" } },
            active: f === "out",
            count: counts.out,
          },
        ]}
      />

      <Card>
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium">Stock (modifiable)</th>
              <th className="px-4 py-3 text-right font-medium">Réservé</th>
              <th className="px-4 py-3 text-right font-medium">Disponible</th>
              <th className="px-4 py-3 font-medium">État</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-muted)]">
                  {enriched.length === 0
                    ? "Aucun stock défini. Ajoutez une variante avec un prix sur une fiche produit."
                    : "Aucune variante dans ce filtre. 🎉"}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const available = r.available;
                const out = isOut(available);
                const low = isLow(available, r.reorder_point);
                const pv = r.product_variants;
                const productName =
                  pv?.products?.name_i18n?.fr ?? pv?.products?.name_i18n?.en ?? "Produit";
                const ov = (pv?.option_values ?? {}) as Record<string, unknown>;
                const color = (ov.color ?? ov.Couleur ?? ov.couleur) as string | undefined;
                return (
                  <tr key={r.variant_id} className="border-b border-[var(--color-border)] last:border-0">
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
                          <QuantityStepper name="quantity" defaultValue={r.quantity} />
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
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={out ? "font-semibold text-[var(--color-danger)]" : low ? "font-medium text-amber-700" : ""}>
                        {available}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {out ? (
                        <Badge variant="danger">Rupture</Badge>
                      ) : low ? (
                        <Badge variant="warning">Stock bas</Badge>
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

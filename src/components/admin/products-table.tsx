"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatMoney } from "@/lib/utils";
import { bulkSetStatus } from "@/app/[locale]/admin/products/actions";
import { setProductStatus } from "@/app/[locale]/admin/products/actions";

export type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  status: "draft" | "active" | "archived";
  price_cents: number | null;
  currency: string;
  stock: number | null;
  image: string | null;
  preorder: boolean;
  created_at: string;
};

const STATUSES = ["draft", "active", "archived"] as const;
const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  active: "Active",
  archived: "Archivée",
};

/** Product list with row selection + bulk status actions (SOTA data-table tasks). */
export function ProductsTable({ rows }: { rows: AdminProductRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allChecked = rows.length > 0 && selected.size === rows.length;

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));

  return (
    <div>
      {selected.size > 0 && (
        <form
          action={bulkSetStatus}
          className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-4 py-2.5 text-sm"
        >
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <span className="font-medium">{selected.size} sélectionné(s)</span>
          <span className="text-[var(--color-muted)]">→ passer en</span>
          <select
            name="status"
            defaultValue="active"
            className="h-9 rounded-md border border-[var(--color-border)] bg-white px-2 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <SubmitButton size="sm">Appliquer</SubmitButton>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-[var(--color-muted)] hover:underline"
          >
            Annuler
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <tr className="text-left">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="Tout sélectionner"
                  className="h-4 w-4"
                />
              </th>
              <th className="px-3 py-3 font-medium">Produit</th>
              <th className="px-3 py-3 font-medium">Prix</th>
              <th className="px-3 py-3 font-medium">Stock</th>
              <th className="px-3 py-3 font-medium">Statut</th>
              <th className="px-3 py-3 font-medium">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-muted)]">
                  Aucun produit.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[var(--color-border)] last:border-0 even:bg-[var(--color-bg)]/40"
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      aria-label={`Sélectionner ${p.name}`}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-md border border-[var(--color-border)] object-cover"
                        />
                      ) : (
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-dashed border-[var(--color-border)] text-[10px] text-[var(--color-muted)]">
                          —
                        </span>
                      )}
                      <span className="min-w-0">
                        <Link
                          href={`/admin/products/${p.id}` as never}
                          className="font-medium text-[var(--color-primary-600)] hover:underline"
                        >
                          {p.name}
                        </Link>
                        {p.preorder && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                            Précommande
                          </span>
                        )}
                        <span className="block truncate text-xs text-[var(--color-muted)]">
                          {p.slug}
                          {p.brand ? ` · ${p.brand}` : ""}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {p.price_cents != null ? formatMoney(p.price_cents, p.currency) : "—"}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {p.stock == null ? (
                      "—"
                    ) : (
                      <span
                        className={
                          p.stock <= 0 ? "font-medium text-[var(--color-danger)]" : ""
                        }
                      >
                        {p.stock}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <form action={setProductStatus} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={p.id} />
                      <select
                        name="status"
                        defaultValue={p.status}
                        className="h-8 rounded-md border border-[var(--color-border)] bg-white px-1.5 text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      <SubmitButton variant="ghost" size="sm" className="h-8 px-2">
                        OK
                      </SubmitButton>
                    </form>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-muted)]">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { createCoupon, toggleCoupon, deleteCoupon } from "./actions";

type CouponRow = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_subtotal_cents: number;
  used_count: number;
  ends_at: string | null;
  usage_limit: number | null;
  active: boolean;
};

export default async function AdminCouponsPage() {
  const t = await getTranslations();
  const supabase = await createClient();

  let coupons: CouponRow[] = [];
  try {
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          order: (k: string, o: { ascending: boolean }) => Promise<{ data: CouponRow[] | null }>;
        };
      };
    })
      .from("coupons")
      .select("id, code, type, value, min_subtotal_cents, used_count, ends_at, usage_limit, active")
      .order("created_at", { ascending: false });
    coupons = data ?? [];
  } catch {
    coupons = [];
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">{t("admin.coupons")}</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Réduction</th>
                <th className="px-4 py-3 font-medium">Min. panier</th>
                <th className="px-4 py-3 font-medium">Utilisé</th>
                <th className="px-4 py-3 font-medium">Validité</th>
                <th className="px-4 py-3 font-medium">État</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--color-muted)]">
                    Aucun coupon.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--color-border)]">
                    <td className="px-4 py-3 font-mono">{c.code}</td>
                    <td className="px-4 py-3">
                      {c.type === "percent"
                        ? `−${c.value} %`
                        : `−${formatMoney(c.value)}`}
                    </td>
                    <td className="px-4 py-3">{formatMoney(c.min_subtotal_cents)}</td>
                    <td className="px-4 py-3">
                      {c.usage_limit ? `${c.used_count}/${c.usage_limit}` : c.used_count}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-muted)]">
                      {c.ends_at
                        ? `jusqu'au ${new Date(c.ends_at).toLocaleDateString("fr-FR")}`
                        : "illimité"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={c.active ? "success" : "outline"}>
                        {c.active ? "Actif" : "Inactif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <form action={toggleCoupon}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="active" value={String(c.active)} />
                          <SubmitButton type="submit" variant="ghost" size="sm">
                            {c.active ? "Désactiver" : "Activer"}
                          </SubmitButton>
                        </form>
                        <form action={deleteCoupon}>
                          <input type="hidden" name="id" value={c.id} />
                          <SubmitButton
                            type="submit"
                            variant="ghost"
                            size="sm"
                            aria-label="Supprimer le coupon"
                          >
                            <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                          </SubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-medium">Nouveau coupon</h2>
          <ActionForm action={createCoupon} className="space-y-3" successMessage="Coupon créé." resetOnSuccess>
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" required minLength={2} maxLength={40} placeholder="BIENVENUE10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              >
                <option value="percent">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (centimes)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="value">Valeur</Label>
              <Input id="value" name="value" type="number" min={1} required />
              <p className="text-xs text-[var(--color-muted)]">
                % pour un pourcentage, sinon centimes (ex. 500 = 5 €).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="min_subtotal_cents">Minimum panier (centimes)</Label>
              <Input id="min_subtotal_cents" name="min_subtotal_cents" type="number" min={0} defaultValue={0} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ends_at">Date limite</Label>
                <Input id="ends_at" name="ends_at" type="date" />
                <p className="text-xs text-[var(--color-muted)]">Vide = illimité.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="usage_limit">Limite d&apos;usage</Label>
                <Input id="usage_limit" name="usage_limit" type="number" min={1} placeholder="∞" />
              </div>
            </div>
            <SubmitButton>Créer</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { saveSite, saveShipping } from "./actions";

type SiteValue = { name: string; supportEmail: string };
type ShippingValue = { freeAbove: number; flatRate: number };

const DEFAULT_SITE: SiteValue = { name: "Hamarea", supportEmail: "hello@hamarea.com" };
const DEFAULT_SHIPPING: ShippingValue = { freeAbove: 7900, flatRate: 590 };

async function loadSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const supabase = await createClient();
    type Row = { value: T | null };
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          eq: (k: string, v: string) => {
            maybeSingle: () => Promise<{ data: Row | null }>;
          };
        };
      };
    })
      .from("shop_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return data?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export default async function AdminSettingsPage() {
  const t = await getTranslations();
  const [site, shipping] = await Promise.all([
    loadSetting<SiteValue>("site", DEFAULT_SITE),
    loadSetting<ShippingValue>("shipping", DEFAULT_SHIPPING),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">{t("admin.settings")}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-medium mb-4">Boutique</h2>
          <form action={saveSite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom de la boutique</Label>
              <Input id="name" name="name" defaultValue={site.name} required maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supportEmail">E-mail de contact</Label>
              <Input
                id="supportEmail"
                name="supportEmail"
                type="email"
                defaultValue={site.supportEmail}
                required
                maxLength={200}
              />
            </div>
            <Button type="submit">Enregistrer</Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="font-medium mb-4">Livraison</h2>
          <form action={saveShipping} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="freeAbove">Port offert à partir de (centimes)</Label>
              <Input
                id="freeAbove"
                name="freeAbove"
                type="number"
                min={0}
                defaultValue={shipping.freeAbove}
                required
              />
              <p className="text-xs text-[var(--color-muted)]">
                {(shipping.freeAbove / 100).toFixed(2)} € actuellement.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flatRate">Forfait livraison standard (centimes)</Label>
              <Input
                id="flatRate"
                name="flatRate"
                type="number"
                min={0}
                defaultValue={shipping.flatRate}
                required
              />
              <p className="text-xs text-[var(--color-muted)]">
                {(shipping.flatRate / 100).toFixed(2)} € actuellement.
              </p>
            </div>
            <Button type="submit">Enregistrer</Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="font-medium mb-2">Équipe &amp; rôles</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Gestion des rôles (admin / staff / customer) sur{" "}
            <code>profiles.role</code> — interface à venir. Pour l&apos;instant,
            promouvoir un utilisateur en SQL :
          </p>
          <code className="mt-2 block rounded bg-[var(--color-bg)] px-2 py-1 text-xs">
            update profiles set role = &apos;admin&apos; where email = &apos;moi@hamarea.com&apos;;
          </code>
        </Card>

        <Card className="p-6">
          <h2 className="font-medium mb-2">Intégrations</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Stripe, Resend, Shippo — clés dans <code>.env.local</code>.
          </p>
        </Card>
      </div>
    </div>
  );
}

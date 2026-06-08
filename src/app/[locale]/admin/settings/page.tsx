import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Link } from "@/i18n/navigation";
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
            <SubmitButton>Enregistrer</SubmitButton>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="font-medium mb-4">Livraison</h2>
          <form action={saveShipping} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="freeAbove">Port offert à partir de (€)</Label>
              <Input
                id="freeAbove"
                name="freeAbove"
                type="number"
                step="0.01"
                min={0}
                defaultValue={(shipping.freeAbove / 100).toFixed(2)}
                required
              />
              <p className="text-xs text-[var(--color-muted)]">
                Montant du panier au-delà duquel la livraison est offerte.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flatRate">Forfait livraison standard (€)</Label>
              <Input
                id="flatRate"
                name="flatRate"
                type="number"
                step="0.01"
                min={0}
                defaultValue={(shipping.flatRate / 100).toFixed(2)}
                required
              />
              <p className="text-xs text-[var(--color-muted)]">
                Frais de port appliqués en dessous du seuil ci-dessus.
              </p>
            </div>
            <SubmitButton>Enregistrer</SubmitButton>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="font-medium mb-2">Équipe &amp; rôles</h2>
          <p className="text-sm text-[var(--color-muted)]">
            La gestion des rôles et des accès (admin / staff / client) se fait
            dans{" "}
            <Link href="/admin/customers" className="text-[var(--color-primary-600)] underline">
              Clients
            </Link>{" "}
            (réservé aux administrateurs).
          </p>
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

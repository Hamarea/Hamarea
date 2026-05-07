import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";

export default async function AdminSettingsPage() {
  const t = await getTranslations();
  return (
    <div>
      <h1 className="font-display text-3xl mb-6">{t("admin.settings")}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-medium mb-2">Boutique</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Nom, devises, langues, frais de port — table{" "}
            <code>shop_settings</code>.
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="font-medium mb-2">Équipe & rôles</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Gestion des rôles (admin / staff / customer) sur{" "}
            <code>profiles.role</code>.
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="font-medium mb-2">Intégrations</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Stripe, Resend, Shippo — clés à configurer dans{" "}
            <code>.env.local</code>.
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="font-medium mb-2">Audit</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Historique des actions admin via la table <code>audit_logs</code>.
          </p>
        </Card>
      </div>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";

export default async function AdminCouponsPage() {
  const t = await getTranslations();
  return (
    <div>
      <h1 className="font-display text-3xl mb-6">{t("admin.coupons")}</h1>
      <Card className="p-8 text-[var(--color-muted)]">
        Création/édition de coupons à venir (table <code>coupons</code> déjà
        présente). Endpoints : <code>POST /api/coupons</code>,{" "}
        <code>GET /api/coupons</code>.
      </Card>
    </div>
  );
}

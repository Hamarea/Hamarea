import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";

export default async function AddressesPage() {
  const t = await getTranslations();
  return (
    <div>
      <h1 className="font-display text-3xl mb-6">{t("account.addresses")}</h1>
      <Card className="p-8 text-[var(--color-muted)]">
        Adresses (livraison / facturation) — table <code>addresses</code>.
      </Card>
    </div>
  );
}

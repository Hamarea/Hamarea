import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";

export default async function AdminReviewsPage() {
  const t = await getTranslations();
  return (
    <div>
      <h1 className="font-display text-3xl mb-6">{t("admin.reviews")}</h1>
      <Card className="p-8 text-[var(--color-muted)]">
        Modération des avis (table <code>reviews</code>, statuts pending /
        approved / rejected).
      </Card>
    </div>
  );
}

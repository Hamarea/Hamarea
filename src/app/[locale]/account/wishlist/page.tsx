import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";

export default async function WishlistPage() {
  const t = await getTranslations();
  return (
    <div>
      <h1 className="font-display text-3xl mb-6">{t("account.wishlist")}</h1>
      <Card className="p-8 text-[var(--color-muted)]">
        Favoris — tables <code>wishlists</code> + <code>wishlist_items</code>.
      </Card>
    </div>
  );
}

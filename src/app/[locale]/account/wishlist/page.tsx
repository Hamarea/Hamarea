import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { removeFromWishlist } from "./actions";

type ItemRow = {
  id: string;
  added_at: string;
  product: {
    slug: string;
    name_i18n: Record<string, string>;
  } | null;
};

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let items: ItemRow[] = [];
  if (user) {
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          order: (k: string, o: { ascending: boolean }) => Promise<{ data: ItemRow[] | null }>;
        };
      };
    })
      .from("wishlist_items")
      .select("id, added_at, product:product_id(slug, name_i18n)")
      .order("added_at", { ascending: false });
    items = data ?? [];
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">{t("account.wishlist")}</h1>
      {items.length === 0 ? (
        <Card className="p-8 text-center text-[var(--color-muted)]">
          Votre liste de favoris est vide.
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => {
            const name =
              it.product?.name_i18n?.[locale] ??
              it.product?.name_i18n?.fr ??
              it.product?.slug ??
              "Produit indisponible";
            return (
              <li key={it.id}>
                <Card className="flex items-center justify-between p-4">
                  <div className="text-sm">
                    {it.product ? (
                      <Link href="/sacoche" className="font-medium hover:underline">
                        {name}
                      </Link>
                    ) : (
                      <span className="italic text-[var(--color-muted)]">{name}</span>
                    )}
                  </div>
                  <form action={removeFromWishlist}>
                    <input type="hidden" name="id" value={it.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Retirer
                    </Button>
                  </form>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

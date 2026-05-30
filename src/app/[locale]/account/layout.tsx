import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/account/logout-button";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale: "fr" });

  const t = await getTranslations();

  return (
    <section className="container-page py-12 grid gap-8 md:grid-cols-[220px_1fr]">
      <aside className="space-y-1 text-sm">
        <p className="px-3 py-2 text-xs uppercase tracking-wider text-[var(--color-muted)]">
          {t("common.account")}
        </p>
        <Link
          href="/account"
          className="block rounded-md px-3 py-2 hover:bg-[var(--color-primary-50)]"
        >
          {t("account.profile")}
        </Link>
        <Link
          href="/account/orders"
          className="block rounded-md px-3 py-2 hover:bg-[var(--color-primary-50)]"
        >
          {t("account.myOrders")}
        </Link>
        <Link
          href="/account/addresses"
          className="block rounded-md px-3 py-2 hover:bg-[var(--color-primary-50)]"
        >
          {t("account.addresses")}
        </Link>
        <Link
          href="/account/wishlist"
          className="block rounded-md px-3 py-2 hover:bg-[var(--color-primary-50)]"
        >
          {t("account.wishlist")}
        </Link>
        <Link
          href="/account/security"
          className="block rounded-md px-3 py-2 hover:bg-[var(--color-primary-50)]"
        >
          Sécurité
        </Link>
        <div className="pt-4">
          <LogoutButton />
        </div>
      </aside>
      <div>{children}</div>
    </section>
  );
}

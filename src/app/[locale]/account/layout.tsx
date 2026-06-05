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

  // Surface a shortcut to the admin dashboard for staff/admins (there is no
  // other link to /admin in the UI). RLS (`profiles_self_read`) lets a user
  // read its own role.
  const { data: profile } = await (
    supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          eq: (k: string, v: string) => {
            maybeSingle: () => Promise<{ data: { role?: string } | null }>;
          };
        };
      };
    }
  )
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle();
  const isStaff = profile?.role === "admin" || profile?.role === "staff";

  const t = await getTranslations();

  return (
    <section className="container-page py-12 grid gap-8 md:grid-cols-[220px_1fr]">
      <aside className="space-y-1 text-sm">
        <p className="px-3 py-2 text-xs uppercase tracking-wider text-[var(--color-muted)]">
          {t("common.account")}
        </p>
        {isStaff && (
          <Link
            href="/admin"
            className="mb-2 block rounded-md bg-[var(--color-primary-600)] px-3 py-2 font-medium text-white transition hover:opacity-90"
          >
            {t("admin.dashboard")}
          </Link>
        )}
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
          {t("account.security")}
        </Link>
        <Link
          href="/account/privacy"
          className="block rounded-md px-3 py-2 hover:bg-[var(--color-primary-50)]"
        >
          {t("account.privacy")}
        </Link>
        <div className="pt-4">
          <LogoutButton />
        </div>
      </aside>
      <div>{children}</div>
    </section>
  );
}

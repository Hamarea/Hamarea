import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/account/logout-button";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Boxes,
  Tag,
  Star,
  ShieldCheck,
  Settings,
  Truck,
  ScrollText,
} from "lucide-react";

const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseConfigured = isSupabaseConfigured();

  // Backstop: in production without Supabase, /admin must not be reachable.
  // The middleware already returns 404, but if it ever gets bypassed we want
  // the layout to refuse to render the preview stub too.
  if (!supabaseConfigured && process.env.NODE_ENV === "production") {
    notFound();
  }

  let userEmail = "preview@hamarea.local";

  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect({ href: "/login", locale: "fr" });

    type ProfileRow = { role: string | null };
    const { data: profile } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          eq: (k: string, v: string) => {
            maybeSingle: () => Promise<{ data: ProfileRow | null }>;
          };
        };
      };
    })
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .maybeSingle();

    if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
      redirect({ href: "/", locale: "fr" });
    }
    userEmail = user!.email ?? "—";
  }

  const t = await getTranslations();
  const items = [
    { href: "/admin", label: t("admin.dashboard"), icon: LayoutDashboard },
    { href: "/admin/products", label: t("admin.products"), icon: Package },
    { href: "/admin/suppliers", label: "Fournisseurs", icon: Truck },
    { href: "/admin/orders", label: t("admin.orders"), icon: ShoppingBag },
    { href: "/admin/customers", label: t("admin.customers"), icon: Users },
    { href: "/admin/stock", label: t("admin.stock"), icon: Boxes },
    { href: "/admin/coupons", label: t("admin.coupons"), icon: Tag },
    { href: "/admin/reviews", label: t("admin.reviews"), icon: Star },
    { href: "/admin/moderation", label: t("admin.moderation"), icon: ShieldCheck },
    { href: "/admin/settings", label: t("admin.settings"), icon: Settings },
    { href: "/admin/audit", label: "Audit", icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] grid md:grid-cols-[240px_1fr]">
      <aside className="border-r border-[var(--color-border)] bg-[var(--color-primary-700)] text-[var(--color-primary-50)] p-4">
        <p className="font-display text-2xl mb-6 text-white">Hamarea</p>
        {!supabaseConfigured && (
          <p className="mb-4 rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/15 px-2 py-1.5 text-[10px] uppercase tracking-wider text-[var(--color-warning)]">
            Mode aperçu — Supabase non configuré
          </p>
        )}
        <nav className="space-y-1">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href as never}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-white/10"
              >
                <Icon className="h-4 w-4 opacity-80" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 border-t border-white/10 pt-4">
          <p className="text-xs opacity-70 truncate">{userEmail}</p>
          {supabaseConfigured && (
            <div className="mt-2">
              <LogoutButton />
            </div>
          )}
        </div>
      </aside>
      <main className="p-6 md:p-10">{children}</main>
    </div>
  );
}

import { notFound, redirect as nextRedirect } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
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
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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

    // MFA step-up gate — no-lockout: enforced only once THIS account has a
    // verified factor. Fail-open on any error so admins are never locked out.
    let needsStepUp = false;
    try {
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      needsStepUp = Boolean(
        aal && aal.nextLevel === "aal2" && aal.currentLevel === "aal1",
      );
    } catch {
      needsStepUp = false;
    }
    if (needsStepUp) nextRedirect(`/${locale}/mfa?next=/admin`);
  }

  const t = await getTranslations();
  const ic = "h-4 w-4 opacity-80";
  const items = [
    { href: "/admin", label: t("admin.dashboard"), icon: <LayoutDashboard className={ic} /> },
    { href: "/admin/products", label: t("admin.products"), icon: <Package className={ic} /> },
    { href: "/admin/suppliers", label: "Fournisseurs", icon: <Truck className={ic} /> },
    { href: "/admin/orders", label: t("admin.orders"), icon: <ShoppingBag className={ic} /> },
    { href: "/admin/customers", label: t("admin.customers"), icon: <Users className={ic} /> },
    { href: "/admin/stock", label: t("admin.stock"), icon: <Boxes className={ic} /> },
    { href: "/admin/coupons", label: t("admin.coupons"), icon: <Tag className={ic} /> },
    { href: "/admin/reviews", label: t("admin.reviews"), icon: <Star className={ic} /> },
    { href: "/admin/moderation", label: t("admin.moderation"), icon: <ShieldCheck className={ic} /> },
    { href: "/admin/settings", label: t("admin.settings"), icon: <Settings className={ic} /> },
    { href: "/admin/audit", label: "Audit", icon: <ScrollText className={ic} /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] md:grid md:grid-cols-[240px_1fr]">
      <AdminSidebar
        items={items}
        userEmail={userEmail}
        supabaseConfigured={supabaseConfigured}
      />
      <main className="p-6 md:p-10">{children}</main>
    </div>
  );
}

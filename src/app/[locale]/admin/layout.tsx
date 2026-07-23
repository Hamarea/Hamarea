import { notFound, redirect as nextRedirect } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { CommandPalette } from "@/components/admin/command-palette";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Boxes,
  Tag,
  Star,
  Settings,
  ScrollText,
  CreditCard,
  Home,
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
  // Menu resserré pour une boutique mono-produit : Catégories, Fournisseurs et
  // Modération restent accessibles par URL mais sortent de la navigation.
  const sections = [
    {
      items: [
        { href: "/admin", label: t("admin.dashboard"), icon: <LayoutDashboard className={ic} /> },
      ],
    },
    {
      title: "Boutique",
      items: [
        { href: "/admin/products", label: t("admin.products"), icon: <Package className={ic} /> },
        { href: "/admin/orders", label: t("admin.orders"), icon: <ShoppingBag className={ic} /> },
        { href: "/admin/customers", label: t("admin.customers"), icon: <Users className={ic} /> },
        { href: "/admin/stock", label: t("admin.stock"), icon: <Boxes className={ic} /> },
      ],
    },
    {
      title: "Marketing",
      items: [
        { href: "/admin/coupons", label: t("admin.coupons"), icon: <Tag className={ic} /> },
        { href: "/admin/reviews", label: t("admin.reviews"), icon: <Star className={ic} /> },
      ],
    },
    {
      title: "Configuration",
      items: [
        { href: "/admin/payments", label: "Paiements", icon: <CreditCard className={ic} /> },
        { href: "/admin/appearance", label: "Page d'accueil", icon: <Home className={ic} /> },
        { href: "/admin/settings", label: t("admin.settings"), icon: <Settings className={ic} /> },
        { href: "/admin/audit", label: "Audit", icon: <ScrollText className={ic} /> },
      ],
    },
  ];

  const paletteItems = [
    ...sections.flatMap((s) => s.items.map((it) => ({ label: it.label, href: it.href }))),
    { label: "Catégories", href: "/admin/categories" },
    { label: "Fournisseurs", href: "/admin/suppliers" },
    { label: "Modération", href: "/admin/moderation" },
    { label: "Voir la boutique", href: "/" },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] md:grid md:grid-cols-[240px_1fr]">
      <AdminSidebar
        sections={sections}
        userEmail={userEmail}
        supabaseConfigured={supabaseConfigured}
      />
      <main className="p-6 md:p-10">
        <div className="mb-6 flex justify-end">
          <CommandPalette items={paletteItems} />
        </div>
        {children}
      </main>
    </div>
  );
}

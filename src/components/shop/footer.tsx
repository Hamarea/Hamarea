import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function ShopFooter() {
  const t = useTranslations();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-[var(--color-border)] bg-[var(--color-primary-700)] text-[var(--color-primary-50)]">
      <div className="container-page grid gap-8 py-12 md:grid-cols-4">
        <div>
          <p className="font-display text-2xl">Hamarea</p>
          <p className="mt-3 text-sm opacity-80">{t("common.tagline")}</p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-80">
            {t("nav.shop")}
          </p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/products" className="hover:underline">{t("nav.shop")}</Link></li>
            <li><Link href="/categories" className="hover:underline">{t("nav.categories")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-80">
            Compte
          </p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/account" className="hover:underline">{t("common.account")}</Link></li>
            <li><Link href="/account/orders" className="hover:underline">{t("account.myOrders")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-80">
            Légal
          </p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/legal/terms" className="hover:underline">{t("footer.terms")}</Link></li>
            <li><Link href="/legal/privacy" className="hover:underline">{t("footer.privacy")}</Link></li>
            <li><Link href="/legal/notice" className="hover:underline">{t("footer.legal")}</Link></li>
            <li><Link href="/contact" className="hover:underline">{t("footer.contact")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex h-14 items-center justify-between text-xs opacity-70">
          <span>© {year} Hamarea. {t("footer.rights")}</span>
          <span>Made with ♥ in France</span>
        </div>
      </div>
    </footer>
  );
}

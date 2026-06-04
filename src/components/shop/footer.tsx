import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/logo";
import { getBrandCopy } from "@/lib/brand-content";

export function ShopFooter() {
  const t = useTranslations();
  const b = getBrandCopy(useLocale());
  const year = new Date().getFullYear();
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/[^\d]/g, "");
  const waHref = waNumber ? `https://wa.me/${waNumber}` : null;
  return (
    <footer className="mt-24 border-t border-[var(--color-border)] bg-[var(--color-primary-900)] text-[var(--color-primary-50)]">
      <div className="container-page grid gap-8 py-12 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo className="h-6 text-white" />
          <p className="mt-4 max-w-xs text-sm opacity-80">{b.footer.tagline}</p>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-80">
            {b.footer.shop}
          </p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/sacoche" className="hover:underline">{b.nav.sacoche}</Link></li>
            <li><Link href="/#univers" className="hover:underline">{b.footer.universe}</Link></li>
            <li><Link href="/#waitlist" className="hover:underline">{b.footer.soon}</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-80">
            {b.footer.brand}
          </p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:underline">{b.nav.about}</Link></li>
            <li><Link href="/#engagement" className="hover:underline">{b.footer.commitment}</Link></li>
            <li><Link href="/account" className="hover:underline">{t("common.account")}</Link></li>
            <li><Link href="/contact" className="hover:underline">{t("footer.contact")}</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-80">
            Légal
          </p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/legal/terms" className="hover:underline">{t("footer.terms")}</Link></li>
            <li><Link href="/legal/privacy" className="hover:underline">{t("footer.privacy")}</Link></li>
            <li><Link href="/legal/returns" className="hover:underline">{t("footer.withdrawal")}</Link></li>
            <li><Link href="/legal/notice" className="hover:underline">{t("footer.legal")}</Link></li>
            {waHref && (
              <li>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {t("common.whatsappChat")}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex h-14 items-center justify-between text-xs opacity-70">
          <span>© {year} Hamarea. {t("footer.rights")}</span>
          <span>{b.tagline}</span>
        </div>
      </div>
    </footer>
  );
}

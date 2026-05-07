"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Search, ShoppingBag, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/stores/cart";
import { LocaleSwitcher } from "./locale-switcher";

export function ShopHeader() {
  const t = useTranslations();
  const count = useCart((s) => s.count());

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="font-display text-2xl tracking-tight text-[var(--color-primary-700)]"
        >
          Hamarea
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/products" className="hover:text-[var(--color-primary-600)]">
            {t("nav.shop")}
          </Link>
          <Link href="/categories" className="hover:text-[var(--color-primary-600)]">
            {t("nav.categories")}
          </Link>
          <Link href="/about" className="hover:text-[var(--color-primary-600)]">
            {t("nav.about")}
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label={t("common.search")}>
            <Search className="h-5 w-5" />
          </Button>
          <LocaleSwitcher />
          <Button asChild variant="ghost" size="icon" aria-label={t("common.account")}>
            <Link href="/account">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label={t("common.cart")} className="relative">
            <Link href="/cart">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent-400)] px-1.5 text-[10px] font-semibold text-white">
                  {count}
                </span>
              )}
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { ShoppingBag, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/stores/cart";
import { useCartUI } from "@/stores/cart-ui";
import { getProductCopy } from "@/lib/product-content";
import { LocaleSwitcher } from "./locale-switcher";
import { cn } from "@/lib/utils";

export function ShopHeader() {
  const t = useTranslations();
  const nav = getProductCopy(useLocale()).nav;
  const pathname = usePathname();
  const isHome = pathname === "/";
  const count = useCart((s) => s.count());
  const openDrawer = useCartUI((s) => s.openDrawer);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const NAV = [
    { href: "/#acheter", label: nav.sacoche },
    { href: "/#avis", label: nav.avis },
    { href: "/#faq", label: nav.faq },
  ];

  useEffect(() => {
    if (!isHome) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const overlay = isHome && !scrolled && !menuOpen;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        overlay
          ? "border-b border-transparent bg-transparent text-white"
          : "border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 text-[var(--color-foreground)] backdrop-blur",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className={cn(
            "font-display text-2xl tracking-tight",
            overlay ? "text-white" : "text-[var(--color-primary-700)]",
          )}
        >
          Hamarea
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {NAV.map((it) => (
            <a
              key={it.href}
              href={it.href}
              className={cn(
                "transition-opacity hover:opacity-80",
                overlay ? "text-white/90" : "hover:text-[var(--color-primary-600)]",
              )}
            >
              {it.label}
            </a>
          ))}
          <Link
            href="/about"
            className={cn(
              "transition-opacity hover:opacity-80",
              overlay ? "text-white/90" : "hover:text-[var(--color-primary-600)]",
            )}
          >
            {nav.about}
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={t("common.account")}
            className={overlay ? "text-white hover:bg-white/10 hover:text-white" : ""}
          >
            <Link href="/account">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={openDrawer}
            aria-label={t("common.cart")}
            className={cn(
              "relative",
              overlay ? "text-white hover:bg-white/10 hover:text-white" : "",
            )}
          >
            <ShoppingBag className="h-5 w-5" />
            <span
              className={cn(
                "ml-1 text-sm tabular-nums",
                overlay ? "text-white/90" : "text-[var(--color-foreground)]/70",
              )}
            >
              ({count})
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "md:hidden",
              overlay ? "text-white hover:bg-white/10 hover:text-white" : "",
            )}
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 md:hidden">
          <ul className="flex flex-col gap-1 text-sm font-medium">
            {NAV.map((it) => (
              <li key={it.href}>
                <a
                  href={it.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-md px-3 py-3 hover:bg-white"
                >
                  {it.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/about"
                onClick={() => setMenuOpen(false)}
                className="block rounded-md px-3 py-3 hover:bg-white"
              >
                {nav.about}
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                onClick={() => setMenuOpen(false)}
                className="block rounded-md px-3 py-3 hover:bg-white"
              >
                {nav.contact}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Inter, Fraunces } from "next/font/google";
import { routing } from "@/i18n/routing";
import { ShopHeader } from "@/components/shop/header";
import { ShopFooter } from "@/components/shop/footer";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { MotionProvider } from "@/components/motion-provider";
import { getProductCopy } from "@/lib/product-content";
import { ConsentBanner } from "@/components/consent/consent-banner";
import { Analytics } from "@/components/analytics";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const copy = getProductCopy(locale);

  return (
    <html lang={locale} className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <MotionProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--color-foreground)] focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
            >
              {copy.skipToContent}
            </a>
            <div className="relative z-10 -mb-px bg-[var(--color-primary-900)] py-1.5 text-center text-[11px] font-medium uppercase tracking-wider text-white">
              {copy.banner}
            </div>
            <ShopHeader />
            <main id="main" tabIndex={-1} className="min-h-[calc(100vh-4rem)]">
              {children}
            </main>
            <ShopFooter />
            <CartDrawer />
            <ConsentBanner />
            <Analytics />
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

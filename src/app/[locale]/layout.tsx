import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Inter, Fraunces } from "next/font/google";
import { routing } from "@/i18n/routing";
import { ShopHeader } from "@/components/shop/header";
import { ShopFooter } from "@/components/shop/footer";

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

  return (
    <html lang={locale} className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="relative z-10 -mb-px bg-[var(--color-primary-900)] py-1.5 text-center text-[11px] font-medium uppercase tracking-wider text-white">
            🌊 −30% jusqu&apos;à dimanche · Livraison 48h offerte dès 79€
          </div>
          <ShopHeader />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <ShopFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

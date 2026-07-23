import Image from "next/image";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { HeroImage } from "@/components/product/hero-image";
import { BuyBox } from "@/components/product/buy-box";
import { TrustBar } from "@/components/product/trust-bar";
import { Problem } from "@/components/product/problem";
import { UspGrid } from "@/components/product/usp-grid";
import { HowItWorks } from "@/components/product/how-it-works";
import { ColorsShowcase } from "@/components/product/colors-showcase";
import { WhatsInside } from "@/components/product/whats-inside";
import { Comparison } from "@/components/product/comparison";
import { BundlePicker } from "@/components/product/bundle-picker";
import { Testimonials } from "@/components/product/testimonials";
import { Faq } from "@/components/product/faq";
import { VideoReel } from "@/components/product/video-reel";
import { StickyBuyBar } from "@/components/product/sticky-buy-bar";
import { ProductJsonLd } from "@/components/product/product-jsonld";
import { Reveal } from "@/components/ui/reveal";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { CountUp } from "@/components/ui/count-up";
import { SACOCHE } from "@/lib/product";
import { getProductCopy } from "@/lib/product-content";
import { getSacocheStockByColor } from "@/lib/queries";

// Landing « stock-aware » : revalidation périodique pour que le badge « rupture »
// reflète les ventes/réassorts récents (les modifs stock admin revalident aussi
// ce chemin).
export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const copy = getProductCopy(locale);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const path = locale === "fr" ? "/sacoche" : `/${locale}/sacoche`;
  return {
    title: `${copy.productName} — IPX8 30 m`,
    description: copy.hero.subtitle,
    alternates: {
      canonical: path,
      languages: {
        fr: "/sacoche",
        en: "/en/sacoche",
        es: "/es/sacoche",
        de: "/de/sacoche",
        "x-default": "/sacoche",
      },
    },
    openGraph: {
      title: copy.productName,
      description: copy.hero.subtitle,
      url: `${base}${path}`,
      images: ["/hero.jpg"],
      type: "website",
    },
  };
}

export default async function SacochePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const copy = getProductCopy(locale);
  const stockByColor = await getSacocheStockByColor();

  return (
    <>
      <ProductJsonLd siteUrl={siteUrl} locale={locale} />
      <ScrollProgress />

      {/* HERO full-bleed (passe sous le header sticky) */}
      <section
        id="acheter"
        className="relative -mt-16 min-h-[100svh] w-full overflow-hidden bg-[var(--color-primary-900)] text-white"
      >
        <HeroImage />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/10"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 via-black/30 to-transparent"
        />

        <div className="container-page relative z-10 grid min-h-[calc(100svh-4rem)] grid-cols-1 items-center gap-8 pt-24 pb-12 md:grid-cols-12 md:pt-28">
          <div className="md:col-span-5 lg:col-span-4">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                {copy.hero.badge}
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-3 font-display text-[clamp(2.25rem,5vw,4rem)] font-black uppercase leading-[0.95] tracking-[-0.02em] drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
                {copy.hero.titleLine1}
                <br />
                <span className="text-[var(--color-secondary-200)]">{copy.hero.titleLine2}</span>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-3 text-sm text-white/90 md:text-base">
                {copy.hero.subtitle}
              </p>
            </Reveal>
            <Reveal delay={0.24} className="mt-5">
              <BuyBox variant="hero" compact stockByColor={stockByColor} />
            </Reveal>
          </div>
          <div className="hidden md:col-span-7 md:block lg:col-span-8" aria-hidden />
        </div>
      </section>

      {/* Funnel resserré, preuve sociale remontée :
          réassurance → problème → solution (USP) → démo vidéo → avis clients
          → couleurs → comparatif → mode d'emploi → packs → FAQ. */}
      <TrustBar />
      <Problem />
      <UspGrid />
      <VideoReel />
      <Testimonials />
      <ColorsShowcase />
      <WhatsInside />
      <Comparison />
      <HowItWorks />
      <BundlePicker />
      <Faq />

      {/* Closing CTA */}
      <section className="relative overflow-hidden bg-[var(--color-primary-900)] py-20 text-white">
        <Image
          src="/hero.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <Reveal className="container-page relative z-10 text-center">
          <h2 className="mx-auto max-w-2xl font-display text-3xl md:text-5xl">
            {copy.closing.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">
            {copy.closing.joinPrefix}
            <CountUp to={SACOCHE.unitsSold} suffix="+" className="font-semibold tabular-nums" />
            {copy.closing.joinSuffix}
          </p>
          <a
            href="#acheter"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-8 py-4 font-semibold text-[var(--color-foreground)] transition-transform hover:scale-105 active:scale-95"
          >
            {copy.closing.cta}
          </a>
        </Reveal>
      </section>

      <StickyBuyBar stockByColor={stockByColor} />
    </>
  );
}

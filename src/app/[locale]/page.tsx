import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { BrandJsonLd } from "@/components/brand/brand-jsonld";
import { BrandHero } from "@/components/brand/brand-hero";
import { BrandMarquee } from "@/components/brand/brand-marquee";
import { ProductUniverse } from "@/components/brand/product-universe";
import { HeroProductSpotlight } from "@/components/brand/hero-product-spotlight";
import { FeaturedProducts } from "@/components/brand/featured-products";
import { OceanCommitment } from "@/components/brand/ocean-commitment";
import { Community } from "@/components/brand/community";
import { Waitlist } from "@/components/brand/waitlist";
import { BrandStory } from "@/components/brand/brand-story";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { Reveal } from "@/components/ui/reveal";
import { getBrandCopy } from "@/lib/brand-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const copy = getBrandCopy(locale);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const path = locale === "fr" ? "/" : `/${locale}`;
  return {
    title: `Hamarea — ${copy.tagline}`,
    description: copy.hero.subtitle,
    alternates: {
      canonical: path,
      languages: { fr: "/", en: "/en", es: "/es", de: "/de", "x-default": "/" },
    },
    openGraph: {
      title: `Hamarea — ${copy.tagline}`,
      description: copy.hero.subtitle,
      url: `${base}${path}`,
      images: ["/brand/og-default.png"],
      type: "website",
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const closing = getBrandCopy(locale).closing;

  return (
    <>
      <BrandJsonLd siteUrl={siteUrl} locale={locale} />
      <ScrollProgress />

      <BrandHero locale={locale} />
      <BrandMarquee locale={locale} />
      <ProductUniverse locale={locale} />
      <HeroProductSpotlight locale={locale} />
      <FeaturedProducts locale={locale} />
      <OceanCommitment locale={locale} />
      <Community locale={locale} />
      <Waitlist />
      <BrandStory locale={locale} />

      {/* Closing CTA */}
      <section className="brand-gradient py-16 text-white">
        <Reveal className="container-page flex flex-col items-center gap-5 text-center">
          <h2 className="max-w-2xl font-display text-3xl md:text-5xl">
            {closing.heading}
          </h2>
          <p className="max-w-xl text-white/90">{closing.sub}</p>
          <Link
            href="/sacoche"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-8 py-3.5 font-semibold text-[var(--color-foreground)] transition-transform hover:scale-[1.03] active:scale-95"
          >
            {closing.cta}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Reveal>
      </section>
    </>
  );
}

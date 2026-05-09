import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { ProductGrid } from "@/components/shop/product-grid";
import { CategoryStrip } from "@/components/shop/category-strip";
import { listFeaturedProducts, listCategories } from "@/lib/queries";

// Override via `NEXT_PUBLIC_HERO_IMAGE_URL` (any URL on a host whitelisted in
// next.config.ts → images.remotePatterns) when you have your own brand shot.
const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=2400&q=85";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const heroImage =
    process.env.NEXT_PUBLIC_HERO_IMAGE_URL?.trim() || DEFAULT_HERO_IMAGE;

  const [products, categories] = await Promise.all([
    listFeaturedProducts(locale, 8),
    listCategories(locale),
  ]);

  return (
    <>
      <section className="relative -mt-16 h-[100svh] min-h-[640px] w-full overflow-hidden bg-[var(--color-primary-900)] text-white">
        <Image
          src={heroImage}
          alt={t("home.heroCaption")}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/15 to-black/55"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent"
        />

        <div className="relative z-10 flex h-full flex-col">
          <div className="container-page flex flex-1 items-end pt-24 pb-10 md:items-center md:pb-0">
            <div className="grid w-full grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-7 md:col-start-6 md:pl-8">
                <h1 className="font-display text-[clamp(3.25rem,9.5vw,9.5rem)] font-black uppercase leading-[0.92] tracking-[-0.02em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
                  <span className="block">{t("home.heroDisplayLine1")}</span>
                  <span className="block">{t("home.heroDisplayLine2")}</span>
                  <span className="block">{t("home.heroDisplayLine3")}</span>
                </h1>
                <p className="mt-5 font-display text-lg italic text-white/90 md:text-2xl">
                  {t("home.heroDisplaySubtitle")}
                </p>
              </div>
            </div>
          </div>

          <div className="container-page flex flex-col gap-6 pb-6 md:flex-row md:items-end md:justify-between md:pb-8">
            <p className="font-display text-sm italic tracking-wide text-white/85 md:text-base">
              {t("home.heroCaption")}
            </p>
            <div className="flex items-center gap-4 text-white/90">
              <span className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-sm bg-white/10 ring-1 ring-white/30">
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-4 w-4 fill-white"
                  >
                    <path d="M12 3 2 21h20L12 3Zm0 5.2L18.5 19h-13L12 8.2Z" />
                  </svg>
                </span>
                <span className="font-display text-lg uppercase tracking-[0.18em]">
                  Hamarea
                </span>
              </span>
              <span className="h-6 w-px bg-white/40" />
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
                <span className="grid h-5 w-5 place-items-center rounded-full ring-1 ring-white/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                {t("home.heroSubBrand")}
              </span>
            </div>
          </div>

          <div className="border-t border-white/15 bg-black/40 backdrop-blur-sm">
            <div className="container-page flex h-11 items-center gap-6 overflow-hidden text-[11px] uppercase tracking-[0.32em] text-white/85 md:text-xs">
              <span>{t("home.marqueeNew")}</span>
              <span className="opacity-50">·</span>
              <span className="hidden sm:inline">
                {t("home.marqueeCollection")}
              </span>
              <span className="hidden opacity-50 sm:inline">·</span>
              <span className="hidden md:inline">
                {t("home.marqueeShipping")}
              </span>
              <span className="hidden opacity-50 md:inline">·</span>
              <Link
                href="/products"
                className="ml-auto inline-flex items-center gap-2 transition-opacity hover:opacity-100 hover:text-white"
              >
                {t("home.marqueeCta")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CategoryStrip categories={categories} />

      <section className="container-page py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-3xl">{t("home.featured")}</h2>
          <Link
            href="/products"
            className="text-sm font-medium text-[var(--color-primary-600)] hover:underline"
          >
            {t("home.viewAll")} →
          </Link>
        </div>
        <ProductGrid products={products} locale={locale} />
      </section>
    </>
  );
}

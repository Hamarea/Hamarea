import { getBrandCopy } from "@/lib/brand-content";

/**
 * Organization / OnlineStore structured data for the brand.
 * Google recommends placing this on a single page (the home). `logo` must be a
 * crawlable image ≥ 112×112 px.
 */
export function BrandJsonLd({ siteUrl, locale }: { siteUrl: string; locale: string }) {
  const copy = getBrandCopy(locale);
  const data = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: "Hamarea",
    legalName: "Hamarea",
    slogan: copy.tagline,
    description: copy.footer.tagline,
    url: siteUrl,
    logo: `${siteUrl}/brand/hamarea-logo.png`,
    image: `${siteUrl}/brand/og-default.png`,
    email: "hello@hamarea.com",
    sameAs: ["https://instagram.com", "https://tiktok.com"],
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

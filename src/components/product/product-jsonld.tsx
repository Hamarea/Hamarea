import { SACOCHE } from "@/lib/product";

export function ProductJsonLd({ siteUrl }: { siteUrl: string }) {
  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: SACOCHE.name,
    description: SACOCHE.tagline,
    image: SACOCHE.colors.map((c) => `${siteUrl}${c.imageUrl}`),
    brand: { "@type": "Brand", name: "Hamarea" },
    sku: SACOCHE.id,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: SACOCHE.currency,
      lowPrice: (SACOCHE.priceCents / 100).toFixed(2),
      highPrice: (SACOCHE.priceCents / 100).toFixed(2),
      offerCount: SACOCHE.colors.length,
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/`,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: SACOCHE.rating,
      reviewCount: SACOCHE.ratingCount,
      bestRating: 5,
      worstRating: 1,
    },
    review: SACOCHE.reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      datePublished: r.date,
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
      },
      name: r.title,
      reviewBody: r.body,
    })),
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SACOCHE.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(product) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  );
}

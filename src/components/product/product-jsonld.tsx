import { SACOCHE } from "@/lib/product";

/**
 * Structured data for the landing page.
 *
 * IMPORTANT (compliance): `AggregateRating`/`Review` markup is only emitted
 * when NEXT_PUBLIC_ENABLE_REVIEW_SCHEMA === "true". Publishing rich-result
 * review data that is not backed by genuine, verifiable customer reviews
 * risks a Google manual action AND breaches the EU Omnibus Directive on fake
 * reviews. Flip the flag on only once real reviews feed this component.
 */
export function ProductJsonLd({ siteUrl }: { siteUrl: string }) {
  const enableReviews =
    process.env.NEXT_PUBLIC_ENABLE_REVIEW_SCHEMA === "true";

  const priceValidUntil = `${new Date().getFullYear()}-12-31`;

  const product: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: SACOCHE.name,
    description: SACOCHE.tagline,
    image: SACOCHE.colors.map((c) => `${siteUrl}${c.imageUrl}`),
    brand: { "@type": "Brand", name: "Hamarea" },
    sku: SACOCHE.id,
    offers: {
      "@type": "Offer",
      priceCurrency: SACOCHE.currency,
      price: (SACOCHE.priceCents / 100).toFixed(2),
      priceValidUntil,
      availability: "https://schema.org/InStock",
      url: siteUrl,
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: (SACOCHE.priceCents >= 3900 ? 0 : 5.9).toFixed(2),
          currency: SACOCHE.currency,
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "FR",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 3,
            maxValue: 5,
            unitCode: "DAY",
          },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "FR",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 30,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
  };

  if (enableReviews) {
    product.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: SACOCHE.rating,
      reviewCount: SACOCHE.ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
    product.review = SACOCHE.reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      datePublished: r.date,
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      name: r.title,
      reviewBody: r.body,
    }));
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl },
      { "@type": "ListItem", position: 2, name: SACOCHE.name, item: siteUrl },
    ],
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  );
}

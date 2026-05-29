import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const paths = [
    "",
    "/products",
    "/categories",
    "/about",
    "/contact",
    "/legal/terms",
    "/legal/privacy",
    "/legal/notice",
  ];

  // `localePrefix: "as-needed"` → the default locale is NOT prefixed.
  const urlFor = (locale: string, p: string) =>
    locale === routing.defaultLocale
      ? `${base}${p || "/"}`
      : `${base}/${locale}${p}`;

  const now = new Date();

  return routing.locales.flatMap((locale) =>
    paths.map((p) => ({
      url: urlFor(locale, p),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : p.startsWith("/legal") ? 0.3 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, urlFor(l, p)]),
        ),
      },
    })),
  );
}

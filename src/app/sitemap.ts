import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const paths = ["", "/products", "/categories", "/about", "/contact"];
  return routing.locales.flatMap((locale) =>
    paths.map((p) => ({
      url: `${base}/${locale}${p}`,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.7,
    }))
  );
}

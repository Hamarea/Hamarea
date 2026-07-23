"use client";

import { usePathname } from "@/i18n/navigation";

/**
 * Renders its children only on the public storefront. The admin back-office
 * lives under the same [locale] layout but must not show the marketing chrome
 * (banner, header, footer, cart drawer, WhatsApp button).
 */
export function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <>{children}</>;
}

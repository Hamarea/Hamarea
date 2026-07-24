import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Content-Security-Policy taillée pour Stripe (audit H2). Domaines requis :
//   - js.stripe.com                : Stripe.js + Express Checkout Element (Apple
//                                    Pay / Google Pay / Link s'exécutent dans les
//                                    iframes Stripe → couverts par *.stripe.com).
//   - api.stripe.com               : appels API navigateur (confirmation, 3DS).
//   - m.stripe.com / r.stripe.com  : télémétrie/anti-fraude chargée par Stripe.js.
//   - hooks.stripe.com, *.stripe.com : iframes 3D Secure / Checkout.
//   - *.supabase.co/.in            : données (REST + Realtime wss) et images.
// 'unsafe-inline' (script/style) est requis par l'hydratation Next.js/React et
// les styles inline ; documenté et à remplacer par des nonces lors du passage en
// enforce. Pas de 'unsafe-eval'. Voir docs/RAPPORT-CORRECTION-STRIPE-LOT1.md.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://images.unsplash.com https://*.stripe.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://m.stripe.com https://r.stripe.com https://*.supabase.co https://*.supabase.in wss://*.supabase.co",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://*.stripe.com",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

// Première CSP de l'app : déployée en Report-Only par défaut (n'interrompt rien,
// remonte les violations en console/report). Basculer en enforce via CSP_ENFORCE=true
// une fois le tunnel Stripe validé sans violation bloquante.
const cspHeaderKey =
  process.env.CSP_ENFORCE === "true"
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: cspHeaderKey, value: csp },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // AVIF first (≈20% smaller than WebP), WebP fallback.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);

import Stripe from "stripe";
import { validateStripeConfig } from "./stripe-config";

let cached: Stripe | null = null;
let checked = false;

/**
 * Singleton SDK Stripe. Retourne `null` en mode aperçu (aucune `STRIPE_SECRET_KEY`
 * — comportement historique préservé). Quand une clé est présente, la
 * configuration est validée UNE fois (garde test/live, cohérence de mode,
 * présence du webhook secret en prod). Une configuration incohérente lève une
 * erreur bloquante — jamais elle ne révèle de secret (cf. `stripe-config.ts`).
 */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null; // mode aperçu — non bloquant

  if (!checked) {
    const res = validateStripeConfig({
      secretKey: key,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      nodeEnv: process.env.NODE_ENV,
      allowLiveOverride: process.env.STRIPE_ALLOW_LIVE_IN_DEV === "true",
    });
    if (!res.ok) {
      // Erreur bloquante et explicite, sans divulguer de secret.
      throw new Error(
        `[stripe] Configuration invalide, paiement désactivé : ${res.errors.join(" · ")}`,
      );
    }
    checked = true;
  }

  if (!cached) cached = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  return cached;
}

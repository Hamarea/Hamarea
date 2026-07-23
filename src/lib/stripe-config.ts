/**
 * Garde de configuration Stripe (audit M6) — PURE et testable.
 *
 * Empêche deux erreurs coûteuses :
 *   - une clé de TEST déployée en production (encaissements « à vide ») ;
 *   - une clé LIVE utilisée en développement (facturation réelle involontaire).
 *
 * Vérifie aussi la cohérence de mode entre clé secrète et clé publique, et la
 * présence du secret de webhook en production. Ne journalise JAMAIS une clé
 * complète : les messages d'erreur ne contiennent que des libellés (`live` /
 * `test`) et, au besoin, un préfixe masqué.
 */

export type StripeMode = "live" | "test" | "unknown";

/** Mode d'une clé Stripe d'après son préfixe (sk_/pk_/rk_ + live/test). */
export function keyMode(key: string | undefined | null): StripeMode {
  if (!key) return "unknown";
  if (/^(sk|pk|rk)_live_/.test(key)) return "live";
  if (/^(sk|pk|rk)_test_/.test(key)) return "test";
  return "unknown";
}

/**
 * Masque une clé pour affichage/log : ne révèle QUE le préfixe documenté
 * (`sk_live_…`), jamais le secret. Utilisée uniquement pour du diagnostic sûr.
 */
export function maskKey(key: string | undefined | null): string {
  if (!key) return "(absente)";
  const m = key.match(/^(sk|pk|rk)_(live|test)_/);
  return m ? `${m[0]}…` : "(format inconnu)";
}

export type StripeConfigInput = {
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
  nodeEnv?: string;
  /** Échappatoire explicite et documentée pour utiliser une clé live hors prod. */
  allowLiveOverride?: boolean;
};

export type StripeConfigResult = {
  ok: boolean;
  /** false = aucune clé secrète → mode aperçu (jamais bloquant). */
  configured: boolean;
  mode: StripeMode;
  errors: string[];
};

/**
 * Valide la configuration Stripe. Retourne `{ ok:false, errors }` (sans aucun
 * secret) quand une incohérence bloquante est détectée. Sans clé secrète du
 * tout, retourne `ok:true, configured:false` (mode aperçu — le site tourne sans
 * paiement, comportement existant préservé).
 */
export function validateStripeConfig(
  input: StripeConfigInput,
): StripeConfigResult {
  const { secretKey, publishableKey, webhookSecret, nodeEnv, allowLiveOverride } =
    input;
  const isProd = nodeEnv === "production";
  const errors: string[] = [];

  // Mode aperçu : pas de clé secrète → non bloquant (getStripe() renverra null).
  if (!secretKey) {
    return { ok: true, configured: false, mode: "unknown", errors: [] };
  }

  const secretMode = keyMode(secretKey);
  const pubMode = keyMode(publishableKey);

  if (secretMode === "unknown") {
    errors.push(
      "STRIPE_SECRET_KEY : préfixe non reconnu (attendu sk_live_/sk_test_/rk_*).",
    );
  }

  if (isProd) {
    if (secretMode === "test") {
      errors.push("Clé secrète de TEST détectée en production (sk_test_).");
    }
    if (publishableKey && pubMode === "test") {
      errors.push("Clé publique de TEST détectée en production (pk_test_).");
    }
    if (!publishableKey) {
      errors.push(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY manquante en production.",
      );
    }
    if (!webhookSecret) {
      errors.push("STRIPE_WEBHOOK_SECRET manquant en production.");
    }
  } else {
    // Développement / test.
    if (secretMode === "live" && !allowLiveOverride) {
      errors.push(
        "Clé secrète LIVE hors production (sk_live_) — définir STRIPE_ALLOW_LIVE_IN_DEV=true si volontaire.",
      );
    }
    if (publishableKey && pubMode === "live" && !allowLiveOverride) {
      errors.push("Clé publique LIVE hors production (pk_live_).");
    }
  }

  // Cohérence de mode entre secrète et publique (quand les deux sont connues).
  if (
    publishableKey &&
    secretMode !== "unknown" &&
    pubMode !== "unknown" &&
    secretMode !== pubMode
  ) {
    errors.push(
      `Modes Stripe incohérents : secrète=${secretMode}, publique=${pubMode}.`,
    );
  }

  return {
    ok: errors.length === 0,
    configured: true,
    mode: secretMode,
    errors,
  };
}

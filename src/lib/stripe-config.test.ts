import { describe, it, expect } from "vitest";
import { validateStripeConfig, keyMode, maskKey } from "./stripe-config";

describe("keyMode", () => {
  it("détecte le mode d'après le préfixe", () => {
    expect(keyMode("sk_live_abc")).toBe("live");
    expect(keyMode("pk_live_abc")).toBe("live");
    expect(keyMode("rk_live_abc")).toBe("live");
    expect(keyMode("sk_test_abc")).toBe("test");
    expect(keyMode("pk_test_abc")).toBe("test");
    expect(keyMode("whsec_abc")).toBe("unknown");
    expect(keyMode(undefined)).toBe("unknown");
  });
});

describe("maskKey", () => {
  it("ne révèle jamais le secret, seulement le préfixe documenté", () => {
    expect(maskKey("sk_live_supersecretvalue")).toBe("sk_live_…");
    expect(maskKey("pk_test_abc")).toBe("pk_test_…");
    expect(maskKey(undefined)).toBe("(absente)");
    expect(maskKey("garbage")).toBe("(format inconnu)");
  });
});

describe("validateStripeConfig", () => {
  it("mode aperçu : aucune clé secrète → ok, non configuré", () => {
    const r = validateStripeConfig({ nodeEnv: "production" });
    expect(r).toEqual({ ok: true, configured: false, mode: "unknown", errors: [] });
  });

  it("production valide : sk_live + pk_live + webhook → ok", () => {
    const r = validateStripeConfig({
      secretKey: "sk_live_x",
      publishableKey: "pk_live_y",
      webhookSecret: "whsec_z",
      nodeEnv: "production",
    });
    expect(r.ok).toBe(true);
    expect(r.mode).toBe("live");
  });

  it("REFUSE une clé de test en production", () => {
    const r = validateStripeConfig({
      secretKey: "sk_test_x",
      publishableKey: "pk_test_y",
      webhookSecret: "whsec_z",
      nodeEnv: "production",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/TEST.*production/i);
  });

  it("REFUSE une clé live en développement (sans override)", () => {
    const r = validateStripeConfig({
      secretKey: "sk_live_x",
      publishableKey: "pk_live_y",
      nodeEnv: "development",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/LIVE hors production/i);
  });

  it("autorise une clé live en développement avec override explicite", () => {
    const r = validateStripeConfig({
      secretKey: "sk_live_x",
      publishableKey: "pk_live_y",
      nodeEnv: "development",
      allowLiveOverride: true,
    });
    expect(r.ok).toBe(true);
  });

  it("REFUSE des modes incohérents (secrète live / publique test)", () => {
    const r = validateStripeConfig({
      secretKey: "sk_live_x",
      publishableKey: "pk_test_y",
      webhookSecret: "whsec_z",
      nodeEnv: "production",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/incohérents/i);
  });

  it("production : webhook secret manquant → erreur", () => {
    const r = validateStripeConfig({
      secretKey: "sk_live_x",
      publishableKey: "pk_live_y",
      nodeEnv: "production",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/WEBHOOK_SECRET/i);
  });

  it("production : clé publique manquante → erreur", () => {
    const r = validateStripeConfig({
      secretKey: "sk_live_x",
      webhookSecret: "whsec_z",
      nodeEnv: "production",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/PUBLISHABLE_KEY manquante/i);
  });

  it("développement de test valide (sk_test/pk_test) → ok", () => {
    const r = validateStripeConfig({
      secretKey: "sk_test_x",
      publishableKey: "pk_test_y",
      nodeEnv: "development",
    });
    expect(r.ok).toBe(true);
    expect(r.mode).toBe("test");
  });

  it("aucun message d'erreur ne contient la clé complète", () => {
    const secret = "sk_test_THISMUSTNOTLEAK";
    const r = validateStripeConfig({
      secretKey: secret,
      publishableKey: "pk_live_y",
      nodeEnv: "production",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).not.toContain("THISMUSTNOTLEAK");
  });
});

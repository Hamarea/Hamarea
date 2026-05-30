// Client-side consent helpers (RGPD / ePrivacy).
// A single first-party cookie records the visitor's choice. Non-essential
// scripts (analytics, marketing pixels) only load AFTER explicit consent, and
// the banner offers "Tout refuser" with the same prominence as "Tout accepter"
// (CNIL requirement). No third-party network call happens before a choice.

export const CONSENT_COOKIE = "hamarea_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_EVENT = "hamarea:consentchange";
const ONE_YEAR = 60 * 60 * 24 * 365;

export type Consent = {
  v: number;
  analytics: boolean;
  marketing: boolean;
  ts: number;
};

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match.split("=")[1])) as Consent;
    if (parsed.v !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(choice: { analytics: boolean; marketing: boolean }) {
  if (typeof document === "undefined") return;
  const value: Consent = {
    v: CONSENT_VERSION,
    analytics: choice.analytics,
    marketing: choice.marketing,
    ts: Date.now(),
  };
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
    JSON.stringify(value),
  )}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: value }));
}

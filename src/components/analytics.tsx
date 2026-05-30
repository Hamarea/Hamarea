"use client";

import { useEffect } from "react";
import { readConsent, CONSENT_EVENT, type Consent } from "@/lib/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded?: boolean;
  version?: string;
  push?: unknown;
};

type W = Window &
  typeof globalThis & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: Fbq;
    _fbq?: Fbq;
    __ga_loaded?: boolean;
    __meta_loaded?: boolean;
  };

function loadGA() {
  const w = window as W;
  if (!GA_ID || w.__ga_loaded) return;
  w.__ga_loaded = true;

  w.dataLayer = w.dataLayer || [];
  const gtag = (...args: unknown[]) => {
    (w.dataLayer as unknown[]).push(args);
  };
  w.gtag = gtag;
  // Consent Mode v2 — analytics is granted here; ads depend on marketing.
  gtag("consent", "default", {
    ad_storage: "denied",
    analytics_storage: "granted",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  gtag("js", new Date());
  gtag("config", GA_ID);
}

function grantAds() {
  (window as W).gtag?.("consent", "update", {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
}

function loadMetaPixel() {
  const w = window as W;
  if (!META_PIXEL_ID || w.__meta_loaded) return;
  w.__meta_loaded = true;

  if (!w.fbq) {
    const fbq = ((...args: unknown[]) => {
      const self = w.fbq as Fbq;
      if (self.callMethod) self.callMethod(...args);
      else self.queue.push(args);
    }) as Fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.push = fbq;
    w.fbq = fbq;
    w._fbq = fbq;
  }

  const t = document.createElement("script");
  t.async = true;
  t.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(t);

  w.fbq?.("init", META_PIXEL_ID);
  w.fbq?.("track", "PageView");
}

function apply(consent: Consent | null) {
  if (!consent) return;
  if (consent.analytics) {
    loadGA();
    if (consent.marketing) grantAds();
  }
  if (consent.marketing) loadMetaPixel();
}

/**
 * Loads GA4 (Consent Mode v2) and the Meta Pixel — but only once the visitor
 * has granted the matching consent AND the corresponding env id is configured.
 * Fully no-op otherwise, so the app ships with zero third-party tags by default.
 */
export function Analytics() {
  useEffect(() => {
    if (!GA_ID && !META_PIXEL_ID) return;
    apply(readConsent());
    const onChange = (e: Event) => apply((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  return null;
}

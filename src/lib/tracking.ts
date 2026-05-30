import { createHash } from "node:crypto";

/**
 * Server-side conversion tracking (Meta Conversions API + TikTok Events API).
 * Browser pixels miss >50% of conversions (ITP/ad-blockers), so the source of
 * truth for "Purchase" is server-side, deduplicated with the browser pixel via
 * a shared `event_id` (we use the order id). Email is SHA-256 hashed (advanced
 * matching). Fully no-op + best-effort: never throws, does nothing without the
 * corresponding credentials, so nothing leaks before they are configured.
 */

const META_PIXEL_ID = process.env.META_PIXEL_ID ?? process.env.NEXT_PUBLIC_META_PIXEL_ID;
const META_CAPI_TOKEN = process.env.META_CAPI_TOKEN;
const TIKTOK_PIXEL_CODE = process.env.TIKTOK_PIXEL_CODE;
const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export type PurchaseEvent = {
  eventId: string;
  email: string | null;
  valueCents: number | null;
  currency: string | null;
  sourceUrl?: string | null;
};

async function sendMeta(e: PurchaseEvent): Promise<void> {
  if (!META_PIXEL_ID || !META_CAPI_TOKEN) return;
  try {
    await fetch(
      `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              event_name: "Purchase",
              event_time: Math.floor(Date.now() / 1000),
              event_id: e.eventId,
              action_source: "website",
              ...(e.sourceUrl ? { event_source_url: e.sourceUrl } : {}),
              user_data: e.email ? { em: [sha256(e.email)] } : {},
              custom_data: {
                currency: (e.currency ?? "EUR").toUpperCase(),
                value: e.valueCents != null ? e.valueCents / 100 : 0,
              },
            },
          ],
        }),
      },
    );
  } catch (err) {
    console.error("[tracking] meta capi error", err);
  }
}

async function sendTikTok(e: PurchaseEvent): Promise<void> {
  if (!TIKTOK_PIXEL_CODE || !TIKTOK_ACCESS_TOKEN) return;
  try {
    await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": TIKTOK_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        event_source: "web",
        event_source_id: TIKTOK_PIXEL_CODE,
        data: [
          {
            event: "CompletePayment",
            event_time: Math.floor(Date.now() / 1000),
            event_id: e.eventId,
            user: e.email ? { email: sha256(e.email) } : {},
            properties: {
              currency: (e.currency ?? "EUR").toUpperCase(),
              value: e.valueCents != null ? e.valueCents / 100 : 0,
            },
          },
        ],
      }),
    });
  } catch (err) {
    console.error("[tracking] tiktok events error", err);
  }
}

/** Fire the server-side Purchase event to every configured provider. */
export async function trackPurchaseServer(e: PurchaseEvent): Promise<void> {
  await Promise.all([sendMeta(e), sendTikTok(e)]);
}

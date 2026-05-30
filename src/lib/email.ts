/**
 * Minimal transactional email via the Resend REST API — no extra dependency.
 * Mirrors the codebase's defensive pattern: when RESEND_API_KEY /
 * RESEND_FROM_EMAIL are not set, this is a no-op (returns { skipped: true }) so
 * nothing throws in preview/test. Best-effort: never throws to the caller.
 */
type SendArgs = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({
  to,
  subject,
  html,
}: SendArgs): Promise<{ ok: boolean; skipped?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { ok: false, skipped: true };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error("[email] resend failed", res.status, await res.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] resend error", err);
    return { ok: false };
  }
}

const BRAND = process.env.NEXT_PUBLIC_SITE_NAME ?? "Hamarea";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export function orderConfirmationHtml(params: {
  orderNumber?: string | null;
  amountCents: number | null;
  currency: string | null;
}): string {
  const amount =
    params.amountCents != null
      ? new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: (params.currency ?? "EUR").toUpperCase(),
        }).format(params.amountCents / 100)
      : "";
  const ordersUrl = SITE ? `${SITE}/account/orders` : "#";
  return `
  <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;color:#1f2937">
    <h1 style="font-size:20px">Merci pour votre commande !</h1>
    <p>Votre paiement a bien été reçu${
      params.orderNumber ? ` pour la commande <strong>${params.orderNumber}</strong>` : ""
    }${amount ? ` (${amount})` : ""}.</p>
    <p>Nous préparons votre colis. Vous recevrez le suivi dès l'expédition, et
    vous pouvez consulter l'état de votre commande à tout moment.</p>
    <p><a href="${ordersUrl}" style="display:inline-block;background:#1e3a5f;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Voir mes commandes</a></p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px">— L'équipe ${BRAND}</p>
  </div>`;
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { SACOCHE } from "@/lib/product";
import { priceCart } from "@/lib/checkout";
import { priceDbVariants } from "@/lib/checkout-db";
import { resolveCoupon, couponErrorMessage } from "@/lib/coupon-db";
import { rateLimitHit } from "@/lib/rate-limit";

/**
 * Validation d'un code promo POUR L'AFFICHAGE du tunnel (montre la remise avant
 * de payer). Le sous-total est recalculé serveur (mêmes chemins autoritaires
 * que /api/checkout/session) pour que la remise affichée == celle facturée.
 * La sécurité réelle reste la revalidation à la création de session.
 *
 * Réponses : 200 { ok:true, discountCents, code } | 200 { ok:false, error }
 * (coupon invalide = résultat métier) · 400 (entrée invalide).
 */
const LineSchema = z.object({
  productId: z.string().min(1).max(100),
  variantId: z.string().max(100).optional(),
  color: z.string().max(40).optional().default(""),
  pack: z.coerce.number().int().min(1).max(3).default(1),
  quantity: z.number().int().min(1).max(99),
});

const BodySchema = z.object({
  couponCode: z.string().trim().min(1).max(40),
  lines: z.array(LineSchema).min(1).max(50),
});

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (!(await rateLimitHit(`coupon:${ip}`, 20, 60))) {
    return NextResponse.json({ ok: false, error: "Trop de tentatives." }, { status: 429 });
  }

  // Pas de DB configurée → aucun coupon applicatif.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "Code promo invalide." });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const sacocheLines = body.lines.filter((l) => l.productId === SACOCHE.id);
  const dbLines = body.lines
    .filter((l) => l.productId !== SACOCHE.id && l.variantId)
    .map((l) => ({ variantId: l.variantId as string, quantity: l.quantity }));

  const priced = priceCart(sacocheLines, origin);
  if (!priced.ok) return NextResponse.json({ ok: false, error: priced.error }, { status: 400 });
  const dbPriced = await priceDbVariants(dbLines);
  if (!dbPriced.ok) return NextResponse.json({ ok: false, error: dbPriced.error }, { status: 400 });

  const subtotalCents = priced.cart.subtotalCents + dbPriced.cart.subtotalCents;

  const res = await resolveCoupon(body.couponCode, subtotalCents);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: couponErrorMessage(res.reason) });
  }
  return NextResponse.json({
    ok: true,
    discountCents: res.discountCents,
    code: body.couponCode.trim().toUpperCase(),
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

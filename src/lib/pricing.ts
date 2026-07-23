/**
 * Modèle de prix « poste de pilotage mono-produit ».
 *
 * La source de vérité reste `product_variants.price_cents` (+ `compare_at`),
 * ce qui laisse le chemin de paiement (checkout-db) inchangé. Le « prix
 * global » d'un produit est DÉRIVÉ : c'est la paire (prix, prix barré) la plus
 * répandue parmi ses variantes. Les variantes qui portent cette paire
 * « héritent » du prix global ; les autres ont un prix spécifique.
 */
export type PricePair = {
  price_cents: number;
  compare_at_price_cents: number | null;
};

export function deriveGlobalPair(variants: PricePair[]): PricePair | null {
  if (variants.length === 0) return null;
  const counts = new Map<string, { pair: PricePair; n: number }>();
  for (const v of variants) {
    const key = `${v.price_cents}|${v.compare_at_price_cents ?? ""}`;
    const cur = counts.get(key);
    if (cur) cur.n++;
    else counts.set(key, { pair: v, n: 1 });
  }
  let best: { pair: PricePair; n: number } | null = null;
  for (const c of counts.values()) if (!best || c.n > best.n) best = c;
  return best?.pair ?? null;
}

export const samePair = (a: PricePair, b: PricePair) =>
  a.price_cents === b.price_cents &&
  (a.compare_at_price_cents ?? null) === (b.compare_at_price_cents ?? null);

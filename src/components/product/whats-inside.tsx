import { Check, CreditCard, Banknote, KeyRound } from "lucide-react";
import { getLocale } from "next-intl/server";
import { getProductCopy } from "@/lib/product-content";
import { Reveal } from "@/components/ui/reveal";

const ALSO_ICONS = [CreditCard, Banknote, KeyRound];

/**
 * « Ce qui rentre dedans » — traite l'objection n°1 (« compatible avec MON
 * téléphone ? ») en la sortant de la FAQ pour en faire une section visuelle.
 * 100 % CSS/SVG : un gabarit de sacoche + téléphone avec ses cotes, à gauche ;
 * la liste de compatibilité + l'essentiel qui rentre, à droite. Aucun visuel
 * photo requis.
 */
export async function WhatsInside() {
  const c = getProductCopy(await getLocale()).fits;
  return (
    <section className="bg-[var(--color-primary-50)] py-16 md:py-20">
      <div className="container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-primary-600)]">
            {c.eyebrow}
          </p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">{c.heading}</h2>
          <p className="mt-3 text-sm text-[var(--color-muted)]">{c.sub}</p>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl items-center gap-10 md:grid-cols-2">
          {/* Gabarit sacoche + téléphone (pur CSS) */}
          <Reveal className="flex flex-col items-center">
            <div className="relative w-[220px]">
              {/* Cote largeur */}
              <div className="mb-2 flex items-center justify-center gap-2 text-xs font-medium text-[var(--color-primary-700)]">
                <span className="h-px w-6 bg-current" />
                {c.sizeSub}
                <span className="h-px w-6 bg-current" />
              </div>
              {/* Sacoche */}
              <div className="relative aspect-[3/5] rounded-[2rem] bg-white p-3 shadow-lg ring-1 ring-[var(--color-border)]">
                {/* Zip haut */}
                <div className="mx-auto mb-2 h-1.5 w-4/5 rounded-full bg-[var(--color-primary-200)]" />
                {/* Téléphone */}
                <div className="relative h-[calc(100%-1rem)] w-full overflow-hidden rounded-[1.4rem] bg-[var(--color-foreground)]">
                  <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/25" />
                  <div className="absolute inset-3 rounded-xl bg-gradient-to-br from-[var(--color-primary-700)] to-[var(--color-primary-900)] opacity-80" />
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[var(--color-foreground)]">
                    {c.sizeLabel}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Compatibilité + essentiel */}
          <Reveal delay={0.1} className="space-y-8">
            <div>
              <p className="text-sm font-semibold">{c.compatTitle}</p>
              <ul className="mt-3 space-y-2">
                {c.brands.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-sm">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-primary-600)] text-white">
                      <Check className="h-3 w-3" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">{c.alsoTitle}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {c.also.map((a, i) => {
                  const Icon = ALSO_ICONS[i] ?? CreditCard;
                  return (
                    <li
                      key={a}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-[var(--color-border)]"
                    >
                      <Icon className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
                      {a}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

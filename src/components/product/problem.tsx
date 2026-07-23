import { AlertTriangle, CameraOff, ThumbsDown } from "lucide-react";
import { getLocale } from "next-intl/server";
import { getProductCopy } from "@/lib/product-content";
import { Reveal } from "@/components/ui/reveal";

const ICONS = [AlertTriangle, CameraOff, ThumbsDown];

/**
 * « Le problème » — hook émotionnel juste après le hero : on fait ressentir le
 * besoin (perte, photos ratées, waterproof qui fuient) avant d'enchaîner sur la
 * solution (UspGrid). Section texte, aucun visuel requis.
 */
export async function Problem() {
  const c = getProductCopy(await getLocale()).problem;
  return (
    <section className="bg-[var(--color-foreground)] py-16 text-white md:py-20">
      <div className="container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-secondary-200,#fca5a5)]">
            {c.eyebrow}
          </p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">{c.heading}</h2>
          <p className="mt-3 text-sm text-white/70">{c.sub}</p>
        </Reveal>
        <ul className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-3">
          {c.items.map((it, i) => {
            const Icon = ICONS[i] ?? AlertTriangle;
            return (
              <Reveal
                as="li"
                key={it.title}
                delay={i * 0.08}
                className="rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/10"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-[var(--color-secondary-200,#fca5a5)]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold">{it.title}</h3>
                <p className="mt-2 text-sm text-white/65">{it.body}</p>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

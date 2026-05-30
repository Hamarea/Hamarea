import { Star, BadgeCheck } from "lucide-react";
import { getLocale } from "next-intl/server";
import { SACOCHE } from "@/lib/product";
import { getProductCopy } from "@/lib/product-content";
import { Reveal } from "@/components/ui/reveal";
import { CountUp } from "@/components/ui/count-up";

export async function Testimonials() {
  const t = getProductCopy(await getLocale()).testimonials;
  return (
    <section id="avis" className="bg-[var(--color-bg)] py-16 md:py-20 scroll-mt-20">
      <div className="container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-5 w-5 fill-yellow-400 text-yellow-400"
                />
              ))}
            </span>
            <span className="font-semibold">{SACOCHE.rating}/5</span>
          </div>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {t.basedOnPrefix}
            <CountUp to={SACOCHE.ratingCount} />
            {t.basedOnSuffix}
          </p>
          <h2 className="mt-4 font-display text-3xl md:text-4xl">{t.heading}</h2>
        </Reveal>

        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {t.reviews.map((r, i) => (
            <Reveal
              as="li"
              key={r.author}
              delay={i * 0.06}
              className="flex flex-col rounded-2xl bg-white p-6 ring-1 ring-[var(--color-border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="flex">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`h-4 w-4 ${
                      j < r.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-transparent text-[var(--color-border)]"
                    }`}
                  />
                ))}
              </span>
              <p className="mt-3 font-semibold">{r.title}</p>
              <p className="mt-2 flex-1 text-sm text-[var(--color-muted)]">
                « {r.body} »
              </p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="font-medium">{r.author}</span>
                {r.verified && (
                  <span className="flex items-center gap-1 text-[var(--color-success,#16a34a)]">
                    <BadgeCheck className="h-3.5 w-3.5" /> {t.verified}
                  </span>
                )}
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

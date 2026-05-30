import { getLocale } from "next-intl/server";
import { getProductCopy } from "@/lib/product-content";
import { Reveal } from "@/components/ui/reveal";

export async function HowItWorks() {
  const copy = getProductCopy(await getLocale());
  return (
    <section className="bg-[var(--color-primary-50)] py-16 md:py-20">
      <div className="container-page">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-primary-600)]">
            {copy.how.eyebrow}
          </p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">{copy.how.heading}</h2>
        </Reveal>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {copy.how.steps.map((s, i) => (
            <Reveal
              as="li"
              key={s.n}
              delay={i * 0.1}
              className="relative rounded-2xl bg-white p-7 ring-1 ring-[var(--color-border)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="font-display text-5xl font-black text-[var(--color-primary-200)]">
                {s.n}
              </span>
              <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{s.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

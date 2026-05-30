import { Droplets, Fingerprint, Smartphone, Anchor } from "lucide-react";
import { getLocale } from "next-intl/server";
import { getProductCopy } from "@/lib/product-content";
import { Reveal } from "@/components/ui/reveal";

const ICONS = {
  droplets: Droplets,
  fingerprint: Fingerprint,
  phone: Smartphone,
  anchor: Anchor,
} as const;

export async function UspGrid() {
  const copy = getProductCopy(await getLocale());
  return (
    <section className="container-page py-16 md:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-primary-600)]">
          {copy.usp.eyebrow}
        </p>
        <h2 className="mt-2 font-display text-3xl md:text-4xl">{copy.usp.heading}</h2>
      </Reveal>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {copy.usp.items.map((u, i) => {
          const Icon = ICONS[u.icon] ?? Droplets;
          return (
            <Reveal
              as="li"
              key={u.title}
              delay={i * 0.07}
              className="rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-600)]">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-semibold">{u.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{u.body}</p>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}

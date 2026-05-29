import { Droplets, Fingerprint, Smartphone, Anchor } from "lucide-react";
import { SACOCHE } from "@/lib/product";
import { Reveal } from "@/components/ui/reveal";

const ICONS = {
  droplets: Droplets,
  fingerprint: Fingerprint,
  phone: Smartphone,
  anchor: Anchor,
} as const;

export function UspGrid() {
  return (
    <section className="container-page py-16 md:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-primary-600)]">
          Pourquoi Hamarea
        </p>
        <h2 className="mt-2 font-display text-3xl md:text-4xl">
          Conçue pour résister là où les autres lâchent.
        </h2>
      </Reveal>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {SACOCHE.usps.map((u, i) => {
          const Icon = ICONS[u.icon as keyof typeof ICONS] ?? Droplets;
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

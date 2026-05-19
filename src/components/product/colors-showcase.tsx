import Image from "next/image";
import { SACOCHE } from "@/lib/product";

export function ColorsShowcase() {
  return (
    <section className="container-page py-16 md:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-primary-600)]">
          3 couleurs
        </p>
        <h2 className="mt-2 font-display text-3xl md:text-4xl">
          La vôtre, c&apos;est laquelle ?
        </h2>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Rose poudré, noir intemporel ou blanc minimaliste. Toutes en édition limitée.
        </p>
      </div>

      <ul className="mt-10 grid gap-6 md:grid-cols-3">
        {SACOCHE.colors.map((c) => (
          <li key={c.id} className="group overflow-hidden rounded-2xl bg-[var(--color-bg)]">
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image
                src={c.imageUrl}
                alt={`Sacoche Hamarea ${c.name}`}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span
                className="absolute right-4 top-4 h-8 w-8 rounded-full ring-2 ring-white shadow-md"
                style={{ backgroundColor: c.hex }}
                aria-hidden
              />
            </div>
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="font-display text-xl">{c.name}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  Édition limitée
                </p>
              </div>
              <a
                href="#acheter"
                className="rounded-full bg-[var(--color-foreground)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                Choisir
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

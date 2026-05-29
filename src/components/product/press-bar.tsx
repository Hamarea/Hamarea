import { SACOCHE } from "@/lib/product";

export function PressBar() {
  return (
    <section className="py-10">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-muted)]">
        Ils en parlent
      </p>
      <div className="marquee-mask mt-4 overflow-hidden">
        <div className="animate-marquee flex w-max">
          {[0, 1].map((set) => (
            <ul
              key={set}
              aria-hidden={set === 1}
              className="flex shrink-0 items-center gap-x-12 pr-12"
            >
              {SACOCHE.press.map((p) => (
                <li
                  key={p}
                  className="shrink-0 font-display text-xl tracking-tight text-[var(--color-foreground)]/70 grayscale"
                >
                  {p}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

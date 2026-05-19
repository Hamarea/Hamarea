import { SACOCHE } from "@/lib/product";

export function PressBar() {
  return (
    <section className="container-page py-10">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-muted)]">
        Ils en parlent
      </p>
      <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
        {SACOCHE.press.map((p) => (
          <li
            key={p}
            className="font-display text-xl tracking-tight text-[var(--color-foreground)]/80 grayscale"
          >
            {p}
          </li>
        ))}
      </ul>
    </section>
  );
}

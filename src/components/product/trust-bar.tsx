import { Truck, ShieldCheck, RotateCcw, Lock } from "lucide-react";
import { getLocale } from "next-intl/server";
import { getProductCopy } from "@/lib/product-content";
import { Reveal } from "@/components/ui/reveal";

const ICONS = [Truck, ShieldCheck, RotateCcw, Lock];

export async function TrustBar() {
  const copy = getProductCopy(await getLocale());
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="container-page grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {copy.trust.items.map((it, i) => {
          const Icon = ICONS[i] ?? Truck;
          return (
            <Reveal as="div" key={it.title} delay={i * 0.06} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white ring-1 ring-[var(--color-border)] text-[var(--color-primary-600)]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{it.title}</p>
                <p className="text-xs text-[var(--color-muted)]">{it.subtitle}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

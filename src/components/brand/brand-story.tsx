import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { getBrandCopy } from "@/lib/brand-content";

/** Manifesto teaser — depth lives on /about; this stays shoppable & short. */
export function BrandStory({ locale }: { locale: string }) {
  const c = getBrandCopy(locale).story;
  return (
    <section className="relative overflow-hidden bg-[var(--color-foreground)] py-20 text-white">
      <Image
        src="/colors/blanc.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-15"
      />
      <Reveal className="container-page relative max-w-3xl">
        <span className="brand-eyebrow text-[var(--color-primary-300)]">{c.eyebrow}</span>
        <h2 className="mt-3 font-display text-3xl md:text-5xl">{c.heading}</h2>
        <p className="mt-5 text-lg leading-relaxed text-white/85">{c.body}</p>
        <Link
          href="/about"
          className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 py-3 font-semibold text-[var(--color-foreground)] transition-transform hover:scale-[1.03] active:scale-95"
        >
          {c.cta}
          <ArrowRight className="h-5 w-5" />
        </Link>
      </Reveal>
    </section>
  );
}

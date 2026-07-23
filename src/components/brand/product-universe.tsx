import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Smartphone, Shirt, Umbrella, CupSoda, Package, Layers } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { getBrandCopy, type ProductKey } from "@/lib/brand-content";
import { listActiveCategories, listActiveProductsLite } from "@/lib/queries";

const ICONS: Record<ProductKey, typeof Smartphone> = {
  sacoche: Smartphone,
  lycra: Shirt,
  capuche: Umbrella,
  cup: CupSoda,
  accessoires: Package,
};

/**
 * Keywords (found in a product's slug or name) that map a real catalog product
 * to a brand family. Used ONLY by the teaser fallback (no categories yet).
 */
const FAMILY_KEYWORDS: Record<ProductKey, string[]> = {
  sacoche: ["sacoche", "pouch"],
  lycra: ["lycra", "licra", "rashguard", "rash guard", "anti-uv"],
  capuche: ["poncho", "changing robe", "cape de bain"],
  cup: ["gourde", "flask", "bouteille", "gobelet"],
  accessoires: ["accessoire", "bonnet", "dry bag", "sac etanche"],
};

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const cardCls =
  "group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]";

/** Cap the grid columns to the number of categories so 2–3 don't look stranded. */
function colsClass(n: number): string {
  if (n <= 2) return "lg:grid-cols-2";
  if (n === 3) return "lg:grid-cols-3";
  return "lg:grid-cols-4";
}

/**
 * « L'Univers » — the full range at a glance, CONNECTED to the real catalog
 * **categories** the admin manages (image, name, description). Each card links
 * to that category's filtered shop. Falls back to a brand teaser when no
 * category exists yet, so a brand-new install still looks complete.
 */
export async function ProductUniverse({ locale }: { locale: string }) {
  const c = getBrandCopy(locale).universe;
  const categories = await listActiveCategories(locale);

  if (categories.length === 0) return <UniverseTeaser locale={locale} />;

  return (
    <section id="univers" className="container-page scroll-mt-20 py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="brand-eyebrow text-[var(--color-primary-600)]">{c.eyebrow}</span>
        <h2 className="mt-3 font-display text-3xl md:text-5xl">{c.heading}</h2>
        <p className="mt-3 text-[var(--color-muted)]">{c.sub}</p>
      </Reveal>

      <ul className={`mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 ${colsClass(categories.length)}`}>
        {categories.map((cat, i) => (
          <Reveal as="li" key={cat.id} delay={i * 0.05} className="h-full">
            <Link href="/sacoche" className={cardCls}>
              <div className="relative aspect-[4/5] overflow-hidden">
                {cat.image_url ? (
                  <Image
                    src={cat.image_url}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="brand-gradient flex h-full items-center justify-center opacity-90 transition-transform duration-500 group-hover:scale-105">
                    <Layers className="h-12 w-12 text-white/90" aria-hidden />
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-[var(--color-primary-600)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  {c.badgeAvailable}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display text-lg leading-tight">{cat.name}</h3>
                {cat.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">
                    {cat.description}
                  </p>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary-700)]">
                  {c.discover}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

/**
 * Fallback when the catalog has no category yet: the curated brand families
 * (« Bientôt » teasers), each flipping to "available" if a matching product is
 * already published. Keeps the home complete before the admin sets up categories.
 */
async function UniverseTeaser({ locale }: { locale: string }) {
  const c = getBrandCopy(locale).universe;
  const products = await listActiveProductsLite(locale);

  const matchProduct = (key: ProductKey) => {
    const kws = (FAMILY_KEYWORDS[key] ?? []).map(normalize);
    return products.find((p) => {
      const hay = normalize(`${p.slug} ${p.name}`);
      return kws.some((kw) => hay.includes(kw));
    });
  };

  return (
    <section id="univers" className="container-page scroll-mt-20 py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="brand-eyebrow text-[var(--color-primary-600)]">{c.eyebrow}</span>
        <h2 className="mt-3 font-display text-3xl md:text-5xl">{c.heading}</h2>
        <p className="mt-3 text-[var(--color-muted)]">{c.sub}</p>
      </Reveal>

      <ul className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {c.items.map((item, i) => {
          const Icon = ICONS[item.key];
          const match = matchProduct(item.key);
          const available = item.status === "available" || Boolean(match);
          const href =
            item.status === "available"
              ? "/sacoche"
              : match
                ? `/products/${match.slug}`
                : "#waitlist";
          const imageSrc =
            item.status === "available" ? "/colors/noir.jpg" : (match?.image_url ?? null);

          const inner = (
            <>
              <div className="relative aspect-[4/5] overflow-hidden">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={item.name}
                    fill
                    sizes="(max-width: 1024px) 50vw, 20vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="brand-gradient flex h-full items-center justify-center opacity-90 transition-transform duration-500 group-hover:scale-105">
                    <Icon className="h-12 w-12 text-white/90" aria-hidden />
                  </div>
                )}
                <span
                  className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    available
                      ? "bg-[var(--color-primary-600)] text-white"
                      : "bg-white/90 text-[var(--color-foreground)]"
                  }`}
                >
                  {available ? c.badgeAvailable : c.badgeSoon}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display text-lg leading-tight">{item.name}</h3>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{item.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary-700)]">
                  {available ? c.discover : c.notify}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </>
          );
          return (
            <Reveal as="li" key={item.key} delay={i * 0.05} className="h-full">
              {href.startsWith("#") ? (
                <a href={href} className={cardCls}>
                  {inner}
                </a>
              ) : (
                <Link href={href as never} className={cardCls}>
                  {inner}
                </Link>
              )}
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}

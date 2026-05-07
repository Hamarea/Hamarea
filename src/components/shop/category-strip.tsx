import { Link } from "@/i18n/navigation";
import type { CategoryCard } from "@/lib/queries";

export function CategoryStrip({ categories }: { categories: CategoryCard[] }) {
  if (categories.length === 0) return null;
  return (
    <section className="container-page py-12">
      <ul className="grid gap-4 sm:grid-cols-3">
        {categories.map((c, i) => (
          <li key={c.id}>
            <Link
              href={`/categories/${c.slug}` as never}
              className={`flex h-32 items-end overflow-hidden rounded-xl p-5 text-white shadow-sm transition-transform hover:scale-[1.02] ${
                i === 0
                  ? "bg-gradient-to-br from-[var(--color-primary-600)] to-[var(--color-primary-800)]"
                  : i === 1
                  ? "bg-gradient-to-br from-[var(--color-secondary-400)] to-[var(--color-secondary-700)]"
                  : "bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-700)]"
              }`}
            >
              <span className="font-display text-xl">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

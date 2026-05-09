import { getTranslations, setRequestLocale } from "next-intl/server";
import { Search, ArrowUpDown, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ProductGrid } from "@/components/shop/product-grid";
import { Button } from "@/components/ui/button";
import {
  listProducts,
  listCategories,
  type ProductSort,
} from "@/lib/queries";

const VALID_SORTS: ProductSort[] = ["newest", "oldest", "price-asc", "price-desc"];
const PER_PAGE = 12;

function parseSort(input?: string): ProductSort {
  return (VALID_SORTS as readonly string[]).includes(input ?? "")
    ? (input as ProductSort)
    : "newest";
}

function parsePage(input?: string): number {
  const n = Number(input);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    sort?: string;
    page?: string;
    category?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);
  const category = (sp.category ?? "").trim();

  const [result, categories] = await Promise.all([
    listProducts({
      locale,
      page,
      perPage: PER_PAGE,
      sort,
      q,
      categorySlug: category,
    }),
    listCategories(locale),
  ]);

  const hasFilters = Boolean(q || category || sort !== "newest");

  return (
    <section className="container-page py-12">
      <header className="mb-8">
        <h1 className="font-display text-4xl">{t("nav.shop")}</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {t("shop.resultsCount", { count: result.total })}
        </p>
      </header>

      <form
        method="get"
        className="mb-8 grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:grid-cols-[1fr_220px_220px_auto]"
      >
        <label className="relative flex items-center">
          <span className="sr-only">{t("common.search")}</span>
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--color-muted)]" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("shop.searchPlaceholder")}
            className="h-10 w-full rounded-md border border-[var(--color-border)] bg-white pl-9 pr-3 text-sm focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)]"
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="sr-only">{t("shop.filterCategory")}</span>
          <select
            name="category"
            defaultValue={category}
            className="h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)]"
          >
            <option value="">{t("shop.allCategories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <ArrowUpDown
            className="hidden h-4 w-4 text-[var(--color-muted)] md:block"
            aria-hidden
          />
          <span className="sr-only">{t("shop.sortLabel")}</span>
          <select
            name="sort"
            defaultValue={sort}
            className="h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)]"
          >
            <option value="newest">{t("shop.sort.newest")}</option>
            <option value="oldest">{t("shop.sort.oldest")}</option>
            <option value="price-asc">{t("shop.sort.priceAsc")}</option>
            <option value="price-desc">{t("shop.sort.priceDesc")}</option>
          </select>
        </label>

        <div className="flex items-center gap-2">
          <Button type="submit" className="h-10">
            <Search className="h-4 w-4" />
            {t("common.search")}
          </Button>
          {hasFilters && (
            <Button asChild type="button" variant="ghost" className="h-10">
              <Link href="/products">
                <X className="h-4 w-4" />
                {t("shop.resetFilters")}
              </Link>
            </Button>
          )}
        </div>
      </form>

      {result.products.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-[var(--color-border)] py-20 text-center text-[var(--color-muted)]">
          <p>{t("shop.empty")}</p>
          {hasFilters && (
            <Button asChild variant="outline" className="mt-4">
              <Link href="/products">{t("shop.resetFilters")}</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <ProductGrid products={result.products} locale={locale} />

          {result.totalPages > 1 && (
            <nav
              aria-label="pagination"
              className="mt-10 flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-6"
            >
              <PaginationLink
                page={page - 1}
                disabled={page <= 1}
                q={q}
                sort={sort}
                category={category}
                label={`← ${t("shop.pagination.prev")}`}
              />
              <span className="text-sm text-[var(--color-muted)]">
                {t("shop.pagination.page", {
                  current: page,
                  total: result.totalPages,
                })}
              </span>
              <PaginationLink
                page={page + 1}
                disabled={page >= result.totalPages}
                q={q}
                sort={sort}
                category={category}
                label={`${t("shop.pagination.next")} →`}
              />
            </nav>
          )}
        </>
      )}
    </section>
  );
}

function PaginationLink({
  page,
  disabled,
  q,
  sort,
  category,
  label,
}: {
  page: number;
  disabled: boolean;
  q: string;
  sort: ProductSort;
  category: string;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="text-sm text-[var(--color-muted)]/50" aria-disabled>
        {label}
      </span>
    );
  }
  const query: Record<string, string> = { page: String(page) };
  if (q) query.q = q;
  if (sort !== "newest") query.sort = sort;
  if (category) query.category = category;
  return (
    <Link
      href={{ pathname: "/products", query }}
      className="text-sm font-medium text-[var(--color-primary-600)] hover:underline"
    >
      {label}
    </Link>
  );
}

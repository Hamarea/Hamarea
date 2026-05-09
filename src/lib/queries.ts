import { createClient } from "@/lib/supabase/server";

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  price_cents: number;
  compare_at_price_cents?: number | null;
  currency: string;
  image_url?: string;
  in_stock: boolean;
};

export type CategoryCard = {
  id: string;
  slug: string;
  name: string;
  image_url?: string | null;
};

export type VariantOption = {
  id: string;
  sku: string;
  options: Record<string, string>;
  price_cents: number;
  compare_at_price_cents: number | null;
  currency: string;
  active: boolean;
};

export type ProductImage = {
  url: string;
  alt: string;
  position: number;
};

export type ProductDetail = ProductCard & {
  variants: VariantOption[];
  images: ProductImage[];
  category: { slug: string; name: string } | null;
};

export type ProductSort = "newest" | "oldest" | "price-asc" | "price-desc";

export type ListProductsParams = {
  locale: string;
  page?: number;
  perPage?: number;
  sort?: ProductSort;
  q?: string;
  categorySlug?: string;
};

export type ListProductsResult = {
  products: ProductCard[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

const isConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

const SAMPLE_PRODUCTS: ProductCard[] = [
  {
    id: "demo-sacoche-drift-20l",
    slug: "sacoche-drift-20l",
    name: "Sacoche étanche Drift 20L",
    description:
      "Sacoche roll-top en TPU 600D, soudée haute fréquence. IPX6, sangle bandoulière amovible.",
    price_cents: 7900,
    compare_at_price_cents: 9900,
    currency: "EUR",
    image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800",
    in_stock: true,
  },
  {
    id: "demo-lunettes-cap-ferret",
    slug: "lunettes-cap-ferret",
    name: "Lunettes Cap Ferret",
    description: "Solaires polarisées, monture acétate, verres UV400 catégorie 3.",
    price_cents: 8900,
    currency: "EUR",
    image_url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800",
    in_stock: true,
  },
  {
    id: "demo-casquette-bay",
    slug: "casquette-bay",
    name: "Casquette 6-panneaux Bay",
    description: "Coton lavé, visière préformée, sangle ajustable laiton.",
    price_cents: 3500,
    currency: "EUR",
    image_url: "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800",
    in_stock: true,
  },
];

const SAMPLE_CATEGORIES: CategoryCard[] = [
  { id: "c-sacoches", slug: "sacoches", name: "Sacoches" },
  { id: "c-lunettes", slug: "lunettes", name: "Lunettes" },
  { id: "c-casquettes", slug: "casquettes", name: "Casquettes" },
];

// --- Sample category mapping for dev fallback ---
const SAMPLE_CATEGORY_OF: Record<string, string> = {
  "sacoche-drift-20l": "sacoches",
  "lunettes-cap-ferret": "lunettes",
  "casquette-bay": "casquettes",
};

function sortProducts(items: ProductCard[], sort: ProductSort): ProductCard[] {
  const copy = [...items];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price_cents - b.price_cents);
    case "price-desc":
      return copy.sort((a, b) => b.price_cents - a.price_cents);
    case "oldest":
      return copy.reverse();
    case "newest":
    default:
      return copy;
  }
}

function paginate<T>(arr: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage;
  return arr.slice(start, start + perPage);
}

// ----- Supabase result row shapes -----
type ProductRowList = {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  created_at: string;
  product_variants: Array<{
    price_cents: number;
    compare_at_price_cents: number | null;
    currency: string;
    active: boolean;
    position: number;
  }>;
  product_images: Array<{ storage_path: string; alt_i18n: Record<string, string>; position: number }>;
  category?: { slug: string } | null;
};

type ProductRowDetail = {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
  brand: string | null;
  product_variants: Array<{
    id: string;
    sku: string;
    option_values: Record<string, string>;
    price_cents: number;
    compare_at_price_cents: number | null;
    currency: string;
    active: boolean;
    position: number;
  }>;
  product_images: Array<{
    storage_path: string;
    alt_i18n: Record<string, string>;
    position: number;
  }>;
  category: { slug: string; name_i18n: Record<string, string> } | null;
};

function rowToCard(row: ProductRowList, locale: string): ProductCard {
  const variant = row.product_variants?.find((v) => v.active) ?? row.product_variants?.[0];
  const image = row.product_images?.sort((a, b) => a.position - b.position)?.[0];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name_i18n?.[locale] ?? row.name_i18n?.fr ?? row.slug,
    description: row.description_i18n?.[locale] ?? row.description_i18n?.fr ?? "",
    price_cents: variant?.price_cents ?? 0,
    compare_at_price_cents: variant?.compare_at_price_cents ?? null,
    currency: variant?.currency ?? "EUR",
    image_url: image?.storage_path,
    in_stock: true,
  };
}

// Loose typed builder — Supabase JS types are not generated yet.
type Builder = {
  select: (q: string, opts?: { count?: "exact"; head?: boolean }) => Builder;
  eq: (k: string, v: string | number | boolean) => Builder;
  ilike: (k: string, v: string) => Builder;
  or: (filter: string) => Builder;
  order: (
    k: string,
    opts?: { ascending?: boolean; foreignTable?: string },
  ) => Builder;
  range: (from: number, to: number) => Builder;
  limit: (n: number) => Builder;
  maybeSingle: <T>() => Promise<{ data: T | null }>;
  // Awaiting a Builder resolves to a list response.
} & Promise<{ data: unknown; count: number | null }>;

type SBClient = { from: (table: string) => Builder };

export async function listFeaturedProducts(
  locale: string,
  limit = 8,
): Promise<ProductCard[]> {
  if (!isConfigured()) return SAMPLE_PRODUCTS.slice(0, limit);
  try {
    const supabase = (await createClient()) as unknown as SBClient;
    const res = (await supabase
      .from("products")
      .select(
        "id, slug, name_i18n, description_i18n, created_at, product_variants(price_cents, compare_at_price_cents, currency, active, position), product_images(storage_path, alt_i18n, position)",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit)) as unknown as { data: ProductRowList[] | null };
    const data = res.data ?? [];
    if (data.length === 0) return SAMPLE_PRODUCTS.slice(0, limit);
    return data.map((p) => rowToCard(p, locale));
  } catch {
    return SAMPLE_PRODUCTS.slice(0, limit);
  }
}

export async function listProducts(
  params: ListProductsParams,
): Promise<ListProductsResult> {
  const {
    locale,
    page = 1,
    perPage = 12,
    sort = "newest",
    q = "",
    categorySlug = "",
  } = params;

  if (!isConfigured()) {
    let pool = SAMPLE_PRODUCTS;
    if (q) {
      const needle = q.toLowerCase();
      pool = pool.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          (p.description ?? "").toLowerCase().includes(needle),
      );
    }
    if (categorySlug) {
      pool = pool.filter((p) => SAMPLE_CATEGORY_OF[p.slug] === categorySlug);
    }
    const sorted = sortProducts(pool, sort);
    const total = sorted.length;
    return {
      products: paginate(sorted, page, perPage),
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  try {
    const supabase = (await createClient()) as unknown as SBClient;
    let builder = supabase
      .from("products")
      .select(
        "id, slug, name_i18n, description_i18n, created_at, product_variants(price_cents, compare_at_price_cents, currency, active, position), product_images(storage_path, alt_i18n, position), category:category_id(slug)",
        { count: "exact" },
      )
      .eq("status", "active");

    if (q) {
      const escaped = q.replace(/[%_]/g, "\\$&");
      builder = builder.or(
        `name_i18n->>${locale}.ilike.%${escaped}%,name_i18n->>fr.ilike.%${escaped}%,description_i18n->>${locale}.ilike.%${escaped}%`,
      );
    }
    if (categorySlug) {
      builder = builder.eq("category.slug", categorySlug);
    }

    const ascending = sort === "oldest";
    builder = builder.order("created_at", { ascending });

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    builder = builder.range(from, to);

    const res = (await builder) as unknown as {
      data: ProductRowList[] | null;
      count: number | null;
    };
    let products = (res.data ?? []).map((p) => rowToCard(p, locale));

    if (sort === "price-asc" || sort === "price-desc") {
      products = sortProducts(products, sort);
    }

    const total = res.count ?? products.length;
    return {
      products,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  } catch {
    return {
      products: [],
      total: 0,
      page,
      perPage,
      totalPages: 1,
    };
  }
}

export async function getProductBySlug(
  slug: string,
  locale: string,
): Promise<ProductDetail | null> {
  if (!isConfigured()) {
    const sample = SAMPLE_PRODUCTS.find((p) => p.slug === slug);
    if (!sample) return null;
    return {
      ...sample,
      variants: [
        {
          id: sample.id,
          sku: `${sample.slug.toUpperCase()}-DEFAULT`,
          options: {},
          price_cents: sample.price_cents,
          compare_at_price_cents: sample.compare_at_price_cents ?? null,
          currency: sample.currency,
          active: true,
        },
      ],
      images: sample.image_url
        ? [{ url: sample.image_url, alt: sample.name, position: 0 }]
        : [],
      category: SAMPLE_CATEGORY_OF[sample.slug]
        ? {
            slug: SAMPLE_CATEGORY_OF[sample.slug],
            name:
              SAMPLE_CATEGORIES.find(
                (c) => c.slug === SAMPLE_CATEGORY_OF[sample.slug],
              )?.name ?? SAMPLE_CATEGORY_OF[sample.slug],
          }
        : null,
    };
  }

  try {
    const supabase = (await createClient()) as unknown as SBClient;
    const res = await supabase
      .from("products")
      .select(
        "id, slug, name_i18n, description_i18n, brand, product_variants(id, sku, option_values, price_cents, compare_at_price_cents, currency, active, position), product_images(storage_path, alt_i18n, position), category:category_id(slug, name_i18n)",
      )
      .eq("status", "active")
      .eq("slug", slug)
      .maybeSingle<ProductRowDetail>();

    const row = res.data;
    if (!row) return null;

    const variants: VariantOption[] = (row.product_variants ?? [])
      .sort((a, b) => a.position - b.position)
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        options: v.option_values ?? {},
        price_cents: v.price_cents,
        compare_at_price_cents: v.compare_at_price_cents,
        currency: v.currency,
        active: v.active,
      }));

    const images: ProductImage[] = (row.product_images ?? [])
      .sort((a, b) => a.position - b.position)
      .map((img, idx) => ({
        url: img.storage_path,
        alt: img.alt_i18n?.[locale] ?? img.alt_i18n?.fr ?? row.slug,
        position: idx,
      }));

    const firstActive = variants.find((v) => v.active) ?? variants[0];
    return {
      id: row.id,
      slug: row.slug,
      name: row.name_i18n?.[locale] ?? row.name_i18n?.fr ?? row.slug,
      description:
        row.description_i18n?.[locale] ?? row.description_i18n?.fr ?? "",
      price_cents: firstActive?.price_cents ?? 0,
      compare_at_price_cents: firstActive?.compare_at_price_cents ?? null,
      currency: firstActive?.currency ?? "EUR",
      image_url: images[0]?.url,
      in_stock: variants.some((v) => v.active),
      variants,
      images,
      category: row.category
        ? {
            slug: row.category.slug,
            name:
              row.category.name_i18n?.[locale] ??
              row.category.name_i18n?.fr ??
              row.category.slug,
          }
        : null,
    };
  } catch {
    return null;
  }
}

export async function listCategories(locale: string): Promise<CategoryCard[]> {
  if (!isConfigured()) return SAMPLE_CATEGORIES;
  try {
    const supabase = (await createClient()) as unknown as SBClient;
    const res = (await supabase
      .from("categories")
      .select("id, slug, name_i18n, image_url")
      .eq("active", true)
      .order("position")) as unknown as {
      data: Array<{
        id: string;
        slug: string;
        name_i18n: Record<string, string>;
        image_url: string | null;
      }> | null;
    };
    const data = res.data ?? [];
    if (data.length === 0) return SAMPLE_CATEGORIES;
    return data.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name_i18n?.[locale] ?? c.name_i18n?.fr ?? c.slug,
      image_url: c.image_url,
    }));
  } catch {
    return SAMPLE_CATEGORIES;
  }
}

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

export type ProductSeo = {
  title?: Record<string, string>;
  description?: Record<string, string>;
};

export type ProductDetail = ProductCard & {
  variants: VariantOption[];
  images: ProductImage[];
  category: { slug: string; name: string } | null;
  seo?: ProductSeo | null;
  preorder?: boolean;
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
    id: "demo-1",
    slug: "carnet-cuir-marron",
    name: "Carnet en cuir Marron",
    description: "Carnet relié main, papier ivoire 120 g/m².",
    price_cents: 4900,
    compare_at_price_cents: 6900,
    currency: "EUR",
    image_url: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800",
    in_stock: true,
  },
  {
    id: "demo-2",
    slug: "tasse-ceramique-vert-sauge",
    name: "Tasse céramique Vert sauge",
    description: "Faïence émaillée, fabrication Portugal.",
    price_cents: 1990,
    currency: "EUR",
    image_url: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800",
    in_stock: true,
  },
  {
    id: "demo-3",
    slug: "porte-feuille-bleu-nuit",
    name: "Porte-feuille Bleu nuit",
    description: "Cuir pleine fleur, made in France.",
    price_cents: 7900,
    currency: "EUR",
    image_url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800",
    in_stock: true,
  },
  {
    id: "demo-4",
    slug: "echarpe-laine-vert",
    name: "Écharpe laine Vert",
    description: "100 % laine mérinos, tissée en Italie.",
    price_cents: 5900,
    currency: "EUR",
    image_url: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800",
    in_stock: false,
  },
  {
    id: "demo-5",
    slug: "bougie-cedre",
    name: "Bougie Cèdre & vétiver",
    description: "Cire végétale, mèche coton, 220 g.",
    price_cents: 2900,
    currency: "EUR",
    image_url: "https://images.unsplash.com/photo-1602874801006-e26c4d2b6cc7?w=800",
    in_stock: true,
  },
  {
    id: "demo-6",
    slug: "sac-toile-marin",
    name: "Sac de toile Bleu marin",
    description: "Toile coton bio, anses cuir.",
    price_cents: 3900,
    currency: "EUR",
    image_url: "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800",
    in_stock: true,
  },
  {
    id: "demo-7",
    slug: "vase-terre-cuite",
    name: "Vase terre cuite",
    description: "Tournée à la main, finition mate.",
    price_cents: 4500,
    currency: "EUR",
    image_url: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800",
    in_stock: true,
  },
  {
    id: "demo-8",
    slug: "ceinture-cuir-cognac",
    name: "Ceinture cuir Cognac",
    description: "Cuir tannage végétal, boucle laiton.",
    price_cents: 6500,
    currency: "EUR",
    image_url: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800",
    in_stock: true,
  },
];

const SAMPLE_CATEGORIES: CategoryCard[] = [
  { id: "c1", slug: "accessoires", name: "Accessoires" },
  { id: "c2", slug: "maison", name: "Maison" },
  { id: "c3", slug: "mode", name: "Mode" },
];

// --- Sample category mapping for dev fallback ---
const SAMPLE_CATEGORY_OF: Record<string, string> = {
  "carnet-cuir-marron": "accessoires",
  "tasse-ceramique-vert-sauge": "maison",
  "porte-feuille-bleu-nuit": "accessoires",
  "echarpe-laine-vert": "mode",
  "bougie-cedre": "maison",
  "sac-toile-marin": "accessoires",
  "vase-terre-cuite": "maison",
  "ceinture-cuir-cognac": "mode",
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
  seo: ProductSeo | null;
  brand: string | null;
  preorder: boolean | null;
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
      seo: null,
      preorder: false,
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
        "id, slug, name_i18n, description_i18n, seo, brand, preorder, product_variants(id, sku, option_values, price_cents, compare_at_price_cents, currency, active, position), product_images(storage_path, alt_i18n, position), category:category_id(slug, name_i18n)",
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
      seo: row.seo ?? null,
      preorder: row.preorder ?? false,
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

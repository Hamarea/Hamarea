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

const isConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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

export async function listFeaturedProducts(
  locale: string,
  limit = 8
): Promise<ProductCard[]> {
  if (!isConfigured()) return SAMPLE_PRODUCTS.slice(0, limit);
  try {
    const supabase = await createClient();
    type Row = {
      id: string;
      slug: string;
      name_i18n: Record<string, string>;
      description_i18n: Record<string, string>;
      product_variants: Array<{
        price_cents: number;
        compare_at_price_cents: number | null;
        currency: string;
      }>;
      product_images: Array<{ storage_path: string }>;
    };
    const { data } = await (supabase as unknown as {
      from: (
        t: string
      ) => {
        select: (q: string) => {
          eq: (
            k: string,
            v: string
          ) => {
            limit: (n: number) => Promise<{ data: Row[] | null }>;
          };
        };
      };
    })
      .from("products")
      .select(
        "id, slug, name_i18n, description_i18n, product_variants(price_cents, compare_at_price_cents, currency), product_images(storage_path)"
      )
      .eq("status", "active")
      .limit(limit);

    if (!data || data.length === 0) return SAMPLE_PRODUCTS.slice(0, limit);
    return data.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name_i18n?.[locale] ?? p.name_i18n?.fr ?? p.slug,
      description:
        p.description_i18n?.[locale] ?? p.description_i18n?.fr ?? "",
      price_cents: p.product_variants?.[0]?.price_cents ?? 0,
      compare_at_price_cents:
        p.product_variants?.[0]?.compare_at_price_cents ?? null,
      currency: p.product_variants?.[0]?.currency ?? "EUR",
      image_url: p.product_images?.[0]?.storage_path,
      in_stock: true,
    }));
  } catch {
    return SAMPLE_PRODUCTS.slice(0, limit);
  }
}

export async function getProductBySlug(
  slug: string,
  locale: string
): Promise<ProductCard | null> {
  const all = await listFeaturedProducts(locale, 24);
  return all.find((p) => p.slug === slug) ?? null;
}

export async function listCategories(locale: string): Promise<CategoryCard[]> {
  if (!isConfigured()) return SAMPLE_CATEGORIES;
  try {
    const supabase = await createClient();
    type Row = {
      id: string;
      slug: string;
      name_i18n: Record<string, string>;
      image_url: string | null;
    };
    const { data } = await (supabase as unknown as {
      from: (
        t: string
      ) => {
        select: (q: string) => {
          eq: (
            k: string,
            v: boolean
          ) => {
            order: (
              k: string
            ) => Promise<{ data: Row[] | null }>;
          };
        };
      };
    })
      .from("categories")
      .select("id, slug, name_i18n, image_url")
      .eq("active", true)
      .order("position");
    if (!data || data.length === 0) return SAMPLE_CATEGORIES;
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

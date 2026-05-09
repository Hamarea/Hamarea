import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_SLUGS = ["terms", "privacy", "notice"] as const;
type LegalSlug = (typeof ALLOWED_SLUGS)[number];

const TITLE_KEY: Record<LegalSlug, "footer.terms" | "footer.privacy" | "footer.legal"> = {
  terms: "footer.terms",
  privacy: "footer.privacy",
  notice: "footer.legal",
};

type PageRow = {
  title_i18n: Record<string, string>;
  content_i18n: Record<string, string>;
  updated_at: string;
};

async function fetchPage(slug: string): Promise<PageRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }
  try {
    const supabase = await createClient();
    const sb = supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          eq: (k: string, v: string) => {
            eq: (k: string, v: boolean) => {
              maybeSingle: () => Promise<{ data: PageRow | null }>;
            };
          };
        };
      };
    };
    const { data } = await sb
      .from("pages")
      .select("title_i18n, content_i18n, updated_at")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  if (!(ALLOWED_SLUGS as readonly string[]).includes(slug)) notFound();

  const t = await getTranslations();
  const tLegal = await getTranslations("legal");
  const safeSlug = slug as LegalSlug;
  const fallbackTitle = t(TITLE_KEY[safeSlug]);
  const page = await fetchPage(slug);

  const title =
    page?.title_i18n?.[locale] ?? page?.title_i18n?.fr ?? fallbackTitle;
  const content =
    page?.content_i18n?.[locale] ?? page?.content_i18n?.fr ?? null;
  const updatedAt = page?.updated_at
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
        new Date(page.updated_at),
      )
    : null;

  return (
    <article className="container-page max-w-3xl py-16">
      <h1 className="font-display text-4xl">{title}</h1>
      {updatedAt && (
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {tLegal("lastUpdated", { date: updatedAt })}
        </p>
      )}
      {content ? (
        <div
          className="prose prose-stone mt-8 max-w-none whitespace-pre-line leading-relaxed text-[var(--color-foreground)]/90"
          // The CMS content is sanitized at write-time and stored as plain text
          // with simple newlines — render as text, not HTML.
        >
          {content}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--color-border)] p-8 text-[var(--color-muted)]">
          <p>{tLegal("placeholder")}</p>
        </div>
      )}
    </article>
  );
}

export function generateStaticParams() {
  return ALLOWED_SLUGS.map((slug) => ({ slug }));
}

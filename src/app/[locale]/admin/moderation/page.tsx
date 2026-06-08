import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { ModerationRow, type ReviewView } from "./moderation-row";
import { Inbox, Flag, Ban, CheckCircle2 } from "lucide-react";

const TABS = ["pending", "flagged", "rejected", "approved"] as const;
type Tab = (typeof TABS)[number];

type RawReview = {
  id: string;
  product_id: string;
  user_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  verified_purchase: boolean;
  status: "pending" | "approved" | "rejected";
  flagged_count: number | null;
  flag_reasons: unknown;
  moderator_id: string | null;
  moderated_at: string | null;
  moderation_note: string | null;
  created_at: string;
  products: { slug: string; name_i18n: Record<string, string> } | null;
  author: { full_name: string | null; email: string | null } | null;
  moderator: { email: string | null } | null;
};

type SupabaseQuery = {
  from: (n: string) => {
    select: (q: string) => Record<string, unknown>;
  };
};

async function fetchReviews(tab: Tab, locale: string): Promise<ReviewView[]> {
  try {
    const supabase = await createClient();
    const sb = supabase as unknown as SupabaseQuery;

    type Builder = {
      eq: (k: string, v: string | number | boolean) => Builder;
      gt: (k: string, v: number) => Builder;
      order: (k: string, opts: { ascending: boolean }) => Builder;
      limit: (n: number) => Promise<{ data: RawReview[] | null }>;
    };

    let q = sb
      .from("reviews")
      .select(
        "id, product_id, user_id, rating, title, body, verified_purchase, status, flagged_count, flag_reasons, moderator_id, moderated_at, moderation_note, created_at, products:product_id ( slug, name_i18n ), author:user_id ( full_name, email ), moderator:moderator_id ( email )",
      ) as unknown as Builder;

    if (tab === "pending") q = q.eq("status", "pending");
    else if (tab === "rejected") q = q.eq("status", "rejected");
    else if (tab === "approved") q = q.eq("status", "approved");
    else if (tab === "flagged") q = q.gt("flagged_count", 0);

    const { data } = await q.order("created_at", { ascending: false }).limit(200);
    if (!data) return [];

    return data.map<ReviewView>((r) => {
      const reasons = Array.isArray(r.flag_reasons)
        ? (r.flag_reasons as Array<Record<string, unknown>>).map((f) => ({
            by: typeof f.by === "string" ? f.by : undefined,
            reason: typeof f.reason === "string" ? f.reason : undefined,
            at: typeof f.at === "string" ? f.at : undefined,
          }))
        : [];

      const productName =
        r.products?.name_i18n?.[locale] ??
        r.products?.name_i18n?.fr ??
        r.products?.slug ??
        "—";

      return {
        id: r.id,
        product: r.products ? { slug: r.products.slug, name: productName } : null,
        author: {
          name: r.author?.full_name ?? null,
          email: r.author?.email ?? null,
        },
        rating: r.rating,
        title: r.title,
        body: r.body,
        verified_purchase: r.verified_purchase,
        status: r.status,
        flagged_count: r.flagged_count ?? 0,
        flag_reasons: reasons,
        moderator_email: r.moderator?.email ?? null,
        moderated_at: r.moderated_at,
        moderation_note: r.moderation_note,
        created_at: r.created_at,
      };
    });
  } catch {
    return [];
  }
}

const TAB_ICONS: Record<Tab, typeof Inbox> = {
  pending: Inbox,
  flagged: Flag,
  rejected: Ban,
  approved: CheckCircle2,
};

/** Per-tab counts for the inbox-style badges (lightweight head counts). */
async function fetchCounts(): Promise<Record<Tab, number>> {
  const zero: Record<Tab, number> = { pending: 0, flagged: 0, rejected: 0, approved: 0 };
  try {
    const supabase = await createClient();
    const sb = supabase as unknown as {
      from: (n: string) => {
        select: (q: string, o: { count: "exact"; head: true }) => {
          eq: (k: string, v: string) => Promise<{ count: number | null }>;
          gt: (k: string, v: number) => Promise<{ count: number | null }>;
        };
      };
    };
    const c = () => sb.from("reviews").select("id", { count: "exact", head: true });
    const [pending, flagged, rejected, approved] = await Promise.all([
      c().eq("status", "pending"),
      c().gt("flagged_count", 0),
      c().eq("status", "rejected"),
      c().eq("status", "approved"),
    ]);
    return {
      pending: pending.count ?? 0,
      flagged: flagged.count ?? 0,
      rejected: rejected.count ?? 0,
      approved: approved.count ?? 0,
    };
  } catch {
    return zero;
  }
}

export default async function AdminModerationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("moderation");
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "")
    ? (sp.tab as Tab)
    : "pending";

  const [reviews, counts] = await Promise.all([fetchReviews(tab, locale), fetchCounts()]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">{t("lead")}</p>
      </header>

      <nav
        aria-label="moderation tabs"
        className="mb-6 flex flex-wrap gap-1 border-b border-[var(--color-border)]"
      >
        {TABS.map((it) => {
          const active = it === tab;
          const Icon = TAB_ICONS[it];
          return (
            <Link
              key={it}
              href={{ pathname: "/admin/moderation", query: { tab: it } }}
              className={
                "inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors " +
                (active
                  ? "border-[var(--color-primary-600)] text-[var(--color-primary-700)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground)]")
              }
            >
              <Icon className="h-4 w-4" />
              {t(`tabs.${it}`)}
              {counts[it] > 0 && (
                <span
                  className={
                    "rounded-full px-1.5 text-[11px] tabular-nums " +
                    (active
                      ? "bg-[var(--color-primary-100)] text-[var(--color-primary-700)]"
                      : "bg-[var(--color-bg)] text-[var(--color-muted)]")
                  }
                >
                  {counts[it]}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {reviews.length === 0 ? (
        <Card className="grid place-items-center px-6 py-16 text-center text-[var(--color-muted)]">
          <p className="text-base">{t(`empty.${tab}`)}</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {reviews.map((r) => (
            <ModerationRow key={r.id} review={r} locale={locale} />
          ))}
        </Card>
      )}
    </div>
  );
}

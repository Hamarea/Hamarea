import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Counter = { count: number | null };
type CountQuery = {
  from: (t: string) => {
    select: (q: string, opts: { count: "exact"; head: true }) => {
      eq: (k: string, v: string) => Promise<Counter>;
      gt: (k: string, v: number) => Promise<Counter>;
    };
  };
};

async function getCounters() {
  try {
    const supabase = await createClient();
    const sb = supabase as unknown as CountQuery;
    const [pending, flagged, rejected, approved] = await Promise.all([
      sb.from("reviews").select("*", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("reviews").select("*", { count: "exact", head: true }).gt("flagged_count", 0),
      sb.from("reviews").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      sb.from("reviews").select("*", { count: "exact", head: true }).eq("status", "approved"),
    ]);
    return {
      pending: pending.count ?? 0,
      flagged: flagged.count ?? 0,
      rejected: rejected.count ?? 0,
      approved: approved.count ?? 0,
    };
  } catch {
    return { pending: 0, flagged: 0, rejected: 0, approved: 0 };
  }
}

export default async function AdminReviewsPage() {
  const t = await getTranslations();
  const tm = await getTranslations("moderation");
  const counts = await getCounters();

  const cells: Array<{ key: keyof typeof counts; tab: string }> = [
    { key: "pending", tab: "pending" },
    { key: "flagged", tab: "flagged" },
    { key: "rejected", tab: "rejected" },
    { key: "approved", tab: "approved" },
  ];

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl">{t("admin.reviews")}</h1>

      <Card className="mb-6 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary-600)]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="font-medium">{tm("title")}</p>
            <p className="text-sm text-[var(--color-muted)]">{tm("lead")}</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/admin/moderation">
            {t("admin.moderation")} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cells.map(({ key, tab }) => (
          <Link
            key={key}
            href={{ pathname: "/admin/moderation", query: { tab } }}
            className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-primary-500)]"
          >
            <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
              {tm(`tabs.${tab}` as never)}
            </p>
            <p className="mt-1 font-display text-3xl">{counts[key]}</p>
            <p className="mt-2 text-xs text-[var(--color-primary-600)] opacity-0 transition-opacity group-hover:opacity-100">
              →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

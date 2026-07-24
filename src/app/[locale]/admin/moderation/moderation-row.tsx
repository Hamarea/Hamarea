"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, X, RotateCcw, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { moderateReview } from "./actions";

type FlagReason = { by?: string; reason?: string; at?: string };

export type ReviewView = {
  id: string;
  product: { slug: string; name: string } | null;
  author: { name: string | null; email: string | null };
  rating: number;
  title: string | null;
  body: string | null;
  verified_purchase: boolean;
  status: "pending" | "approved" | "rejected";
  flagged_count: number;
  flag_reasons: FlagReason[];
  moderator_email: string | null;
  moderated_at: string | null;
  moderation_note: string | null;
  created_at: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span
      aria-label={`${rating}/5`}
      className="inline-flex font-mono text-base tracking-[0.18em] text-[var(--color-warning)]"
    >
      {"★".repeat(rating)}
      <span className="text-[var(--color-border)]">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function ModerationRow({ review, locale }: { review: ReviewView; locale: string }) {
  const t = useTranslations("moderation");
  const [pending, startTransition] = useTransition();
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(review.moderation_note ?? "");
  const [error, setError] = useState<string | null>(null);

  const dispatch = (status: "approved" | "rejected" | "pending") => {
    // Confirmation avant une action conséquente (approuver / rejeter).
    if (status === "approved" || status === "rejected") {
      const label = status === "approved" ? t("actions.approve") : t("actions.reject");
      if (typeof window !== "undefined" && !window.confirm(`${label} ?`)) return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await moderateReview({ id: review.id, status, note: note || null });
        toast.success(
          status === "approved"
            ? "Avis approuvé."
            : status === "rejected"
              ? "Avis rejeté."
              : "Avis rouvert.",
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "generic";
        setError(msg === "forbidden" ? t("errors.forbidden") : t("errors.generic"));
      }
    });
  };

  const dateFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <article className="border-b border-[var(--color-border)] p-5 last:border-b-0">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Stars rating={review.rating} />
            {review.verified_purchase && (
              <Badge variant="success">{t("verified")}</Badge>
            )}
            {review.status === "approved" && <Badge variant="success">approved</Badge>}
            {review.status === "rejected" && <Badge variant="danger">rejected</Badge>}
            {review.status === "pending" && <Badge variant="warning">pending</Badge>}
            {review.flagged_count > 0 && (
              <Badge variant="danger">⚑ {review.flagged_count}</Badge>
            )}
          </div>

          {review.title && (
            <h3 className="mt-2 font-display text-lg leading-snug">{review.title}</h3>
          )}
          {review.body && (
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[var(--color-foreground)]/85">
              {review.body}
            </p>
          )}

          <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[var(--color-muted)]">
            <div>
              <dt className="sr-only">{t("column.author")}</dt>
              <dd>
                {review.author.name ?? review.author.email ?? t("anonymous")}
              </dd>
            </div>
            <div>
              <dt className="sr-only">{t("column.product")}</dt>
              <dd>
                {review.product ? (
                  <Link
                    href="/sacoche"
                    className="underline-offset-2 hover:underline"
                  >
                    {review.product.name}
                  </Link>
                ) : (
                  <span className="italic">— produit supprimé —</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="sr-only">{t("column.date")}</dt>
              <dd>{dateFmt.format(new Date(review.created_at))}</dd>
            </div>
            {review.moderated_at && (
              <div>
                <dt className="sr-only">{t("column.moderator")}</dt>
                <dd>
                  ✓ {review.moderator_email ?? "—"} · {dateFmt.format(new Date(review.moderated_at))}
                </dd>
              </div>
            )}
          </dl>

          {review.flag_reasons.length > 0 && (
            <details className="mt-3 rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-3 text-xs">
              <summary className="cursor-pointer font-medium text-[var(--color-danger)]">
                ⚑ {review.flagged_count} {t("column.flags")}
              </summary>
              <ul className="mt-2 space-y-1 text-[var(--color-foreground)]/80">
                {review.flag_reasons.map((f, i) => (
                  <li key={i}>
                    <span className="font-medium">
                      {t("flagBy")} {f.by ? f.by.slice(0, 8) : "?"}
                    </span>
                    {" — "}
                    <span className="italic">{f.reason ?? "—"}</span>
                    {f.at && (
                      <span className="ml-2 text-[var(--color-muted)]">
                        ({dateFmt.format(new Date(f.at))})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {review.moderation_note && !showNote && (
            <p className="mt-3 rounded-md bg-[var(--color-bg)] p-2 text-xs text-[var(--color-muted)]">
              <span className="font-medium">{t("note.label")} :</span>{" "}
              {review.moderation_note}
            </p>
          )}

          {showNote && (
            <div className="mt-3">
              <label className="text-xs font-medium text-[var(--color-muted)]">
                {t("note.label")}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("note.placeholder")}
                rows={2}
                maxLength={2000}
                className="mt-1 w-full resize-y rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-200)]"
              />
            </div>
          )}

          {error && (
            <p className="mt-2 text-xs font-medium text-[var(--color-danger)]">{error}</p>
          )}
        </div>

        <div className="flex flex-row flex-wrap items-start gap-2 md:flex-col md:items-end">
          {review.status !== "approved" && (
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => dispatch("approved")}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t("actions.approve")}
            </Button>
          )}
          {review.status !== "rejected" && (
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => dispatch("rejected")}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              {t("actions.reject")}
            </Button>
          )}
          {review.status !== "pending" && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => dispatch("pending")}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {t("actions.reopen")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNote((v) => !v)}
            aria-pressed={showNote}
          >
            <MessageSquare className="h-4 w-4" />
            {t("note.label")}
          </Button>
        </div>
      </div>
    </article>
  );
}

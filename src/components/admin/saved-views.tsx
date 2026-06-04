"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { Bookmark, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type View = { name: string; q: string; status: string };
const KEY = "hamarea.admin.productViews";

/**
 * Saved views for the product list — named search+status filters persisted to
 * localStorage (no backend). A 2026 data-table staple for catalog management.
 * Current filter state comes from the server (props) to avoid useSearchParams.
 */
export function SavedViews({
  currentQ,
  currentStatus,
}: {
  currentQ: string;
  currentStatus: string;
}) {
  const [views, setViews] = useState<View[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setViews(JSON.parse(raw) as View[]);
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  const persist = (next: View[]) => {
    setViews(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full / unavailable — keep in-memory */
    }
  };

  const hrefFor = (v: { q: string; status: string }) => {
    const p = new URLSearchParams();
    if (v.q) p.set("q", v.q);
    if (v.status) p.set("status", v.status);
    const s = p.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };

  const saveCurrent = () => {
    const suggested = currentStatus || currentQ || "Vue";
    const name = window.prompt("Nom de la vue :", suggested);
    if (!name?.trim()) return;
    const v: View = { name: name.trim(), q: currentQ, status: currentStatus };
    persist([...views.filter((x) => x.name !== v.name), v]);
  };

  const remove = (name: string) => persist(views.filter((x) => x.name !== name));
  const isActive = (v: View) => v.q === currentQ && v.status === currentStatus;

  if (!ready) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-muted)]">
        <Bookmark className="h-3.5 w-3.5" /> Vues :
      </span>
      {views.length === 0 && (
        <span className="text-xs text-[var(--color-muted)]">aucune enregistrée</span>
      )}
      {views.map((v) => (
        <span
          key={v.name}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
            isActive(v)
              ? "border-[var(--color-primary-400)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
              : "border-[var(--color-border)]",
          )}
        >
          <Link href={hrefFor(v) as never} className="font-medium hover:underline">
            {v.name}
          </Link>
          <button
            type="button"
            onClick={() => remove(v.name)}
            aria-label={`Supprimer la vue ${v.name}`}
            className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={saveCurrent}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-muted)] transition-colors hover:bg-[var(--color-bg)]"
      >
        <Plus className="h-3 w-3" /> Enregistrer la vue actuelle
      </button>
    </div>
  );
}

"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { label: string; href: string };

/**
 * Admin command palette (⌘K / Ctrl+K) — jump between sections & quick actions.
 * A 2026 admin-UX staple for power users. Pure client; no backend.
 */
export function CommandPalette({ items }: { items: Item[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((it) => it.label.toLowerCase().includes(s)) : items;
  }, [q, items]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href as never);
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = filtered[active];
      if (it) go(it.href);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-bg)]"
      >
        <Search className="h-4 w-4" /> Rechercher
        <kbd className="ml-1 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Palette de commandes"
            className="w-full max-w-lg overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3">
              <Search className="h-4 w-4 text-[var(--color-muted)]" aria-hidden />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                placeholder="Aller à… (produits, commandes, réglages…)"
                aria-label="Rechercher une commande ou une page"
                className="h-12 w-full bg-transparent text-sm outline-none"
              />
              <kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)]">
                Esc
              </kbd>
            </div>
            <ul role="listbox" className="max-h-80 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-[var(--color-muted)]">
                  Aucun résultat.
                </li>
              ) : (
                filtered.map((it, i) => (
                  <li key={it.href + it.label} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(it.href)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm",
                        i === active
                          ? "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                          : "hover:bg-[var(--color-bg)]",
                      )}
                    >
                      {it.label}
                      {i === active && <span className="text-xs text-[var(--color-muted)]">↵</span>}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

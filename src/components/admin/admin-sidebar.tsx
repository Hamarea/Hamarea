"use client";

import { useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/account/logout-button";

/** Admin sidebar — static column on desktop, collapsible drawer on mobile. */
export function AdminSidebar({
  items,
  userEmail,
  supabaseConfigured,
}: {
  items: { href: string; label: string; icon: ReactNode }[];
  userEmail: string;
  supabaseConfigured: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <aside className="border-b border-white/10 bg-[var(--color-primary-700)] text-[var(--color-primary-50)] md:border-b-0 md:border-r md:border-[var(--color-border)] md:p-4">
      <div className="flex items-center justify-between p-4 md:mb-6 md:p-0">
        <span className="font-display text-2xl text-white">Hamarea</span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Navigation admin"
          aria-expanded={open}
          className="text-white md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <div className={cn("px-4 pb-4 md:p-0", open ? "block" : "hidden md:block")}>
        {!supabaseConfigured && (
          <p className="mb-4 rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/15 px-2 py-1.5 text-[10px] uppercase tracking-wider text-[var(--color-warning)]">
            Mode aperçu — Supabase non configuré
          </p>
        )}
        <nav className="space-y-1">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href as never}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-white/10"
            >
              {it.icon}
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t border-white/10 pt-4">
          <p className="truncate text-xs opacity-70">{userEmail}</p>
          {supabaseConfigured && (
            <div className="mt-2">
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

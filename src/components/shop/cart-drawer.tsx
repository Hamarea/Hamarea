"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { X, Minus, Plus, ShoppingBag, ShieldCheck, Truck, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useCart } from "@/stores/cart";
import { useCartUI } from "@/stores/cart-ui";
import { formatMoney } from "@/lib/utils";
import { SHIPPING } from "@/lib/product";

/**
 * Slide-in mini-cart. Mounted once in the locale layout; opens on add-to-cart
 * so the buying momentum isn't broken by a full page navigation to /cart.
 */
export function CartDrawer() {
  const open = useCartUI((s) => s.open);
  const close = useCartUI((s) => s.closeDrawer);
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotalCents());
  const count = useCart((s) => s.count());

  const panelRef = useRef<HTMLElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Remember the trigger so focus can return to it on close.
    restoreRef.current = document.activeElement as HTMLElement | null;
    // Move focus into the dialog.
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      if (!root) return;
      const nodes = root.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      restoreRef.current?.focus?.();
    };
  }, [open, close]);

  const toFree = Math.max(0, SHIPPING.freeAboveCents - subtotal);
  const pct = Math.min(
    100,
    Math.round((subtotal / SHIPPING.freeAboveCents) * 100),
  );

  return (
    <>
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Votre panier"
        className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-[var(--color-surface)] shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <p className="font-display text-lg">Votre panier ({count})</p>
          <button
            ref={closeBtnRef}
            onClick={close}
            aria-label="Fermer le panier"
            className="grid h-11 w-11 place-items-center rounded-full hover:bg-[var(--color-bg)]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag className="h-10 w-10 text-[var(--color-muted)]" />
            <p className="text-[var(--color-muted)]">Votre panier est vide.</p>
            <Button onClick={close}>Continuer mes achats</Button>
          </div>
        ) : (
          <>
            <div className="border-b border-[var(--color-border)] px-5 py-3">
              {toFree > 0 ? (
                <p className="text-xs text-[var(--color-muted)]">
                  Plus que{" "}
                  <strong className="text-[var(--color-foreground)]">
                    {formatMoney(toFree)}
                  </strong>{" "}
                  pour la livraison offerte
                </p>
              ) : (
                <p className="text-xs font-medium text-[var(--color-secondary-600)]">
                  🎉 Livraison offerte débloquée
                </p>
              )}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--color-secondary-400)] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {lines.map((l) => (
                <li key={l.variantId} className="flex gap-3">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-[var(--color-bg)]">
                    {l.image && (
                      <Image
                        src={l.image}
                        alt={l.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {formatMoney(l.unitPriceCents, l.currency)}
                    </p>
                    <div className="mt-2 inline-flex items-center rounded-md border border-[var(--color-border)]">
                      <button
                        className="grid h-11 w-11 place-items-center"
                        onClick={() => setQty(l.variantId, l.quantity - 1)}
                        aria-label="Diminuer la quantité"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm tabular-nums">
                        {l.quantity}
                      </span>
                      <button
                        className="grid h-11 w-11 place-items-center"
                        onClick={() => setQty(l.variantId, l.quantity + 1)}
                        aria-label="Augmenter la quantité"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => remove(l.variantId)}
                    className="self-start text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>

            <footer className="border-t border-[var(--color-border)] p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted)]">Sous-total</span>
                <span className="font-display text-lg font-bold tabular-nums">
                  {formatMoney(subtotal)}
                </span>
              </div>
              <Button asChild size="lg" className="mt-4 w-full">
                <Link href="/checkout" onClick={close}>
                  Commander
                </Link>
              </Button>
              <button
                onClick={close}
                className="mt-2 w-full text-center text-xs text-[var(--color-muted)] hover:underline"
              >
                Continuer mes achats
              </button>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-[var(--color-muted)]">
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Paiement sécurisé
                </span>
                <span className="inline-flex items-center gap-1">
                  <Truck className="h-3 w-3" /> Port offert dès 39€
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Garantie 2 ans
                </span>
              </div>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

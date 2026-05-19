import { Truck, ShieldCheck, RotateCcw, Lock } from "lucide-react";

const ITEMS = [
  { icon: Truck, title: "Livraison 48h", subtitle: "Offerte dès 79€" },
  { icon: ShieldCheck, title: "Garantie 2 ans", subtitle: "Contre tout défaut" },
  { icon: RotateCcw, title: "Retour 30j", subtitle: "Gratuit, sans condition" },
  { icon: Lock, title: "Paiement sécurisé", subtitle: "CB · Apple Pay · PayPal" },
];

export function TrustBar() {
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="container-page grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.title} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white ring-1 ring-[var(--color-border)] text-[var(--color-primary-600)]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{it.title}</p>
                <p className="text-xs text-[var(--color-muted)]">{it.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

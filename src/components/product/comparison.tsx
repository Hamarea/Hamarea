import { Check, X } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

const ROWS = [
  { feature: "Étanchéité testée IPX8 (30 m)", us: true, them: false },
  { feature: "Écran tactile fonctionnel sous l'eau", us: true, them: false },
  { feature: "Flotte automatiquement", us: true, them: false },
  { feature: "Tour de cou ajustable inclus", us: true, them: false },
  { feature: "Compatible smartphones jusqu'à 7\"", us: true, them: true },
  { feature: "Garantie 2 ans", us: true, them: false },
  { feature: "Retour gratuit 30 jours", us: true, them: false },
  { feature: "Livraison France 48h", us: true, them: false },
];

export function Comparison() {
  return (
    <section className="container-page py-16 md:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-primary-600)]">
          Comparatif
        </p>
        <h2 className="mt-2 font-display text-3xl md:text-4xl">
          Hamarea vs sacoche classique.
        </h2>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Pourquoi payer 60€ ailleurs pour avoir moins ?
        </p>
      </Reveal>
      <Reveal
        delay={0.1}
        className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white"
      >
        {/* Scroll horizontally under ~360px rather than cramming the columns. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-xs sm:text-sm">
            <caption className="sr-only">
              Comparatif Hamarea contre une sacoche étanche classique
            </caption>
            <thead className="bg-[var(--color-bg)] text-left">
              <tr>
                <th scope="col" className="px-3 py-3 sm:px-5 sm:py-4 font-semibold">
                  Critère
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 sm:px-5 sm:py-4 text-center font-display text-base font-semibold text-[var(--color-primary-700)]"
                >
                  Hamarea
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 sm:px-5 sm:py-4 text-center font-semibold text-[var(--color-muted)]"
                >
                  Sacoche classique
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr
                  key={r.feature}
                  className={i % 2 === 0 ? "bg-white" : "bg-[var(--color-bg)]/50"}
                >
                  <td className="px-3 py-2.5 sm:px-5 sm:py-3">{r.feature}</td>
                  <td className="px-3 py-2.5 sm:px-5 sm:py-3 text-center">
                    {r.us ? (
                      <>
                        <Check
                          aria-hidden
                          className="mx-auto h-5 w-5 text-[var(--color-success,#16a34a)]"
                        />
                        <span className="sr-only">Oui</span>
                      </>
                    ) : (
                      <>
                        <X
                          aria-hidden
                          className="mx-auto h-5 w-5 text-[var(--color-muted)]"
                        />
                        <span className="sr-only">Non</span>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2.5 sm:px-5 sm:py-3 text-center">
                    {r.them ? (
                      <>
                        <Check
                          aria-hidden
                          className="mx-auto h-5 w-5 text-[var(--color-success,#16a34a)]"
                        />
                        <span className="sr-only">Oui</span>
                      </>
                    ) : (
                      <>
                        <X
                          aria-hidden
                          className="mx-auto h-5 w-5 text-[var(--color-danger,#dc2626)]/70"
                        />
                        <span className="sr-only">Non</span>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </section>
  );
}

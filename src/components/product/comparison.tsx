import { Check, X } from "lucide-react";
import { getLocale } from "next-intl/server";
import { getProductCopy } from "@/lib/product-content";
import { Reveal } from "@/components/ui/reveal";

export async function Comparison() {
  const c = getProductCopy(await getLocale()).comparison;
  return (
    <section className="container-page py-16 md:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-primary-600)]">
          {c.eyebrow}
        </p>
        <h2 className="mt-2 font-display text-3xl md:text-4xl">{c.heading}</h2>
        <p className="mt-3 text-sm text-[var(--color-muted)]">{c.sub}</p>
      </Reveal>
      <Reveal
        delay={0.1}
        className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white"
      >
        {/* Scroll horizontally under ~360px rather than cramming the columns. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-xs sm:text-sm">
            <caption className="sr-only">{c.caption}</caption>
            <thead className="bg-[var(--color-bg)] text-left">
              <tr>
                <th scope="col" className="px-3 py-3 sm:px-5 sm:py-4 font-semibold">
                  {c.criterion}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 sm:px-5 sm:py-4 text-center font-display text-base font-semibold text-[var(--color-primary-700)]"
                >
                  {c.us}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 sm:px-5 sm:py-4 text-center font-semibold text-[var(--color-muted)]"
                >
                  {c.them}
                </th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r, i) => (
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
                        <span className="sr-only">{c.yes}</span>
                      </>
                    ) : (
                      <>
                        <X
                          aria-hidden
                          className="mx-auto h-5 w-5 text-[var(--color-muted)]"
                        />
                        <span className="sr-only">{c.no}</span>
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
                        <span className="sr-only">{c.yes}</span>
                      </>
                    ) : (
                      <>
                        <X
                          aria-hidden
                          className="mx-auto h-5 w-5 text-[var(--color-danger,#dc2626)]/70"
                        />
                        <span className="sr-only">{c.no}</span>
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

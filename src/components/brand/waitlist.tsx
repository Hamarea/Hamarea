"use client";

import { useLocale } from "next-intl";
import { Mail, Send } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Link } from "@/i18n/navigation";
import { getBrandCopy } from "@/lib/brand-content";
import { joinWaitlist } from "@/lib/actions/waitlist";
import { Reveal } from "@/components/ui/reveal";

/** Brand waitlist capture (RGPD): one email field + opt-in consent + interests. */
export function Waitlist() {
  const locale = useLocale();
  const c = getBrandCopy(locale).waitlist;

  return (
    <section
      id="waitlist"
      className="relative overflow-hidden bg-[var(--color-primary-900)] py-20 text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[var(--color-primary-500)]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[var(--color-secondary-500)]/20 blur-3xl"
      />
      <div className="container-page relative grid items-center gap-10 md:grid-cols-2">
        <Reveal>
          <span className="brand-eyebrow text-[var(--color-primary-200)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-secondary-400)]" />
            {c.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-3xl md:text-5xl">{c.heading}</h2>
          <p className="mt-4 max-w-md text-white/80">{c.sub}</p>
        </Reveal>

        <Reveal delay={0.1}>
          <ActionForm
            action={joinWaitlist}
            successMessage={c.success}
            resetOnSuccess
            className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-md md:p-6"
          >
            <input type="hidden" name="locale" value={locale} />

            <label htmlFor="wl-email" className="text-sm font-medium">
              {c.emailLabel}
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-white px-3 text-[var(--color-foreground)] focus-within:ring-2 focus-within:ring-[var(--color-primary-400)]">
              <Mail className="h-4 w-4 shrink-0 text-[var(--color-muted)]" aria-hidden />
              <input
                id="wl-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={c.emailPlaceholder}
                className="h-12 w-full bg-transparent text-sm outline-none"
              />
            </div>

            <fieldset className="mt-4">
              <legend className="text-xs font-medium uppercase tracking-wider text-white/70">
                {c.productLabel}
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {c.products.map((p) => (
                  <label
                    key={p.key}
                    className="cursor-pointer rounded-full px-3 py-2 text-sm ring-1 ring-white/25 transition-colors has-[:checked]:bg-[var(--color-primary-400)] has-[:checked]:text-[var(--color-primary-900)] has-[:checked]:ring-[var(--color-primary-400)] hover:ring-white/60"
                  >
                    <input
                      type="checkbox"
                      name="interests"
                      value={p.key}
                      className="sr-only"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-4 flex items-start gap-2.5 text-xs text-white/80">
              <input
                type="checkbox"
                name="consent"
                required
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-white/40 accent-[var(--color-secondary-500)]"
              />
              <span>
                {c.consentLabel}{" "}
                <Link href="/legal/privacy" className="underline hover:text-white">
                  {c.privacyLink}
                </Link>
              </span>
            </label>

            <SubmitButton size="lg" variant="secondary" className="mt-4 w-full">
              <Send className="h-4 w-4" />
              {c.submit}
            </SubmitButton>
          </ActionForm>
        </Reveal>
      </div>
    </section>
  );
}

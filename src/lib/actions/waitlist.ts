"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getBrandCopy, type ProductKey } from "@/lib/brand-content";
import { routing } from "@/i18n/routing";
import type { FormState } from "@/lib/form-state";
import type { Database } from "@/lib/supabase/types";

type NewsletterInsert = Database["public"]["Tables"]["newsletter_subscribers"]["Insert"];

/**
 * Minimal insert surface. The fully-typed `.insert()` overload resolves to
 * `never[]` for a few tables in this project's generated types (see
 * `lib/audit.ts` for the same escape hatch) — the payload stays typed via
 * `NewsletterInsert`.
 */
type InsertClient = {
  from: (t: string) => {
    insert: (row: NewsletterInsert) => Promise<{ error: { code?: string } | null }>;
  };
};

const VALID_INTERESTS: ProductKey[] = ["sacoche", "lycra", "capuche", "cup", "accessoires"];
const emailSchema = z.string().email().max(254);

/**
 * Join the brand waitlist (RGPD-compliant).
 * - Single email field; explicit (unchecked-by-default) consent checkbox.
 * - Logs locale + interests + source='waitlist' + consent_at (set DB-side).
 * - Stores nothing on invalid input; treats a duplicate email as success.
 *
 * Double opt-in (confirmation email) is a P1 follow-up — `confirmed_at` stays
 * null until then. In preview mode (no Supabase env) the stubbed client makes
 * this a no-op that still returns success.
 */
export async function joinWaitlist(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const rawLocale = String(formData.get("locale") ?? routing.defaultLocale);
  const locale = (routing.locales as readonly string[]).includes(rawLocale)
    ? rawLocale
    : routing.defaultLocale;
  const copy = getBrandCopy(locale).waitlist;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const consent = formData.get("consent");
  const interests = formData
    .getAll("interests")
    .map(String)
    .filter((i): i is ProductKey => (VALID_INTERESTS as string[]).includes(i));

  if (!emailSchema.safeParse(email).success) return { error: copy.errorEmail };
  if (consent !== "on") return { error: copy.errorConsent };

  try {
    const supabase = (await createClient()) as unknown as InsertClient;
    const payload: NewsletterInsert = {
      email,
      locale,
      source: "waitlist",
      interests,
    };
    const { error } = await supabase.from("newsletter_subscribers").insert(payload);
    // 23505 = unique_violation → e-mail already on the list: treat as success.
    if (error && error.code !== "23505") {
      return { error: copy.errorGeneric };
    }
    return { ok: true };
  } catch {
    return { error: copy.errorGeneric };
  }
}

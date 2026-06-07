/**
 * Best-effort automatic translation for product content (names, descriptions).
 *
 * Goal: the admin types ONE name (French) and the other locales fill themselves
 * — no manual "Name (EN)" field ever.
 *
 * - If `DEEPL_API_KEY` is set → real translation via DeepL (free or pro key).
 * - Otherwise → the source text is copied to every target locale, so a product
 *   is never missing a name in a language and the UI stays clean. Add the key
 *   later and new products translate for real, with zero code change.
 *
 * DeepL free keys end with `:fx` and use the api-free host.
 */
const DEEPL_LANG: Record<string, string> = {
  fr: "FR",
  en: "EN-GB",
  es: "ES",
  de: "DE",
};

export async function autoTranslate(
  text: string,
  from: string,
  targets: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const clean = (text ?? "").trim();
  if (!clean) return out;

  // Sensible fallback first: every target gets the source text.
  for (const to of targets) out[to] = clean;

  const key = process.env.DEEPL_API_KEY;
  if (!key) return out;

  const endpoint = key.trim().endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  await Promise.all(
    targets
      .filter((to) => to !== from)
      .map(async (to) => {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `DeepL-Auth-Key ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: [clean],
              source_lang: DEEPL_LANG[from]?.split("-")[0] ?? from.toUpperCase(),
              target_lang: DEEPL_LANG[to] ?? to.toUpperCase(),
            }),
            // Never let a slow translation block product creation for long.
            signal: AbortSignal.timeout(6000),
          });
          if (!res.ok) return;
          const json = (await res.json()) as {
            translations?: { text?: string }[];
          };
          const translated = json.translations?.[0]?.text?.trim();
          if (translated) out[to] = translated;
        } catch {
          // Keep the fallback (source text) on any error / timeout.
        }
      }),
  );

  return out;
}

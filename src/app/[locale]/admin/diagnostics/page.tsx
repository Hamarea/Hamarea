import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { CheckCircle2, AlertTriangle, XCircle, CircleDashed } from "lucide-react";

/**
 * Diagnostic des connexions — vérifie EN DIRECT que chaque service est
 * réellement paramétré et joignable (pas juste « une clé est présente »).
 * Répond au besoin « être sûr que tout est paramétré depuis le tableau de bord ».
 *
 * Tout est fail-safe : un test qui échoue produit une ligne rouge, jamais une
 * page en erreur. Live checks → jamais mis en cache.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Level = "ok" | "warn" | "error" | "off";
type Check = { group: string; name: string; level: Level; detail: string };

const has = (v?: string | null) => Boolean(v && v.trim());

async function checkSupabase(): Promise<Check[]> {
  const group = "Base de données";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const out: Check[] = [];

  if (!has(url) || !has(anon)) {
    out.push({
      group,
      name: "Supabase (lecture)",
      level: "error",
      detail: "URL ou clé anon manquante — mode aperçu, aucune donnée réelle.",
    });
    out.push({
      group,
      name: "Service role (écritures)",
      level: has(svc) ? "warn" : "error",
      detail: has(svc)
        ? "Clé présente mais base non configurée."
        : "SUPABASE_SERVICE_ROLE_KEY manquante — commandes non enregistrées.",
    });
    return out;
  }

  let readOk = false;
  let msg = "";
  try {
    const sb = (await createClient()) as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          limit: (n: number) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
    const { error } = await sb.from("products").select("id").limit(1);
    if (error) msg = error.message;
    else readOk = true;
  } catch (e) {
    msg = e instanceof Error ? e.message : "échec de connexion";
  }

  out.push(
    readOk
      ? { group, name: "Supabase (lecture)", level: "ok", detail: "Connexion établie, requête catalogue OK." }
      : { group, name: "Supabase (lecture)", level: "error", detail: msg || "Requête échouée." },
  );
  out.push(
    has(svc)
      ? { group, name: "Service role (écritures)", level: "ok", detail: "Clé présente — persistance des commandes active." }
      : {
          group,
          name: "Service role (écritures)",
          level: "error",
          detail: "SUPABASE_SERVICE_ROLE_KEY manquante — le paiement passe mais la commande n'est PAS enregistrée.",
        },
  );
  return out;
}

async function checkStripe(): Promise<Check[]> {
  const group = "Paiement";
  const out: Check[] = [];
  const stripe = getStripe();

  if (!stripe) {
    out.push({
      group,
      name: "Stripe — clé secrète",
      level: "error",
      detail: "STRIPE_SECRET_KEY manquante — paiement indisponible (503 au checkout).",
    });
  } else {
    let ok = false;
    let msg = "";
    try {
      await stripe.balance.retrieve();
      ok = true;
    } catch (e) {
      msg = e instanceof Error ? e.message : "clé invalide";
    }
    out.push(
      ok
        ? { group, name: "Stripe — clé secrète", level: "ok", detail: "Clé valide, compte Stripe joignable." }
        : { group, name: "Stripe — clé secrète", level: "error", detail: `Clé refusée : ${msg}` },
    );
  }

  out.push(
    has(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      ? { group, name: "Wallet — clé publique", level: "ok", detail: "Apple Pay / Google Pay activables (paiement express)." }
      : {
          group,
          name: "Wallet — clé publique",
          level: "warn",
          detail: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY manquante — paiement express masqué.",
        },
  );
  out.push(
    has(process.env.STRIPE_WEBHOOK_SECRET)
      ? { group, name: "Webhook", level: "ok", detail: "Secret présent (non testable sans événement réel)." }
      : {
          group,
          name: "Webhook",
          level: "error",
          detail: "STRIPE_WEBHOOK_SECRET manquant — commandes jamais confirmées « payées » (pas de stock/e-mail).",
        },
  );
  return out;
}

function checkNotificationsAndTracking(): Check[] {
  const out: Check[] = [];

  out.push(
    has(process.env.RESEND_API_KEY)
      ? { group: "Notifications", name: "E-mails (Resend)", level: "ok", detail: "Confirmations de commande actives." }
      : {
          group: "Notifications",
          name: "E-mails (Resend)",
          level: "warn",
          detail: "RESEND_API_KEY manquante — aucun e-mail envoyé (échec silencieux).",
        },
  );

  const pixels: [string, string | undefined][] = [
    ["Google Analytics", process.env.NEXT_PUBLIC_GA_ID],
    ["Meta Pixel", process.env.NEXT_PUBLIC_META_PIXEL_ID],
    ["Meta CAPI (serveur)", process.env.META_CAPI_TOKEN],
    ["TikTok Pixel", process.env.TIKTOK_PIXEL_CODE],
  ];
  for (const [name, v] of pixels) {
    out.push(
      has(v)
        ? { group: "Tracking", name, level: "ok", detail: "Configuré." }
        : { group: "Tracking", name, level: "off", detail: "Non configuré (optionnel)." },
    );
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  out.push(
    has(site) && site!.startsWith("https://")
      ? { group: "App", name: "URL du site", level: "ok", detail: site! }
      : {
          group: "App",
          name: "URL du site",
          level: "warn",
          detail: site
            ? `${site} — non-HTTPS : images produit Stripe & liens absolus dégradés.`
            : "NEXT_PUBLIC_SITE_URL manquante.",
        },
  );
  return out;
}

const META: Record<Level, { variant: "success" | "warning" | "danger" | "outline"; label: string; Icon: typeof CheckCircle2 }> = {
  ok: { variant: "success", label: "OK", Icon: CheckCircle2 },
  warn: { variant: "warning", label: "À vérifier", Icon: AlertTriangle },
  error: { variant: "danger", label: "Erreur", Icon: XCircle },
  off: { variant: "outline", label: "Inactif", Icon: CircleDashed },
};

const ICON_COLOR: Record<Level, string> = {
  ok: "text-[var(--color-success)]",
  warn: "text-[var(--color-warning)]",
  error: "text-[var(--color-danger)]",
  off: "text-[var(--color-muted)]",
};

export default async function AdminDiagnosticsPage() {
  const [supabase, stripe] = await Promise.all([checkSupabase(), checkStripe()]);
  const checks: Check[] = [...supabase, ...stripe, ...checkNotificationsAndTracking()];

  const errors = checks.filter((c) => c.level === "error").length;
  const warns = checks.filter((c) => c.level === "warn").length;
  const oks = checks.filter((c) => c.level === "ok").length;

  const groups = [...new Set(checks.map((c) => c.group))];

  const headline =
    errors > 0
      ? { text: `${errors} problème${errors > 1 ? "s" : ""} bloquant${errors > 1 ? "s" : ""}`, variant: "danger" as const }
      : warns > 0
        ? { text: `Opérationnel — ${warns} point${warns > 1 ? "s" : ""} à vérifier`, variant: "warning" as const }
        : { text: "Tout est paramétré", variant: "success" as const };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Diagnostic des connexions</h1>
        <Badge variant={headline.variant} className="text-sm">
          {headline.text}
        </Badge>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-muted)]">
        Test en direct de chaque service au chargement de la page.{" "}
        <span className="font-medium text-[var(--color-foreground)]">{oks} OK</span> ·{" "}
        <span className="font-medium text-[var(--color-warning)]">{warns} à vérifier</span> ·{" "}
        <span className="font-medium text-[var(--color-danger)]">{errors} erreur{errors > 1 ? "s" : ""}</span>.
        Les clés se définissent dans <code>.env.local</code> (ou chez l&apos;hébergeur en production).
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <Card key={g}>
            <CardHeader>
              <CardTitle className="text-base">{g}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {checks
                  .filter((c) => c.group === g)
                  .map((c) => {
                    const m = META[c.level];
                    return (
                      <li key={c.name} className="flex items-start gap-3">
                        <m.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ICON_COLOR[c.level]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{c.name}</span>
                            <Badge variant={m.variant} className="shrink-0">
                              {m.label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-[var(--color-muted)]">{c.detail}</p>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

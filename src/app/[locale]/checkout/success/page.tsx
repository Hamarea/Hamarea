import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, Mail, Package, Truck } from "lucide-react";
import { ClearCart } from "./clear-cart";

const STEPS = [
  { icon: Mail, title: "Confirmation", body: "Un e-mail récapitulatif arrive dans votre boîte." },
  { icon: Package, title: "Préparation", body: "Votre commande est préparée avec soin." },
  { icon: Truck, title: "Expédition", body: "Vous recevez un lien de suivi dès l'envoi." },
];

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  return (
    <section className="container-page max-w-2xl py-16">
      <ClearCart />
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-[var(--color-success,#16a34a)]" />
        <h1 className="mt-4 mb-2 font-display text-3xl">Merci pour votre commande ! 🎉</h1>
        <p className="text-[var(--color-muted)]">
          Votre paiement a été confirmé. Un e-mail récapitulatif vous a été envoyé.
        </p>

        <ol className="mt-8 grid gap-4 text-left sm:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li
                key={s.title}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[var(--color-primary-600)] ring-1 ring-[var(--color-border)]">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-2 text-sm font-semibold">
                  {i + 1}. {s.title}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{s.body}</p>
              </li>
            );
          })}
        </ol>

        {session_id && (
          <p className="mt-6 font-mono text-xs text-[var(--color-muted)]">
            Réf. : {session_id}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/account/orders">Voir mes commandes</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          Une question ? Notre équipe répond sous 24 h ·{" "}
          <Link href="/contact" className="underline">
            Nous contacter
          </Link>
        </p>
      </Card>
    </section>
  );
}

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { CheckCircle2 } from "lucide-react";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  return (
    <section className="container-page max-w-2xl py-16">
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--color-success,#16a34a)]" />
        <h1 className="font-display text-3xl mt-4 mb-2">Merci pour votre commande !</h1>
        <p className="text-[var(--color-muted)]">
          Votre paiement a été confirmé. Un e-mail récapitulatif vous a été envoyé.
        </p>
        {session_id && (
          <p className="mt-4 font-mono text-xs text-[var(--color-muted)]">
            Réf. session : {session_id}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link href="/products">Continuer les achats</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/account/orders">Voir mes commandes</Link>
          </Button>
        </div>
      </Card>
    </section>
  );
}

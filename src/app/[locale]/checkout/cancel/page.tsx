import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { XCircle } from "lucide-react";

export default function CheckoutCancelPage() {
  return (
    <section className="container-page max-w-2xl py-16">
      <Card className="p-8 text-center">
        <XCircle className="mx-auto h-12 w-12 text-[var(--color-muted)]" />
        <h1 className="font-display text-3xl mt-4 mb-2">Paiement annulé</h1>
        <p className="text-[var(--color-muted)]">
          Votre panier est conservé. Vous pouvez réessayer quand vous voulez.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link href="/checkout">Reprendre le paiement</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/cart">Voir mon panier</Link>
          </Button>
        </div>
      </Card>
    </section>
  );
}

import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";

export default async function CheckoutPage() {
  const t = await getTranslations();
  return (
    <section className="container-page max-w-3xl py-16">
      <h1 className="font-display text-3xl mb-6">{t("cart.checkout")}</h1>
      <Card className="p-8">
        <p className="text-[var(--color-muted)]">
          Le tunnel de paiement Stripe sera branché ici (étape <strong>Phase 3</strong> de la roadmap).
        </p>
        <ol className="mt-4 list-decimal pl-5 text-sm space-y-1">
          <li>Adresse de livraison</li>
          <li>Choix transporteur (Shippo)</li>
          <li>Stripe Payment Element</li>
        </ol>
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          Endpoints à créer : <code>POST /api/checkout/intent</code>, webhook{" "}
          <code>POST /api/webhooks/stripe</code>.
        </p>
      </Card>
    </section>
  );
}

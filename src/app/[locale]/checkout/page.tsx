import { getTranslations } from "next-intl/server";
import { CheckoutClient } from "./checkout-client";

export default async function CheckoutPage() {
  const t = await getTranslations();
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <section className="container-page max-w-5xl py-12">
      <h1 className="font-display text-3xl mb-2">{t("cart.checkout")}</h1>
      {!stripeConfigured && (
        <p className="mb-6 rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/15 px-3 py-2 text-sm text-[var(--color-warning)]">
          {t.rich("checkout.previewMode", {
            code: (chunks) => <code>{chunks}</code>,
          })}
        </p>
      )}
      <CheckoutClient />
    </section>
  );
}

import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, Mail, Package, Truck } from "lucide-react";
import { ClearCart } from "./clear-cart";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const t = await getTranslations("checkout.success");

  // Support post-achat : WhatsApp (gratuit, sans page /contact). Masqué si non
  // configuré — pas de lien mort depuis que les pages vitrine sont retirées.
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/[^\d]/g, "");
  const waHref = waNumber ? `https://wa.me/${waNumber}` : null;

  const steps = [
    { Icon: Mail, title: t("step1Title"), body: t("step1Body") },
    { Icon: Package, title: t("step2Title"), body: t("step2Body") },
    { Icon: Truck, title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <section className="container-page max-w-2xl py-16">
      <ClearCart />
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-[var(--color-success,#16a34a)]" />
        <h1 className="mt-4 mb-2 font-display text-3xl">{t("thanks")}</h1>
        <p className="text-[var(--color-muted)]">{t("confirmed")}</p>

        <ol className="mt-8 grid gap-4 text-left sm:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.Icon;
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
            {t("ref")} {session_id}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link href="/">{t("backHome")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/account/orders">{t("viewOrders")}</Link>
          </Button>
        </div>
        {waHref && (
          <p className="mt-4 text-xs text-[var(--color-muted)]">
            {t("question")}{" "}
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {t("contactLink")}
            </a>
          </p>
        )}
      </Card>
    </section>
  );
}

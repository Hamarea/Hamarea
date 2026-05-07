import { setRequestLocale, getTranslations } from "next-intl/server";
import { CategoryStrip } from "@/components/shop/category-strip";
import { listCategories } from "@/lib/queries";

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const categories = await listCategories(locale);

  return (
    <section className="container-page py-12">
      <h1 className="font-display text-4xl mb-8">{t("nav.categories")}</h1>
      <CategoryStrip categories={categories} />
    </section>
  );
}

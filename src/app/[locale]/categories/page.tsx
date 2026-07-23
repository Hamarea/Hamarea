import { redirect } from "@/i18n/navigation";

// Page catégories masquée tant que la boutique se concentre sur la sacoche.
export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/sacoche", locale });
}

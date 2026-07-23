import { redirect } from "@/i18n/navigation";

// Page catalogue multi-produits masquée pour l'instant : la boutique se
// concentre sur la sacoche. On redirige plutôt que de supprimer la route pour
// que les anciens liens/favoris continuent de fonctionner.
export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/sacoche", locale });
}

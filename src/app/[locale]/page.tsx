import { redirect } from "@/i18n/navigation";

// La sacoche est LA landing page pour l'instant : la home de marque
// (univers, communauté, waitlist…) est mise de côté tant que la boutique se
// concentre sur un seul produit. On redirige plutôt que de supprimer pour
// pouvoir réactiver la home facilement (voir l'historique git).
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/sacoche", locale });
}

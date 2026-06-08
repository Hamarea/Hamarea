import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { FolderTree, Star } from "lucide-react";
import { HeroMediaForm } from "@/components/admin/hero-media-form";
import { getHomeHero } from "@/lib/queries";
import { saveHomeHero } from "./actions";

export default async function AdminAppearancePage() {
  const hero = await getHomeHero();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 font-display text-3xl">Page d&apos;accueil</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Gérez l&apos;apparence de la page d&apos;accueil — sans toucher au code.
      </p>

      <Card className="p-6">
        <h2 className="font-medium">Image / vidéo de fond (Hero)</h2>
        <p className="mt-1 mb-5 text-sm text-[var(--color-muted)]">
          Le grand visuel en haut de l&apos;accueil. Choisissez une photo, un
          diaporama de plusieurs photos, ou une vidéo.
        </p>
        <HeroMediaForm action={saveHomeHero} initial={hero} />
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-medium">
            <FolderTree className="h-4 w-4" /> Section « L&apos;Univers »
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            La grille « L&apos;Univers » affiche vos <strong>catégories</strong>{" "}
            (image + description). Gérez-les ici :
          </p>
          <Link
            href={"/admin/categories" as never}
            className="mt-3 inline-block text-sm font-semibold text-[var(--color-primary-700)] underline"
          >
            Gérer les catégories →
          </Link>
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-medium">
            <Star className="h-4 w-4" /> Best-seller(s)
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            La mise en avant best-seller affiche les produits cochés{" "}
            <strong>« Vedette »</strong> (un ou plusieurs). Cochez-les sur la
            fiche produit :
          </p>
          <Link
            href={"/admin/products" as never}
            className="mt-3 inline-block text-sm font-semibold text-[var(--color-primary-700)] underline"
          >
            Gérer les produits →
          </Link>
        </Card>
      </div>
    </div>
  );
}

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { createClient } from "@/lib/supabase/server";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { createCategory, deleteCategory, setCategoryActive } from "./actions";

type CategoryRow = {
  id: string;
  slug: string;
  name_i18n: Record<string, string> | null;
  active: boolean;
  position: number;
  products?: { count: number }[] | null;
};

export default async function AdminCategoriesPage() {
  const supabase = await createClient();

  let categories: CategoryRow[] = [];
  try {
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          order: (k: string, o: { ascending: boolean }) => Promise<{ data: CategoryRow[] | null }>;
        };
      };
    })
      .from("categories")
      .select("id, slug, name_i18n, active, position, products:products(count)")
      .order("position", { ascending: true });
    categories = data ?? [];
  } catch {
    categories = [];
  }

  const countOf = (c: CategoryRow) => c.products?.[0]?.count ?? 0;

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl">Catégories</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Les catégories alimentent le filtre du catalogue. Reliez un produit à une
        catégorie depuis sa fiche (ou directement à la création).
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Lien (slug)</th>
                <th className="px-4 py-3 font-medium">Produits</th>
                <th className="px-4 py-3 font-medium">Visibilité</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-muted)]">
                    Aucune catégorie. Créez-en une avec le formulaire à droite. →
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {c.name_i18n?.fr ?? c.name_i18n?.en ?? c.slug}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">{c.slug}</td>
                    <td className="px-4 py-3 tabular-nums">{countOf(c)}</td>
                    <td className="px-4 py-3">
                      {c.active ? (
                        <span className="inline-flex items-center rounded-full bg-[var(--color-secondary-50)] px-2 py-0.5 text-xs font-medium text-[var(--color-secondary-700)]">
                          Visible
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-[var(--color-bg)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted)]">
                          Masquée
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <form action={setCategoryActive}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="active" value={c.active ? "false" : "true"} />
                          <SubmitButton
                            type="submit"
                            variant="ghost"
                            size="sm"
                            aria-label={c.active ? "Masquer" : "Afficher"}
                          >
                            {c.active ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </SubmitButton>
                        </form>
                        <form action={deleteCategory}>
                          <input type="hidden" name="id" value={c.id} />
                          <SubmitButton
                            type="submit"
                            variant="ghost"
                            size="sm"
                            aria-label="Supprimer la catégorie"
                          >
                            <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                          </SubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-medium">Nouvelle catégorie</h2>
          <ActionForm
            action={createCategory}
            className="space-y-3"
            successMessage="Catégorie créée."
            resetOnSuccess
          >
            <div className="space-y-1.5">
              <Label htmlFor="name_fr">Nom (FR) *</Label>
              <Input
                id="name_fr"
                name="name_fr"
                required
                maxLength={120}
                placeholder="ex : Accessoires"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Lien (slug)</Label>
              <Input id="slug" name="slug" maxLength={120} placeholder="auto (depuis le nom)" />
            </div>
            <SubmitButton>Créer la catégorie</SubmitButton>
          </ActionForm>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            🌍 La traduction (EN / ES / DE) est <strong>automatique</strong>. La
            catégorie est <strong>visible</strong> par défaut dans le catalogue.
          </p>
        </Card>
      </div>
    </div>
  );
}

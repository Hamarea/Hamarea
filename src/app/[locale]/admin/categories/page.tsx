import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { createClient } from "@/lib/supabase/server";
import { Eye, EyeOff, Trash2, Pencil, ImageIcon } from "lucide-react";
import { createCategory, deleteCategory, setCategoryActive, updateCategory } from "./actions";

type CategoryRow = {
  id: string;
  slug: string;
  name_i18n: Record<string, string> | null;
  description_i18n: Record<string, string> | null;
  image_url: string | null;
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
      .select("id, slug, name_i18n, description_i18n, image_url, active, position, products:products(count)")
      .order("position", { ascending: true });
    categories = data ?? [];
  } catch {
    categories = [];
  }

  const countOf = (c: CategoryRow) => c.products?.[0]?.count ?? 0;
  const nameOf = (c: CategoryRow) => c.name_i18n?.fr ?? c.name_i18n?.en ?? c.slug;

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl">Catégories</h1>
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-muted)]">
        Les catégories alimentent le filtre du catalogue <strong>et la section
        « L&apos;Univers » de la page d&apos;accueil</strong>. Ajoutez une image et une
        courte description : elles s&apos;affichent telles quelles sur l&apos;accueil.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* List of categories (with inline edit) */}
        <div className="space-y-3">
          {categories.length === 0 ? (
            <Card className="px-4 py-12 text-center text-[var(--color-muted)]">
              Aucune catégorie. Créez-en une avec le formulaire à droite. →
            </Card>
          ) : (
            categories.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.image_url}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-[var(--color-border)]"
                    />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-[var(--color-bg)] text-[var(--color-muted)] ring-1 ring-[var(--color-border)]">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{nameOf(c)}</p>
                    <p className="truncate text-xs text-[var(--color-muted)]">
                      /{c.slug} · {countOf(c)} produit(s)
                    </p>
                    {c.description_i18n?.fr && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-[var(--color-muted)]">
                        {c.description_i18n.fr}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {c.active ? (
                      <span className="hidden rounded-full bg-[var(--color-secondary-50)] px-2 py-0.5 text-xs font-medium text-[var(--color-secondary-700)] sm:inline">
                        Visible
                      </span>
                    ) : (
                      <span className="hidden rounded-full bg-[var(--color-bg)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted)] sm:inline">
                        Masquée
                      </span>
                    )}
                    <form action={setCategoryActive}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="active" value={c.active ? "false" : "true"} />
                      <SubmitButton
                        type="submit"
                        variant="ghost"
                        size="sm"
                        aria-label={c.active ? "Masquer" : "Afficher"}
                      >
                        {c.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                </div>

                {/* Inline edit */}
                <details className="border-t border-[var(--color-border)]">
                  <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--color-primary-700)] hover:bg-[var(--color-bg)]">
                    <Pencil className="h-3.5 w-3.5" /> Modifier
                  </summary>
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                    <ActionForm
                      action={updateCategory}
                      className="grid gap-3 sm:grid-cols-2"
                      successMessage="Catégorie enregistrée."
                    >
                      <input type="hidden" name="id" value={c.id} />
                      <div className="space-y-1.5">
                        <Label htmlFor={`name_${c.id}`}>Nom (FR) *</Label>
                        <Input
                          id={`name_${c.id}`}
                          name="name_fr"
                          required
                          maxLength={120}
                          defaultValue={c.name_i18n?.fr ?? ""}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`slug_${c.id}`}>Lien (slug)</Label>
                        <Input
                          id={`slug_${c.id}`}
                          name="slug"
                          maxLength={120}
                          defaultValue={c.slug}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor={`desc_${c.id}`}>Description courte</Label>
                        <textarea
                          id={`desc_${c.id}`}
                          name="description_fr"
                          rows={2}
                          maxLength={2000}
                          defaultValue={c.description_i18n?.fr ?? ""}
                          placeholder="Une phrase qui décrit cette gamme (traduite automatiquement)."
                          className="w-full resize-y rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`file_${c.id}`}>Remplacer l&apos;image</Label>
                        <input
                          id={`file_${c.id}`}
                          type="file"
                          name="file"
                          accept="image/*"
                          className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primary-600)] file:px-3 file:py-1.5 file:text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`img_${c.id}`}>… ou image par URL</Label>
                        <Input
                          id={`img_${c.id}`}
                          name="image_url"
                          type="url"
                          maxLength={1000}
                          placeholder="https://…"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <SubmitButton>Enregistrer</SubmitButton>
                      </div>
                    </ActionForm>
                  </div>
                </details>
              </Card>
            ))
          )}
        </div>

        {/* Create */}
        <Card className="h-fit p-6">
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
            <div className="space-y-1.5">
              <Label htmlFor="description_fr">Description courte</Label>
              <textarea
                id="description_fr"
                name="description_fr"
                rows={2}
                maxLength={2000}
                placeholder="Une phrase qui décrit cette gamme."
                className="w-full resize-y rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="file">Image (depuis l&apos;ordinateur)</Label>
              <input
                id="file"
                type="file"
                name="file"
                accept="image/*"
                className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primary-600)] file:px-3 file:py-1.5 file:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="image_url">… ou image par URL</Label>
              <Input id="image_url" name="image_url" type="url" maxLength={1000} placeholder="https://…" />
            </div>
            <SubmitButton>Créer la catégorie</SubmitButton>
          </ActionForm>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            🌍 La traduction (EN / ES / DE) est <strong>automatique</strong>. La
            catégorie est <strong>visible</strong> par défaut.
          </p>
        </Card>
      </div>
    </div>
  );
}

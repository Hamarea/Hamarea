import { Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { createClient } from "@/lib/supabase/server";
import { createSupplier, updateSupplier, deleteSupplier } from "./actions";

type SupplierRow = {
  id: string;
  name: string;
  contact_email: string | null;
  phone: string | null;
  country: string | null;
  notes: string | null;
};

// Pays fréquents en dropshipping (code ISO-2 + libellé) — fini la saisie « ISO 2 ».
const COUNTRIES: { code: string; name: string }[] = [
  { code: "", name: "— Pays —" },
  { code: "CN", name: "Chine" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Allemagne" },
  { code: "ES", name: "Espagne" },
  { code: "IT", name: "Italie" },
  { code: "PT", name: "Portugal" },
  { code: "NL", name: "Pays-Bas" },
  { code: "BE", name: "Belgique" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "US", name: "États-Unis" },
  { code: "TR", name: "Turquie" },
  { code: "IN", name: "Inde" },
  { code: "VN", name: "Viêt Nam" },
  { code: "HK", name: "Hong Kong" },
  { code: "TW", name: "Taïwan" },
  { code: "PL", name: "Pologne" },
];

function CountrySelect({ id, defaultValue }: { id?: string; defaultValue?: string | null }) {
  return (
    <select
      {...(id ? { id } : {})}
      name="country"
      aria-label="Pays"
      defaultValue={defaultValue ?? ""}
      className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
    >
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code ? `${c.name} (${c.code})` : c.name}
        </option>
      ))}
    </select>
  );
}

export default async function AdminSuppliersPage() {
  const supabase = await createClient();

  let suppliers: SupplierRow[] = [];
  try {
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          order: (k: string, o: { ascending: boolean }) => Promise<{ data: SupplierRow[] | null }>;
        };
      };
    })
      .from("suppliers")
      .select("id, name, contact_email, phone, country, notes")
      .order("created_at", { ascending: false });
    suppliers = data ?? [];
  } catch {
    suppliers = [];
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-2">Fournisseurs</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Carnet de fournisseurs (dropshipping). Reliez vos produits à un
        fournisseur depuis l&apos;onglet Produits.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Pays</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-[var(--color-muted)]">
                    Aucun fournisseur.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <Fragment key={s.id}>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3">{s.contact_email ?? "—"}</td>
                      <td className="px-4 py-3">{s.country ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <form action={deleteSupplier} className="inline">
                          <input type="hidden" name="id" value={s.id} />
                          <SubmitButton type="submit" variant="ghost" size="sm">
                            Supprimer
                          </SubmitButton>
                        </form>
                      </td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td colSpan={4} className="px-4 pb-3">
                        <details>
                          <summary className="cursor-pointer text-xs text-[var(--color-primary-600)] hover:underline">
                            Modifier
                          </summary>
                          <ActionForm
                            action={updateSupplier}
                            successMessage="Fournisseur enregistré."
                            className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                          >
                            <input type="hidden" name="id" value={s.id} />
                            <div className="space-y-1">
                              <Label className="text-xs">Nom</Label>
                              <Input name="name" defaultValue={s.name} required maxLength={160} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Email</Label>
                              <Input name="contact_email" type="email" defaultValue={s.contact_email ?? ""} maxLength={200} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Téléphone</Label>
                              <Input name="phone" type="tel" defaultValue={s.phone ?? ""} maxLength={40} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Pays</Label>
                              <CountrySelect defaultValue={s.country} />
                            </div>
                            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                              <Label className="text-xs">Notes</Label>
                              <textarea
                                name="notes"
                                rows={2}
                                maxLength={2000}
                                defaultValue={s.notes ?? ""}
                                className="w-full resize-y rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <SubmitButton size="sm">Enregistrer</SubmitButton>
                            </div>
                          </ActionForm>
                        </details>
                      </td>
                    </tr>
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-medium">Nouveau fournisseur</h2>
          <ActionForm action={createSupplier} className="space-y-3" successMessage="Fournisseur ajouté." resetOnSuccess>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" name="name" required maxLength={160} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_email">Email</Label>
              <Input id="contact_email" name="contact_email" type="email" maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" type="tel" maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Pays</Label>
              <CountrySelect id="country" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                maxLength={2000}
                className="w-full resize-y rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
              />
            </div>
            <SubmitButton>Ajouter</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}

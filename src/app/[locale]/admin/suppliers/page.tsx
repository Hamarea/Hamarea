import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/lib/supabase/server";
import { createSupplier, deleteSupplier } from "./actions";

type SupplierRow = {
  id: string;
  name: string;
  contact_email: string | null;
  phone: string | null;
  country: string | null;
};

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
      .select("id, name, contact_email, phone, country")
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
                  <tr key={s.id} className="border-b border-[var(--color-border)]">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.contact_email ?? "—"}</td>
                    <td className="px-4 py-3">{s.country ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <form action={deleteSupplier}>
                        <input type="hidden" name="id" value={s.id} />
                        <SubmitButton type="submit" variant="ghost" size="sm">
                          Supprimer
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-medium">Nouveau fournisseur</h2>
          <form action={createSupplier} className="space-y-3">
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
              <Label htmlFor="country">Pays (ISO 2)</Label>
              <Input id="country" name="country" maxLength={2} minLength={2} placeholder="CN" />
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
          </form>
        </Card>
      </div>
    </div>
  );
}

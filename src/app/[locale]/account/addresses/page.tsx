import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { addAddress, deleteAddress, setDefaultAddress } from "./actions";

type AddressRow = {
  id: string;
  type: string;
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  zip: string;
  state: string | null;
  country: string;
  phone: string | null;
  is_default: boolean;
};

export default async function AddressesPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let addresses: AddressRow[] = [];
  if (user) {
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          eq: (k: string, v: string) => {
            order: (k: string, o: { ascending: boolean }) => Promise<{ data: AddressRow[] | null }>;
          };
        };
      };
    })
      .from("addresses")
      .select("id, type, full_name, line1, line2, city, zip, state, country, phone, is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });
    addresses = data ?? [];
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">{t("account.addresses")}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {addresses.length === 0 ? (
            <Card className="p-8 text-center text-[var(--color-muted)]">
              Aucune adresse enregistrée.
            </Card>
          ) : (
            addresses.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm">
                    <p className="flex items-center gap-2 font-medium">
                      {a.full_name}
                      {a.is_default && <Badge variant="success">Par défaut</Badge>}
                      <Badge variant="outline">
                        {a.type === "billing" ? "Facturation" : "Livraison"}
                      </Badge>
                    </p>
                    <p className="mt-1 text-[var(--color-muted)]">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}
                      <br />
                      {a.zip} {a.city}
                      {a.state ? `, ${a.state}` : ""} · {a.country}
                      {a.phone ? (
                        <>
                          <br />
                          {a.phone}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {!a.is_default && (
                      <form action={setDefaultAddress}>
                        <input type="hidden" name="id" value={a.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Définir par défaut
                        </Button>
                      </form>
                    )}
                    <form action={deleteAddress}>
                      <input type="hidden" name="id" value={a.id} />
                      <Button type="submit" variant="destructive" size="sm">
                        Supprimer
                      </Button>
                    </form>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <Card className="p-6">
          <h2 className="mb-4 font-medium">Ajouter une adresse</h2>
          <form action={addAddress} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  name="type"
                  className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
                >
                  <option value="shipping">Livraison</option>
                  <option value="billing">Facturation</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nom complet</Label>
                <Input id="full_name" name="full_name" required maxLength={120} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="line1">Adresse</Label>
              <Input id="line1" name="line1" required maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="line2">Complément (optionnel)</Label>
              <Input id="line2" name="line2" maxLength={200} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="zip">Code postal</Label>
                <Input id="zip" name="zip" required maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" name="city" required maxLength={120} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="state">Région (optionnel)</Label>
                <Input id="state" name="state" maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Pays (ISO 2)</Label>
                <Input
                  id="country"
                  name="country"
                  required
                  maxLength={2}
                  minLength={2}
                  placeholder="FR"
                  defaultValue="FR"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone (optionnel)</Label>
              <Input id="phone" name="phone" type="tel" maxLength={40} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_default"
                className="h-4 w-4 rounded border-[var(--color-border)]"
              />
              Définir comme adresse par défaut
            </label>
            <Button type="submit">Ajouter</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

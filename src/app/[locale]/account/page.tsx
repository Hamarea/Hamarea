import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";

type ProfileRow = {
  full_name: string | null;
  phone: string | null;
  locale: string;
  currency: string;
  marketing_opt_in: boolean;
};

export default async function AccountHomePage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: ProfileRow | null = null;
  if (user) {
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          eq: (k: string, v: string) => {
            maybeSingle: () => Promise<{ data: ProfileRow | null }>;
          };
        };
      };
    })
      .from("profiles")
      .select("full_name, phone, locale, currency, marketing_opt_in")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">{t("account.profile")}</h1>
      <Card className="max-w-xl p-6">
        <ActionForm action={updateProfile} className="space-y-5" successMessage={t("account.saved")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">{t("auth.fullName")}</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name ?? ""}
                maxLength={120}
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("account.phone")}</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile?.phone ?? ""}
                maxLength={40}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locale">{t("account.language")}</Label>
              <select
                id="locale"
                name="locale"
                defaultValue={profile?.locale ?? "fr"}
                className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">{t("account.currency")}</Label>
              <select
                id="currency"
                name="currency"
                defaultValue={profile?.currency ?? "EUR"}
                className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="marketing_opt_in"
              defaultChecked={profile?.marketing_opt_in ?? false}
              className="h-4 w-4 rounded border-[var(--color-border)]"
            />
            {t("account.marketingOptIn")}
          </label>

          <div className="border-t border-[var(--color-border)] pt-4">
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-[var(--color-muted)] mb-1">{t("auth.email")}</dt>
                <dd className="font-medium">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)] mb-1">ID</dt>
                <dd className="font-mono text-xs">{user?.id}</dd>
              </div>
            </dl>
          </div>

          <SubmitButton>{t("account.save")}</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}

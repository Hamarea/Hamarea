import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AccountHomePage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">{t("account.profile")}</h1>
      <Card className="p-6">
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
      </Card>
    </div>
  );
}

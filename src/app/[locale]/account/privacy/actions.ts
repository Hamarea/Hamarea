"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";

/**
 * RGPD — droit à l'effacement (art. 17). Deletes the user from auth.users via
 * the service-role client. The FK cascade removes the profile, addresses, carts
 * and wishlists; orders and reviews are kept with user_id nulled (legitimate
 * accounting retention). A self-delete record is written to audit_logs first.
 */
export async function deleteAccount(formData: FormData) {
  const actor = await requireUser();

  // Typed confirmation guards against accidental deletion.
  if (formData.get("confirm") !== "SUPPRIMER") {
    throw new Error("Confirmation invalide : tape SUPPRIMER en majuscules.");
  }

  const admin = createAdminClient();

  // Retention log of the erasure (best-effort, via service role — bypasses RLS).
  try {
    await (
      admin as unknown as {
        from: (t: string) => {
          insert: (r: Record<string, unknown>) => Promise<unknown>;
        };
      }
    )
      .from("audit_logs")
      .insert({
        actor_id: actor.id,
        action: "account.self_delete",
        entity: "profile",
        entity_id: actor.id,
        data: { email: actor.email },
      });
  } catch {
    // never block the deletion on the audit write
  }

  const { error } = await admin.auth.admin.deleteUser(actor.id);
  if (error) throw new Error(error.message ?? "delete_failed");

  // Clear the now-orphaned session cookie, then leave the account area.
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

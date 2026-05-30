import { createClient } from "@/lib/supabase/server";

export type ActorRole = "customer" | "staff" | "admin";

export type Actor = {
  id: string;
  email: string | null;
  role: ActorRole;
};

type ProfileRoleClient = {
  from: (t: string) => {
    select: (q: string) => {
      eq: (k: string, v: string) => {
        maybeSingle: () => Promise<{ data: { role: ActorRole | null } | null }>;
      };
    };
  };
};

/**
 * Resolve the current authenticated actor and their role. Returns null when no
 * user is signed in. The role is read from `profiles.role` (RLS lets a user
 * read their own row).
 */
export async function getActor(): Promise<Actor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await (supabase as unknown as ProfileRoleClient)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    role: (data?.role ?? "customer") as ActorRole,
  };
}

/**
 * Throw `forbidden` unless the actor is signed in. For use at the top of every
 * mutating server action that operates on the user's own data.
 */
export async function requireUser(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new Error("unauthorized");
  return actor;
}

/**
 * Throw `forbidden` unless the actor is staff or admin. Defence in depth on top
 * of RLS `*_admin_all` policies — server actions are public endpoints, so we
 * never rely on the surrounding admin layout alone.
 */
export async function requireStaff(): Promise<Actor> {
  const actor = await getActor();
  if (!actor || (actor.role !== "admin" && actor.role !== "staff")) {
    throw new Error("forbidden");
  }
  return actor;
}

/** Throw `forbidden` unless the actor is a full admin (e.g. role management). */
export async function requireAdmin(): Promise<Actor> {
  const actor = await getActor();
  if (!actor || actor.role !== "admin") throw new Error("forbidden");
  return actor;
}

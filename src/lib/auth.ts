import { createClient } from "@/lib/supabase/server";
import {
  type Permission,
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
} from "@/lib/permissions";

export type { Permission };
export { ALL_PERMISSIONS, PERMISSION_LABELS };

export type ActorRole = "customer" | "staff" | "admin";

export type Actor = {
  id: string;
  email: string | null;
  role: ActorRole;
  permissions: Permission[];
};

type ProfileRow = { role: ActorRole | null; permissions: string[] | null };
type ProfileClient = {
  from: (t: string) => {
    select: (q: string) => {
      eq: (k: string, v: string) => {
        maybeSingle: () => Promise<{ data: ProfileRow | null; error: unknown }>;
      };
    };
  };
};

/**
 * Resolve the current authenticated actor: id, email, role and fine-grained
 * permissions (read from `profiles`). Returns null when no user is signed in.
 *
 * Resilient to the RBAC migration (0013) not being applied yet: if the
 * `permissions` column is missing, fall back to role only and grant legacy
 * staff the full set, so staff access never regresses before the migration runs.
 */
export async function getActor(): Promise<Actor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const sb = supabase as unknown as ProfileClient;
  const { data, error } = await sb
    .from("profiles")
    .select("role, permissions")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    const fb = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = (fb.data?.role ?? "customer") as ActorRole;
    return {
      id: user.id,
      email: user.email ?? null,
      role,
      permissions: role === "staff" ? [...ALL_PERMISSIONS] : [],
    };
  }

  const role = (data?.role ?? "customer") as ActorRole;
  return {
    id: user.id,
    email: user.email ?? null,
    role,
    permissions: (data?.permissions ?? []) as Permission[],
  };
}

/** Admins implicitly hold every permission; others need the explicit grant. */
export function hasPermission(actor: Actor, perm: Permission): boolean {
  return actor.role === "admin" || actor.permissions.includes(perm);
}

/** Throw `unauthorized` unless the actor is signed in. */
export async function requireUser(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new Error("unauthorized");
  return actor;
}

/** Throw `forbidden` unless the actor is staff or admin (admin-area entry). */
export async function requireStaff(): Promise<Actor> {
  const actor = await getActor();
  if (!actor || (actor.role !== "admin" && actor.role !== "staff")) {
    throw new Error("forbidden");
  }
  return actor;
}

/** Throw `forbidden` unless the actor is a full admin (role/permission management). */
export async function requireAdmin(): Promise<Actor> {
  const actor = await getActor();
  if (!actor || actor.role !== "admin") throw new Error("forbidden");
  return actor;
}

/**
 * Throw `forbidden` unless the actor holds `perm` (admins always pass). Use at
 * the top of every mutating admin action — the real security boundary.
 */
export async function requirePermission(perm: Permission): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new Error("unauthorized");
  if (!hasPermission(actor, perm)) throw new Error("forbidden");
  return actor;
}

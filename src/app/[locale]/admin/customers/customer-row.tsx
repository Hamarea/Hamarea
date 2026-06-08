"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import { setUserRole, setUserPermissions } from "./actions";
import { ALL_PERMISSIONS, PERMISSION_LABELS } from "@/lib/permissions";

export type CustomerView = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "customer" | "staff" | "admin";
  permissions: string[] | null;
  created_at: string;
};

const ROLES = ["customer", "staff", "admin"] as const;

export function CustomerRow({
  customer,
  canManage,
  isSelf,
}: {
  customer: CustomerView;
  canManage: boolean;
  isSelf: boolean;
}) {
  const [role, setRole] = useState(customer.role);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [perms, setPerms] = useState<string[]>(customer.permissions ?? []);
  const [permPending, startPermTransition] = useTransition();
  const [permSaved, setPermSaved] = useState(false);

  const dirty = role !== customer.role;
  const savedPerms = customer.permissions ?? [];
  const permsDirty =
    JSON.stringify([...perms].sort()) !== JSON.stringify([...savedPerms].sort());

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await setUserRole({ userId: customer.id, role });
      } catch (e) {
        setError(e instanceof Error ? e.message : "error");
        setRole(customer.role);
      }
    });
  };

  const togglePerm = (p: string) => {
    setPermSaved(false);
    setPerms((cur) =>
      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p],
    );
  };

  const savePerms = () => {
    setError(null);
    setPermSaved(false);
    startPermTransition(async () => {
      try {
        await setUserPermissions({ userId: customer.id, permissions: perms });
        setPermSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "error");
      }
    });
  };

  return (
    <tr className="border-b border-[var(--color-border)] align-top">
      <td className="px-4 py-3 font-medium">
        <Link
          href={`/admin/customers/${customer.id}` as never}
          className="text-[var(--color-primary-600)] hover:underline"
        >
          {customer.full_name ?? customer.email ?? "—"}
        </Link>
      </td>
      <td className="px-4 py-3">{customer.email}</td>
      <td className="px-4 py-3">
        {canManage && !isSelf ? (
          <div className="flex items-center gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as CustomerView["role"])}
              disabled={pending}
              className="h-9 rounded-md border border-[var(--color-border)] bg-white px-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {dirty && (
              <Button size="sm" variant="secondary" onClick={save} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
              </Button>
            )}
            {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
          </div>
        ) : (
          <Badge
            variant={
              customer.role === "admin"
                ? "accent"
                : customer.role === "staff"
                  ? "secondary"
                  : "outline"
            }
          >
            {customer.role}
            {isSelf ? " (vous)" : ""}
          </Badge>
        )}

        {canManage && customer.role === "staff" && (
          <div className="mt-3 rounded-md border border-[var(--color-border)] p-2">
            <p className="mb-1 text-xs font-medium text-[var(--color-muted)]">
              Permissions
            </p>
            <div className="grid gap-1">
              {ALL_PERMISSIONS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={perms.includes(p)}
                    onChange={() => togglePerm(p)}
                    disabled={permPending}
                    className="h-3.5 w-3.5"
                  />
                  {PERMISSION_LABELS[p]}
                </label>
              ))}
            </div>
            {permsDirty && (
              <Button
                size="sm"
                variant="secondary"
                onClick={savePerms}
                disabled={permPending}
                className="mt-2"
              >
                {permPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Enregistrer les permissions"
                )}
              </Button>
            )}
            {permSaved && (
              <span className="ml-2 text-xs text-[var(--color-secondary-700)]">
                ✓ Enregistré
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--color-muted)]">
        {new Date(customer.created_at).toLocaleDateString()}
      </td>
    </tr>
  );
}

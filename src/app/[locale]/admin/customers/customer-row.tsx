"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { setUserRole } from "./actions";

export type CustomerView = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "customer" | "staff" | "admin";
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

  const dirty = role !== customer.role;

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

  return (
    <tr className="border-b border-[var(--color-border)]">
      <td className="px-4 py-3 font-medium">{customer.full_name ?? "—"}</td>
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
      </td>
      <td className="px-4 py-3 text-[var(--color-muted)]">
        {new Date(customer.created_at).toLocaleDateString()}
      </td>
    </tr>
  );
}

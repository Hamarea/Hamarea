"use client";

import { useTransition } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";
import { MoreVertical, Pencil, Copy, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { duplicateProduct, deleteProduct } from "@/app/[locale]/admin/products/[id]/actions";

const ITEM =
  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm outline-none data-[highlighted]:bg-[var(--color-bg)]";

/**
 * Per-row product actions in a "⋯" menu — Éditer · Dupliquer · Supprimer.
 * Radix portals the menu to <body>, so it's never clipped by the table's
 * horizontal-scroll wrapper. Server actions run inside a transition.
 */
export function RowActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const fd = () => {
    const f = new FormData();
    f.set("id", id);
    return f;
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Actions"
          disabled={pending}
          className="grid h-8 w-8 place-items-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-bg)] disabled:opacity-50 data-[state=open]:bg-[var(--color-bg)]"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 w-44 overflow-hidden rounded-md border border-[var(--color-border)] bg-white py-1 shadow-lg"
        >
          <DropdownMenu.Item asChild>
            <Link href={`/admin/products/${id}` as never} className={ITEM}>
              <Pencil className="h-4 w-4" /> Éditer
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={ITEM}
            onSelect={() =>
              start(async () => {
                await duplicateProduct(fd());
                toast.success("Produit dupliqué.");
              })
            }
          >
            <Copy className="h-4 w-4" /> Dupliquer
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
          <DropdownMenu.Item
            className={ITEM + " text-[var(--color-danger)] data-[highlighted]:bg-[var(--color-danger)]/10"}
            onSelect={(e) => {
              e.preventDefault();
              if (
                window.confirm(
                  "Supprimer définitivement ce produit (variantes, photos, stock) ? Cette action est irréversible.",
                )
              ) {
                start(async () => {
                  await deleteProduct(fd());
                });
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Supprimer
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

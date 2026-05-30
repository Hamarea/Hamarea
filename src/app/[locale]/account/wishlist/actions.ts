"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

type WishlistClient = {
  from: (t: string) => {
    select: (q: string) => {
      eq: (k: string, v: string) => {
        maybeSingle: () => Promise<{ data: { id: string } | null }>;
      };
    };
    insert: (
      row: Record<string, unknown>,
    ) => {
      select: (q: string) => {
        single: () => Promise<{ data: { id: string } | null; error: { message?: string } | null }>;
      };
    } & PromiseLike<{ error: { code?: string; message?: string } | null }>;
    delete: () => {
      eq: (k: string, v: string) => Promise<{ error: { message?: string } | null }>;
    };
  };
};

async function ensureWishlist(sb: WishlistClient, userId: string): Promise<string | null> {
  const { data } = await sb.from("wishlists").select("id").eq("user_id", userId).maybeSingle();
  if (data?.id) return data.id;
  const { data: created } = await sb
    .from("wishlists")
    .insert({ user_id: userId })
    .select("id")
    .single();
  return created?.id ?? null;
}

export async function addToWishlist(productId: string) {
  const id = z.string().uuid().parse(productId);
  const actor = await requireUser();
  const sb = (await createClient()) as unknown as WishlistClient;
  const wishlistId = await ensureWishlist(sb, actor.id);
  if (!wishlistId) throw new Error("wishlist_unavailable");

  // unique (wishlist_id, product_id) → a duplicate insert is a harmless 23505.
  const { error } = await sb
    .from("wishlist_items")
    .insert({ wishlist_id: wishlistId, product_id: id });
  if (error && error.code !== "23505") throw new Error(error.message ?? "add_failed");
  revalidatePath("/account/wishlist");
}

export async function removeFromWishlist(formData: FormData) {
  await requireUser();
  const itemId = z.string().uuid().parse(formData.get("id"));
  const sb = (await createClient()) as unknown as WishlistClient;
  // RLS (wishlist_items_owner_all) guarantees the item belongs to the caller.
  const { error } = await sb.from("wishlist_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message ?? "remove_failed");
  revalidatePath("/account/wishlist");
}

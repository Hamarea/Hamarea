"use client";

import { useState, useTransition } from "react";
import { Heart, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { addToWishlist } from "@/app/[locale]/account/wishlist/actions";

export function WishlistButton({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "done" | "auth" | "error">("idle");

  const onClick = () => {
    setState("idle");
    startTransition(async () => {
      try {
        await addToWishlist(productId);
        setState("done");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        setState(msg === "unauthorized" ? "auth" : "error");
      }
    });
  };

  if (state === "auth") {
    return (
      <p className="mt-3 text-sm text-[var(--color-muted)]">
        <Link href="/login" className="text-[var(--color-primary-600)] underline">
          Connectez-vous
        </Link>{" "}
        pour ajouter aux favoris.
      </p>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="mt-3"
      onClick={onClick}
      disabled={pending || state === "done"}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : state === "done" ? (
        <Check className="h-4 w-4" />
      ) : (
        <Heart className="h-4 w-4" />
      )}
      {state === "done" ? "Ajouté aux favoris" : "Ajouter aux favoris"}
    </Button>
  );
}

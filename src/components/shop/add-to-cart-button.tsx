"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCart, type CartLine } from "@/stores/cart";
import { Check, ShoppingBag } from "lucide-react";

export function AddToCartButton({
  line,
  disabled,
}: {
  line: CartLine;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  return (
    <Button
      size="lg"
      disabled={disabled}
      onClick={() => {
        add(line);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
    >
      {added ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
      {disabled ? t("common.outOfStock") : added ? "Ajouté !" : t("common.addToCart")}
    </Button>
  );
}

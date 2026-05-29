"use client";

import { useEffect } from "react";
import { useCart } from "@/stores/cart";

/**
 * Empties the persisted cart once the customer lands on the success page after
 * a completed Stripe Checkout. Renders nothing.
 */
export function ClearCart() {
  useEffect(() => {
    useCart.getState().clear();
  }, []);
  return null;
}

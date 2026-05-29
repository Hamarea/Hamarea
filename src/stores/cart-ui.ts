"use client";
import { create } from "zustand";

type CartUIState = {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

/** Controls the slide-in mini-cart. Kept separate from the cart data store. */
export const useCartUI = create<CartUIState>((set) => ({
  open: false,
  openDrawer: () => set({ open: true }),
  closeDrawer: () => set({ open: false }),
}));

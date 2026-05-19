"use client";
import { create } from "zustand";
import { SACOCHE } from "@/lib/product";

type ColorId = (typeof SACOCHE.colors)[number]["id"];

type State = {
  id: ColorId;
  setId: (id: ColorId) => void;
};

export const useSelectedColor = create<State>((set) => ({
  id: SACOCHE.colors[0].id,
  setId: (id) => set({ id }),
}));

export function useSelectedColor_current() {
  const id = useSelectedColor((s) => s.id);
  return SACOCHE.colors.find((c) => c.id === id) ?? SACOCHE.colors[0];
}

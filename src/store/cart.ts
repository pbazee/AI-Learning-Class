// src/store/cart.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (courseId: string) => void;
  clearCart: () => void;
  isInCart: (courseId: string) => boolean;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existing = get().items.find((i) => i.courseId === item.courseId);
        if (!existing) {
          set((state) => ({ items: [...state.items, item] }));
        }
      },
      removeItem: (courseId) => {
        set((state) => ({ items: state.items.filter((i) => i.courseId !== courseId) }));
      },
      clearCart: () => set({ items: [] }),
      isInCart: (courseId) => get().items.some((i) => i.courseId === courseId),
      total: () => get().items.reduce((sum, item) => sum + item.price, 0),
      itemCount: () => get().items.length,
    }),
    { name: "ai-learning-cart" }
  )
);

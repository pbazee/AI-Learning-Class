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

function sanitizeCartItems(items: CartItem[] | undefined) {
  return (items ?? []).filter((item) => Number.isFinite(item.price) && item.price > 0);
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        if (item.price <= 0) {
          return;
        }

        const existing = sanitizeCartItems(get().items).find((i) => i.courseId === item.courseId);
        if (!existing) {
          set((state) => ({ items: [...sanitizeCartItems(state.items), item] }));
        }
      },
      removeItem: (courseId) => {
        set((state) => ({ items: state.items.filter((i) => i.courseId !== courseId) }));
      },
      clearCart: () => set({ items: [] }),
      isInCart: (courseId) => sanitizeCartItems(get().items).some((i) => i.courseId === courseId),
      total: () => sanitizeCartItems(get().items).reduce((sum, item) => sum + item.price, 0),
      itemCount: () => sanitizeCartItems(get().items).length,
    }),
    {
      name: "ai-learning-cart",
      merge: (persistedState, currentState) => {
        const persistedCart = persistedState as Partial<CartStore> | undefined;

        return {
          ...currentState,
          ...persistedCart,
          items: sanitizeCartItems(persistedCart?.items ?? currentState.items),
        };
      },
    }
  )
);

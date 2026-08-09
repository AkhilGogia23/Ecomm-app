import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  variantId: string | null;
  title: string;
  slug: string;
  image: string | null;
  price: number;
  salePrice: number | null;
  size: string | null;
  color: string | null;
  quantity: number;
  stock: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  clear: () => void;
  replaceAll: (items: CartItem[]) => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      addItem: (item) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.productId === item.productId && i.variantId === item.variantId
          );
          if (existingIndex >= 0) {
            const next = [...state.items];
            next[existingIndex] = {
              ...next[existingIndex],
              quantity: Math.min(next[existingIndex].quantity + item.quantity, item.stock),
            };
            return { items: next };
          }
          return { items: [...state.items, item] };
        });
      },
      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter((i) => !(i.productId === productId && i.variantId === variantId)),
        }));
      },
      updateQuantity: (productId, variantId, quantity) => {
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId && i.variantId === variantId
                ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
                : i
            )
            .filter((i) => i.quantity > 0),
        }));
      },
      clear: () => set({ items: [] }),
      replaceAll: (items) => set({ items }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () => get().items.reduce((sum, i) => sum + (i.salePrice ?? i.price) * i.quantity, 0),
    }),
    { name: "cart-storage", partialize: (state) => ({ items: state.items }) }
  )
);

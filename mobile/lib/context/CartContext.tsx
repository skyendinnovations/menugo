import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface CartItem {
  menuItemId: number;
  name: string;
  price: string;
  variantName?: string;
  quantity: number;
  notes?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (menuItemId: number, variantName?: string) => void;
  updateQuantity: (menuItemId: number, quantity: number, variantName?: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const getKey = (menuItemId: number, variantName?: string) =>
    `${menuItemId}:${variantName || ''}`;

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const key = getKey(item.menuItemId, item.variantName);
      const existing = prev.find(
        (i) => getKey(i.menuItemId, i.variantName) === key
      );
      if (existing) {
        return prev.map((i) =>
          getKey(i.menuItemId, i.variantName) === key
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (menuItemId: number, variantName?: string) => {
    const key = getKey(menuItemId, variantName);
    setItems((prev) =>
      prev.filter((i) => getKey(i.menuItemId, i.variantName) !== key)
    );
  };

  const updateQuantity = (menuItemId: number, quantity: number, variantName?: string) => {
    if (quantity <= 0) {
      removeItem(menuItemId, variantName);
      return;
    }
    const key = getKey(menuItemId, variantName);
    setItems((prev) =>
      prev.map((i) =>
        getKey(i.menuItemId, i.variantName) === key
          ? { ...i, quantity }
          : i
      )
    );
  };

  const clearCart = () => setItems([]);

  const total = items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

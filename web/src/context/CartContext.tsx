import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useAuth } from '@clerk/react';
import { useApiClient } from '../hooks/useApiClient';
import { CartContext } from './cartContextInstance';
import {
  CART_STORAGE_KEY,
  readLocalCart,
  writeLocalCart,
  type CartItem,
} from './cart.types';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => readLocalCart());
  const [isLoaded] = useState(true);
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const api = useApiClient();

  // Sync with backend DB when signed in
  useEffect(() => {
    if (!isAuthLoaded || !isLoaded || !isSignedIn) return;

    let active = true;

    const syncServerCart = async () => {
      try {
        const localSnapshot = readLocalCart();
        const response = await api.get('/cart');
        const serverItems: CartItem[] | undefined = response?.data?.items;

        if (!active) return;

        if (response?.data?.success && Array.isArray(serverItems)) {
          if (serverItems.length === 0 && localSnapshot.length > 0) {
            await Promise.allSettled(
              localSnapshot.map((item) =>
                api.post('/cart/add', { productId: item.id, quantity: item.quantity })
              )
            );
            setCartItems(localSnapshot);
            writeLocalCart(localSnapshot);
          } else {
            setCartItems(serverItems);
            writeLocalCart(serverItems);
          }
        }
      } catch (error) {
        console.warn('Backend cart sync unavailable, keeping local cart:', error);
      }
    };

    void syncServerCart();

    return () => {
      active = false;
    };
  }, [isSignedIn, isAuthLoaded, isLoaded, api]);

  // Persist to localStorage whenever cartItems changes
  useEffect(() => {
    if (!isLoaded) return;
    writeLocalCart(cartItems);
  }, [cartItems, isLoaded]);

  const addToCart = useCallback(
    async (product: Omit<CartItem, 'quantity'>) => {
      setCartItems((prev) => {
        const idx = prev.findIndex((i) => i.id === product.id);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
          return next;
        }
        return [...prev, { ...product, quantity: 1 }];
      });

      if (isSignedIn) {
        try {
          await api.post('/cart/add', { productId: product.id, quantity: 1 });
        } catch (error) {
          console.warn('Remote cart add failed (kept in localStorage):', error);
        }
      }
    },
    [isSignedIn, api]
  );

  const removeFromCart = useCallback(
    async (productId: string) => {
      setCartItems((prev) => {
        const existing = prev.find((i) => i.id === productId);
        if (!existing) return prev;
        if (existing.quantity <= 1) {
          return prev.filter((i) => i.id !== productId);
        }
        return prev.map((i) =>
          i.id === productId ? { ...i, quantity: i.quantity - 1 } : i
        );
      });

      if (isSignedIn) {
        try {
          await api.delete(`/cart/remove/${productId}`);
        } catch (error) {
          console.warn('Remote cart remove failed (kept in localStorage):', error);
        }
      }
    },
    [isSignedIn, api]
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      if (quantity <= 0) {
        await removeFromCart(productId);
        return;
      }

      setCartItems((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, quantity } : item))
      );

      if (isSignedIn) {
        try {
          await api.patch('/cart/update', { productId, quantity });
        } catch (error) {
          console.warn('Remote quantity update failed:', error);
        }
      }
    },
    [isSignedIn, api, removeFromCart]
  );

  const clearCart = useCallback(
    async (syncRemote = false) => {
      setCartItems([]);
      try {
        localStorage.removeItem(CART_STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear cart from localStorage:', error);
      }

      if (syncRemote && isSignedIn) {
        try {
          await api.delete('/cart/clear');
        } catch (error) {
          console.warn('Remote cart clear failed:', error);
        }
      }
    },
    [isSignedIn, api]
  );

  const totalCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const value = useMemo(
    () => ({
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalCount,
      totalPrice,
      isLoaded,
    }),
    [
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalCount,
      totalPrice,
      isLoaded,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
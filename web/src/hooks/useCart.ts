import { useContext } from 'react';
import { CartContext } from '../context/cartContextInstance';
import type { CartContextType } from '../context/cart.types';

export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
};
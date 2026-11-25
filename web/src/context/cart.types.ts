export const CART_STORAGE_KEY = 'foodify_web_cart';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  vendorId: string;
  vendorName: string;
  quantity: number;
}

export interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: (syncRemote?: boolean) => Promise<void>;
  totalCount: number;
  totalPrice: number;
  isLoaded: boolean;
}

export function readLocalCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to read cart from localStorage:', err);
    return [];
  }
}

export function writeLocalCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('Failed to write cart to localStorage:', err);
  }
}
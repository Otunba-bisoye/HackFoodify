import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

type Order = {
  id: string;
  status: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  items: { quantity: number; name: string }[] | string;
  subtotal: number;
};

type Metrics = {
  todaySales: number; todayOrders: number;
  weeklySales: number; weeklyOrders: number;
  monthlySales: number; monthlyOrders: number;
  availableBalance: number; pendingBalance: number;
  totalOrders: number;
};

type Vendor = { businessName: string; image?: string; isAcceptingOrders: boolean };

type VendorContextType = {
  vendor: Vendor | null;
  metrics: Metrics;
  orders: Order[];
  isInitializing: boolean;
  refreshing: boolean;
  toggleLoading: boolean;
  updatingOrderId: string | null;
  showOnboardingModal: boolean;
  setShowOnboardingModal: (v: boolean) => void;
  onRefresh: () => Promise<void>;
  handleToggleStatus: (accepting: boolean) => Promise<void>;
  handleUpdateOrderStatus: (id: string, status: string) => Promise<void>;
};

const VendorContext = createContext<VendorContextType | undefined>(undefined);

const demoMetrics: Metrics = {
  todaySales: 25000, todayOrders: 5,
  weeklySales: 140000, weeklyOrders: 32,
  monthlySales: 560000, monthlyOrders: 120,
  availableBalance: 80000, pendingBalance: 15000,
  totalOrders: 120,
};

const demoOrders: Order[] = [
  { id: '1', status: 'NEW', orderNumber: '#1001', createdAt: '2:30 PM',
    customerName: 'Ada', items: [{ quantity: 2, name: 'Jollof Rice' }], subtotal: 5000 },
  { id: '2', status: 'PREPARING', orderNumber: '#1002', createdAt: '2:10 PM',
    customerName: 'Tunde', items: [{ quantity: 1, name: 'Suya' }], subtotal: 3000 },
];

export function VendorProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState<Vendor | null>({
    businessName: 'My Store', isAcceptingOrders: true,
  });
  const [orders, setOrders] = useState<Order[]>(demoOrders);
  const [refreshing, setRefreshing] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 500)); // replace with API call
    setRefreshing(false);
  }, []);

  const handleToggleStatus = useCallback(async (accepting: boolean) => {
    setToggleLoading(true);
    await new Promise((r) => setTimeout(r, 300)); // replace with API call
    setVendor((v) => (v ? { ...v, isAcceptingOrders: accepting } : v));
    setToggleLoading(false);
  }, []);

  const handleUpdateOrderStatus = useCallback(async (id: string, status: string) => {
    setUpdatingOrderId(id);
    await new Promise((r) => setTimeout(r, 300)); // replace with API call
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    setUpdatingOrderId(null);
  }, []);

  return (
    <VendorContext.Provider
      value={{
        vendor, metrics: demoMetrics, orders,
        isInitializing: false, refreshing, toggleLoading, updatingOrderId,
        showOnboardingModal, setShowOnboardingModal,
        onRefresh, handleToggleStatus, handleUpdateOrderStatus,
      }}
    >
      {children}
    </VendorContext.Provider>
  );
}

export function useVendor() {
  const ctx = useContext(VendorContext);
  if (!ctx) throw new Error('useVendor must be used inside VendorProvider');
  return ctx;
}
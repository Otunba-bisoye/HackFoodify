// import Navbar from '../../components/Navbar/Navbar'
// import Hero_2 from '../../components/Hero_2/Hero_2'
import './Vendor.css'


import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpCircle, ChevronRight, RefreshCw } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useTabBar } from '@/context/TabBarContext';
import { useVendor } from '@/context/VendorContext';
import { formatCurrency } from '@/lib/formatCurrency';
import { FONTS } from '@/constants/fonts';
import OnboardingModal from '@/modals/OnboardingModal';
// import './VendorHomeScreen.css';

type Timeframe = 'today' | 'weekly' | 'monthly';
type OrderTab = 'NEW' | 'PREPARING' | 'READY';

const TIMEFRAMES: Timeframe[] = ['today', 'weekly', 'monthly'];
const ORDER_TABS: OrderTab[] = ['NEW', 'PREPARING', 'READY'];

const isTabMatch = (status: string, tab: OrderTab) => {
  if (tab === 'NEW') return status === 'NEW' || status === 'PAYMENT_CONFIRMED';
  if (tab === 'PREPARING') return status === 'PREPARING' || status === 'ACCEPTED';
  if (tab === 'READY') return status === 'READY' || status === 'READY_FOR_PICKUP';
  return false;
};

const renderOrderItems = (items: any[] | string) => {
  if (typeof items === 'string') return items;
  return items?.map((i) => `${i.quantity}x ${i.name || i.productName}`).join(', ');
};

export default function VendorHomeScreen() {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const { handleScroll, handleScrollEnd } = useTabBar();

  const {
    vendor,
    metrics,
    orders,
    isInitializing,
    refreshing,
    toggleLoading,
    updatingOrderId,
    showOnboardingModal,
    setShowOnboardingModal,
    onRefresh,
    handleToggleStatus,
    handleUpdateOrderStatus,
  } = useVendor();

  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('today');
  const [activeTab, setActiveTab] = useState<OrderTab>('NEW');

  const handleCloseOnboarding = useCallback(
    () => setShowOnboardingModal(false),
    [setShowOnboardingModal]
  );

  // Theme + font tokens exposed to the stylesheet as CSS variables
  const themeVars = useMemo(
    () =>
      ({
        '--bg': colors.background,
        '--text': colors.text,
        '--text-light': colors.textLight,
        '--primary': colors.primary,
        '--expense': colors.expense,
        '--border': colors.border,
        '--white': colors.white,
        '--font-regular': FONTS.regular,
        '--font-medium': FONTS.medium,
        '--font-semibold': FONTS.semibold,
      }) as React.CSSProperties,
    [colors]
  );

  const timeframeMetrics = useMemo(() => {
    switch (selectedTimeframe) {
      case 'weekly':
        return { sales: metrics.weeklySales, orders: metrics.weeklyOrders };
      case 'monthly':
        return { sales: metrics.monthlySales, orders: metrics.monthlyOrders };
      case 'today':
      default:
        return { sales: metrics.todaySales, orders: metrics.todayOrders };
    }
  }, [selectedTimeframe, metrics]);

  const filteredOrders = useMemo(
    () => orders.filter((o) => isTabMatch(o.status, activeTab)),
    [orders, activeTab]
  );

  if (isInitializing && !vendor) {
    return (
      <div className="vh-root vh-loading" style={themeVars}>
        <span className="vh-spinner vh-spinner-lg" aria-label="Loading" />
      </div>
    );
  }

  const accepting = !!vendor?.isAcceptingOrders;

  return (
    <div className="vh-root" style={themeVars}>
      {/* 1. HEADER */}
      <header className="vh-header">
        <div className="vh-header-left">
          {vendor?.image ? (
            <img src={vendor.image} alt="" className="vh-business-image" />
          ) : (
            <div className="vh-placeholder-avatar">
              {vendor?.businessName?.charAt(0) || 'V'}
            </div>
          )}
          <div className="vh-vendor-text">
            <h1 className="vh-business-name">{vendor?.businessName || 'Business Store'}</h1>
            <span
              className="vh-status-text"
              style={{ color: accepting ? '#10B981' : 'var(--expense)' }}
            >
              {accepting ? 'Accepting Orders' : 'Store Offline'}
            </span>
          </div>
        </div>

        <div className="vh-header-right">
          {toggleLoading ? (
            <span className="vh-spinner" aria-label="Updating status" />
          ) : (
            <button
              type="button"
              role="switch"
              aria-checked={accepting}
              aria-label="Accepting orders"
              className={`vh-switch ${accepting ? 'is-on' : ''}`}
              onClick={() => handleToggleStatus(!accepting)}
            >
              <span className="vh-switch-thumb" />
            </button>
          )}
        </div>
      </header>

      {/* 2. FINANCIAL & METRICS CARD */}
      <section className="vh-metrics-card">
        <div className="vh-wallet-row">
          <div className="vh-wallet-box">
            <div className="vh-wallet-label">Available Balance</div>
            <div className="vh-wallet-value vh-wallet-primary">
              {formatCurrency(metrics.availableBalance || 0)}
            </div>
          </div>
          <div className="vh-wallet-divider" />
          <div className="vh-wallet-box">
            <div className="vh-wallet-label">Pending (In Escrow)</div>
            <div className="vh-wallet-value vh-wallet-pending">
              {formatCurrency(metrics.pendingBalance || 0)}
            </div>
          </div>
        </div>

        <button type="button" className="vh-withdraw-btn" onClick={() => navigate('/withdraw')}>
          <ArrowUpCircle size={18} color="#FFFFFF" />
          <span>Withdraw Funds</span>
        </button>

        <div className="vh-card-divider" />

        <div className="vh-timeframes">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              className={`vh-timeframe-btn ${selectedTimeframe === tf ? 'is-active' : ''}`}
              onClick={() => setSelectedTimeframe(tf)}
            >
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
            </button>
          ))}
        </div>

        <div className="vh-amount">
          <div className="vh-amount-label">{selectedTimeframe.toUpperCase()} SALES REVENUE</div>
          <div className="vh-amount-value">{formatCurrency(timeframeMetrics.sales)}</div>
        </div>

        <div className="vh-total-orders">Total Orders: {metrics.totalOrders}</div>
      </section>

      {/* 3. ACTIVE ORDER PIPELINE */}
      <section className="vh-pipeline">
        <div className="vh-head-row">
          <h2 className="vh-section-title">Active Orders</h2>
          <div className="vh-head-actions">
            <button
              type="button"
              className="vh-icon-btn"
              onClick={() => onRefresh()}
              disabled={refreshing}
              aria-label="Refresh orders"
            >
              <RefreshCw size={16} className={refreshing ? 'vh-spin' : ''} />
            </button>
            <button
              type="button"
              className="vh-transactions-btn"
              onClick={() => navigate('/transactions')}
            >
              <span>Transactions</span>
              <ChevronRight size={16} color="#10B981" />
            </button>
          </div>
        </div>

        <div className="vh-tabs" role="tablist">
          {ORDER_TABS.map((tab) => {
            const count = orders.filter((o) => isTabMatch(o.status, tab)).length;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={`vh-tab-btn ${activeTab === tab ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      </section>

      {/* Scrollable order list (replaces FlatList) */}
      <div className="vh-list" onScroll={handleScroll} onTouchEnd={handleScrollEnd}>
        {filteredOrders.length === 0 ? (
          <div className="vh-empty">No orders in {activeTab} queue</div>
        ) : (
          filteredOrders.map((item) => {
            const isUpdating = updatingOrderId === item.id;
            const isNew = item.status === 'NEW' || item.status === 'PAYMENT_CONFIRMED';
            const isPreparing = item.status === 'PREPARING' || item.status === 'ACCEPTED';
            const isReady = item.status === 'READY' || item.status === 'READY_FOR_PICKUP';

            return (
              <article key={item.id} className="vh-order-card">
                <div className="vh-order-head">
                  <span className="vh-order-number">{item.orderNumber}</span>
                  <span className="vh-order-time">{item.createdAt}</span>
                </div>

                <p className="vh-customer">Customer: {item.customerName}</p>
                <p className="vh-order-items">{renderOrderItems(item.items)}</p>

                <div className="vh-order-footer">
                  <span className="vh-order-price">{formatCurrency(item.subtotal)}</span>

                  {isNew && (
                    <button
                      type="button"
                      className="vh-action-btn vh-accept-btn"
                      disabled={isUpdating}
                      onClick={() => handleUpdateOrderStatus(item.id, 'PREPARING')}
                    >
                      {isUpdating ? <span className="vh-spinner vh-spinner-light" /> : 'Accept Order'}
                    </button>
                  )}

                  {isPreparing && (
                    <button
                      type="button"
                      className="vh-action-btn vh-ready-btn"
                      disabled={isUpdating}
                      onClick={() => handleUpdateOrderStatus(item.id, 'READY_FOR_PICKUP')}
                    >
                      {isUpdating ? <span className="vh-spinner vh-spinner-light" /> : 'Mark Ready'}
                    </button>
                  )}

                  {isReady && <span className="vh-ready-badge">Awaiting Dispatch...</span>}
                </div>
              </article>
            );
          })
        )}
      </div>

      <OnboardingModal isVisible={showOnboardingModal} onComplete={handleCloseOnboarding} />
    </div>
  );
}
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Store,
  Tag,
  X,
  Loader2,
} from 'lucide-react';
import { useApiClient } from '../../hooks/useApiClient';
// import { AuthControls } from '../../components/AuthControl/AuthControl';
import { useCart } from '../../hooks/useCart';
import type { CartItem } from '../../context/cart.types';
import './Cart.css';

interface AppliedCoupon {
  id?: string;
  code: string;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY';
  discountTarget?: 'FOOD' | 'DELIVERY';
  discountValue?: number;
  vendorId?: string | null;
  vendorName?: string | null;
}

const formatNaira = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString('en-NG')}`;

const FALLBACK_DELIVERY_FEE_PER_VENDOR = 1000;

const CartPage: React.FC = () => {
  const api = useApiClient();
  const navigate = useNavigate();

  const {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalCount,
    totalPrice,
    isLoaded,
  } = useCart();

  // Delivery & Coupon Preview State
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [vendorDeliveryFees, setVendorDeliveryFees] = useState<Record<string, number>>({});
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const previewRequestIdRef = useRef(0);

  const uniqueVendorIds = useMemo(() => {
    return Array.from(new Set(cartItems.map((item) => item.vendorId).filter(Boolean)));
  }, [cartItems]);

  const totalDeliveryFee = useMemo(() => {
    if (cartItems.length === 0) return 0;
    if (Object.keys(vendorDeliveryFees).length > 0) {
      return Object.values(vendorDeliveryFees).reduce((acc, fee) => acc + (Number(fee) || 0), 0);
    }
    return Math.max(1, uniqueVendorIds.length) * FALLBACK_DELIVERY_FEE_PER_VENDOR;
  }, [cartItems.length, vendorDeliveryFees, uniqueVendorIds.length]);

  // Financial Breakdown (matches mobile cart logic)
  const isDeliveryDiscount = useMemo(() => {
    return (
      appliedCoupon?.discountTarget === 'DELIVERY' ||
      appliedCoupon?.discountType === 'FREE_DELIVERY'
    );
  }, [appliedCoupon]);

  const foodDiscount = useMemo(() => {
    return !isDeliveryDiscount && appliedCoupon ? discountAmount : 0;
  }, [isDeliveryDiscount, appliedCoupon, discountAmount]);

  const foodTotal = useMemo(() => {
    return Math.max(0, totalPrice - foodDiscount);
  }, [totalPrice, foodDiscount]);

  const deliveryDiscount = useMemo(() => {
    return isDeliveryDiscount ? discountAmount : 0;
  }, [isDeliveryDiscount, discountAmount]);

  const originalDeliveryFee = useMemo(() => {
    return totalDeliveryFee + deliveryDiscount;
  }, [totalDeliveryFee, deliveryDiscount]);

  const grandTotal = useMemo(() => {
    return foodTotal + totalDeliveryFee;
  }, [foodTotal, totalDeliveryFee]);

  const fetchCheckoutPreview = useCallback(
    async (addressOverride?: string, codeToApply?: string | null) => {
      if (cartItems.length === 0) return;

      const requestId = ++previewRequestIdRef.current;
      setIsCalculatingFee(true);
      setCouponError(null);

      const targetCoupon =
        codeToApply !== undefined ? codeToApply : appliedCoupon?.code || null;
      const targetAddress =
        addressOverride !== undefined ? addressOverride : deliveryAddress;

      try {
        const response = await api.post('/order/preview', {
          deliveryAddress: targetAddress.trim() || undefined,
          couponCode: targetCoupon,
          items: cartItems.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            vendorId: item.vendorId,
            price: item.price,
          })),
        });

        if (requestId !== previewRequestIdRef.current) return;

        const data = response?.data?.data ?? response?.data;
        const breakdown = data?.vendorBreakdown;

        if (codeToApply && data?.error) {
          setCouponError(data.error);
          setAppliedCoupon(null);
          setDiscountAmount(0);
          return;
        }

        if (Array.isArray(breakdown) && breakdown.length > 0) {
          const feesMap: Record<string, number> = {};
          breakdown.forEach((entry: { vendorId: string; deliveryFee: number }) => {
            if (entry.vendorId) {
              feesMap[entry.vendorId] = Number(entry.deliveryFee) || 0;
            }
          });
          setVendorDeliveryFees(feesMap);
        } else if (typeof data?.deliveryFee === 'number') {
          const firstVendor = uniqueVendorIds[0] || 'default';
          setVendorDeliveryFees({ [firstVendor]: Number(data.deliveryFee) || 0 });
        }

        if (data?.appliedCoupon) {
          setAppliedCoupon(data.appliedCoupon);
          setDiscountAmount(Number(data.discountAmount) || 0);
        } else if (targetCoupon === null) {
          setAppliedCoupon(null);
          setDiscountAmount(0);
        }
      } catch (err: unknown) {
        if (requestId !== previewRequestIdRef.current) return;
        const serverMsg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message;
        if (codeToApply) {
          setCouponError(serverMsg || 'Could not apply coupon code.');
          setAppliedCoupon(null);
          setDiscountAmount(0);
        }
      } finally {
        if (requestId === previewRequestIdRef.current) {
          setIsCalculatingFee(false);
          setIsApplyingCoupon(false);
        }
      }
    },
    [api, appliedCoupon?.code, cartItems, deliveryAddress, uniqueVendorIds]
  );

  useEffect(() => {
    if (!isLoaded || cartItems.length === 0) return;

    const timer = setTimeout(() => {
      void fetchCheckoutPreview(deliveryAddress, appliedCoupon?.code);
    }, 300);

    return () => clearTimeout(timer);
  }, [isLoaded, cartItems, totalPrice, deliveryAddress, appliedCoupon?.code, fetchCheckoutPreview]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a promo code.');
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError(null);
    await fetchCheckoutPreview(deliveryAddress, code);
  };

  const handleRemoveCoupon = async () => {
    setCouponCodeInput('');
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponError(null);
    await fetchCheckoutPreview(deliveryAddress, null);
  };

  const handleIncrement = async (item: CartItem) => {
    await addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      vendorId: item.vendorId,
      vendorName: item.vendorName,
    });
  };

  const handleDecrement = async (item: CartItem) => {
    await removeFromCart(item.id);
  };

  const handleRemoveLineItem = async (productId: string) => {
    await updateQuantity(productId, 0);
  };

  const handleClearCart = async () => {
    setIsClearing(true);
    try {
      await clearCart(true);
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponError(null);
      setVendorDeliveryFees({});
    } finally {
      setIsClearing(false);
    }
  };

  const handleProceedToCheckout = () => {
    navigate('/checkout', {
      state: {
        deliveryAddress: deliveryAddress.trim(),
        phone: phone.trim(),
        vendorDeliveryFees,
        deliveryFee: totalDeliveryFee,
        foodSubtotal: totalPrice,
        foodDiscount,
        deliveryDiscount,
        discountAmount,
        appliedCoupon,
        grandTotal,
      },
    });
  };

  return (
    <div className="cart-page">
      <header className="cart-topbar">
        <div className="cart-topbar-inner">
          <Link to="/discover" className="cart-back-link">
            <ArrowLeft size={18} />
            <span>Back to Discover</span>
          </Link>

          {/* <AuthControls redirectUrl="/cart" /> */}
        </div>
      </header>

      <main className="cart-main">
        <div className="cart-header">
          <div>
            <h1>Your Cart ({totalCount})</h1>
            <p>Review items, apply promo codes, and estimate delivery before checkout.</p>
          </div>

          {cartItems.length > 0 && (
            <button
              type="button"
              className="cart-clear-btn"
              onClick={handleClearCart}
              disabled={isClearing}
            >
              <Trash2 size={16} />
              <span>{isClearing ? 'Clearing...' : 'Clear Cart'}</span>
            </button>
          )}
        </div>

        {!isLoaded ? (
          <div className="cart-empty-card">
            <p>Loading your cart...</p>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="cart-empty-card">
            <ShoppingBag size={36} />
            <h3>Your cart is currently empty</h3>
            <p>Add dishes from any vendor on Discover to see them here.</p>
            <Link to="/discover" className="cart-discover-link">
              Browse vendors
            </Link>
          </div>
        ) : (
          <div className="cart-content-grid">
            <div className="cart-left-column">
              {/* Cart Items */}
              <section className="cart-items-list" aria-label="Cart items">
                {cartItems.map((item) => (
                  <article key={item.id} className="cart-item-card">
                    <div className="cart-item-media">
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <div className="cart-item-placeholder">
                          <ShoppingBag size={20} />
                        </div>
                      )}
                    </div>

                    <div className="cart-item-details">
                      <h3>{item.name}</h3>
                      <span className="cart-item-vendor">
                        <Store size={13} />
                        {item.vendorName}
                      </span>
                      <p className="cart-item-unit-price">
                        {formatNaira(item.price)} each
                      </p>
                    </div>

                    <div className="cart-item-actions">
                      <div className="cart-qty-stepper">
                        <button
                          type="button"
                          onClick={() => handleDecrement(item)}
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleIncrement(item)}
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <strong className="cart-item-line-total">
                        {formatNaira(item.price * item.quantity)}
                      </strong>

                      <button
                        type="button"
                        className="cart-remove-item-btn"
                        onClick={() => handleRemoveLineItem(item.id)}
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </section>

              {/* Delivery Area & Contact Preview */}
              <section className="cart-panel-card" aria-label="Delivery estimate details">
                <h2>Delivery Estimate Details</h2>
                <div className="cart-form-row">
                  <div className="cart-input-group">
                    <label htmlFor="cartDeliveryAddress">Delivery Address / Area</label>
                    <input
                      id="cartDeliveryAddress"
                      type="text"
                      placeholder="e.g. Bode Olude, Abeokuta"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                  </div>
                  <div className="cart-input-group">
                    <label htmlFor="cartPhone">Phone Number</label>
                    <input
                      id="cartPhone"
                      type="tel"
                      placeholder="08012345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              {/* Promo Code Section */}
              <section className="cart-panel-card" aria-label="Promo code">
                <h2>Promo Code</h2>

                {appliedCoupon ? (
                  <div className="cart-applied-coupon">
                    <div className="cart-coupon-info">
                      <Tag size={18} />
                      <div>
                        <strong>{appliedCoupon.code}</strong>
                        <span>Discount: -{formatNaira(discountAmount)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cart-remove-coupon-btn"
                      onClick={handleRemoveCoupon}
                      aria-label="Remove coupon"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <form className="cart-coupon-form" onSubmit={handleApplyCoupon}>
                    <div className="cart-coupon-row">
                      <input
                        type="text"
                        placeholder="Enter promo code"
                        value={couponCodeInput}
                        onChange={(e) => {
                          setCouponCodeInput(e.target.value.toUpperCase());
                          if (couponError) setCouponError(null);
                        }}
                      />
                      <button
                        type="submit"
                        className="cart-apply-coupon-btn"
                        disabled={isApplyingCoupon}
                      >
                        {isApplyingCoupon ? (
                          <Loader2 size={16} className="cart-spin" />
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>
                    {couponError && <p className="cart-coupon-error">{couponError}</p>}
                  </form>
                )}
              </section>
            </div>

            {/* Itemized Summary Card */}
            <aside className="cart-summary-card" aria-label="Order summary">
              <h2>Summary</h2>

              <div className="cart-summary-row">
                <span>Food Subtotal</span>
                <span>{formatNaira(totalPrice)}</span>
              </div>

              {foodDiscount > 0 && (
                <div className="cart-summary-row discount">
                  <span>Food Discount</span>
                  <span>-{formatNaira(foodDiscount)}</span>
                </div>
              )}

              <div className="cart-summary-row subtotal">
                <span>Food Total</span>
                <span>{formatNaira(foodTotal)}</span>
              </div>

              <div className="cart-summary-divider" />

              <div className="cart-summary-row">
                <span>Estimated Delivery Fee</span>
                {isCalculatingFee ? (
                  <Loader2 size={15} className="cart-spin" />
                ) : (
                  <span>{formatNaira(originalDeliveryFee)}</span>
                )}
              </div>

              {deliveryDiscount > 0 && (
                <div className="cart-summary-row discount">
                  <span>Delivery Discount</span>
                  <span>-{formatNaira(deliveryDiscount)}</span>
                </div>
              )}

              <div className="cart-summary-row subtotal">
                <span>Delivery Total</span>
                <span className={totalDeliveryFee === 0 ? 'free-badge' : ''}>
                  {totalDeliveryFee === 0 ? 'FREE' : formatNaira(totalDeliveryFee)}
                </span>
              </div>

              <div className="cart-summary-divider" />

              <div className="cart-summary-row total">
                <span>Grand Total</span>
                <strong>{formatNaira(grandTotal)}</strong>
              </div>

              <button
                type="button"
                className="cart-checkout-btn"
                onClick={handleProceedToCheckout}
                disabled={isCalculatingFee}
              >
                Proceed to Checkout · {formatNaira(grandTotal)}
              </button>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default CartPage;
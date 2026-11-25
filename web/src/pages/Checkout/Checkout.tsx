import React, { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  MapPin,
  Phone,
  Edit2,
  Tag,
  ShieldCheck,
  Sparkles,
  Lock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { useApiClient } from '../../hooks/useApiClient';
// import { AuthControls } from '../../components/AuthControl/AuthControl';
import './Checkout.css';

interface CheckoutLocationState {
  deliveryAddress?: string;
  phone?: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  vendorDeliveryFees?: Record<string, number>;
  deliveryFee?: number;
  foodSubtotal?: number;
  foodDiscount?: number;
  deliveryDiscount?: number;
  discountAmount?: number;
  appliedCoupon?: {
    id?: string;
    code: string;
    discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY';
    discountTarget?: 'FOOD' | 'DELIVERY';
    discountValue?: number;
    vendorId?: string | null;
    vendorName?: string | null;
  } | null;
  grandTotal?: number;
}

const formatNaira = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString('en-NG')}`;

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const api = useApiClient();
  const { cartItems, totalPrice, clearCart } = useCart();

  const state = (location.state as CheckoutLocationState | null) || {};

  const deliveryAddress = state.deliveryAddress || '';
  const phone = state.phone || '';
  const deliveryLat = state.deliveryLat ?? null;
  const deliveryLng = state.deliveryLng ?? null;

  const appliedCouponCode = state.appliedCoupon?.code || '';
  const discountAmount = Number(state.discountAmount ?? 0);
  const discountTarget = state.appliedCoupon?.discountTarget || '';
  const discountType = state.appliedCoupon?.discountType || '';
  const couponVendorId = state.appliedCoupon?.vendorId || '';

  const vendorDeliveryFees = useMemo<Record<string, number>>(() => {
    if (state.vendorDeliveryFees && Object.keys(state.vendorDeliveryFees).length > 0) {
      return state.vendorDeliveryFees;
    }
    if (typeof state.deliveryFee === 'number' && cartItems.length > 0) {
      const firstVendorId = cartItems[0].vendorId || 'default';
      return { [firstVendorId]: state.deliveryFee };
    }
    return {};
  }, [state.vendorDeliveryFees, state.deliveryFee, cartItems]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // DERIVED VALUES & FINANCIAL BREAKDOWN
  // ---------------------------------------------------------------------------
  const groupedCart = useMemo(() => {
    const map = new Map<
      string,
      { vendorId: string; vendorName: string; items: typeof cartItems; subtotal: number }
    >();

    cartItems.forEach((item) => {
      const vId = item.vendorId || 'default';
      if (!map.has(vId)) {
        map.set(vId, {
          vendorId: vId,
          vendorName: item.vendorName || 'Vendor',
          items: [],
          subtotal: 0,
        });
      }
      const group = map.get(vId)!;
      group.items.push(item);
      group.subtotal += item.price * item.quantity;
    });

    return Array.from(map.values());
  }, [cartItems]);

  const isDeliveryDiscount = useMemo(() => {
    return discountTarget === 'DELIVERY' || discountType === 'FREE_DELIVERY';
  }, [discountTarget, discountType]);

  const totalFoodDiscount = useMemo(() => {
    return !isDeliveryDiscount && discountAmount > 0 ? discountAmount : 0;
  }, [isDeliveryDiscount, discountAmount]);

  const foodTotal = useMemo(() => {
    return Math.max(0, totalPrice - totalFoodDiscount);
  }, [totalPrice, totalFoodDiscount]);

  const totalDeliveryDiscount = useMemo(() => {
    return isDeliveryDiscount && discountAmount > 0 ? discountAmount : 0;
  }, [isDeliveryDiscount, discountAmount]);

  const postDiscountTotalDeliveryFee = useMemo(() => {
    return Object.values(vendorDeliveryFees).reduce(
      (acc, fee) => acc + (Number(fee) || 0),
      0
    );
  }, [vendorDeliveryFees]);

  const rawTotalDeliveryFee = useMemo(() => {
    return postDiscountTotalDeliveryFee + totalDeliveryDiscount;
  }, [postDiscountTotalDeliveryFee, totalDeliveryDiscount]);

  const grandTotal = useMemo(() => {
    return Math.max(0, foodTotal + postDiscountTotalDeliveryFee);
  }, [foodTotal, postDiscountTotalDeliveryFee]);

  const verifyPaymentStatus = async (transactionId: string) => {
    try {
      const verifyRes = await api.get(`/order/payment/verify/${transactionId}`);
      if (verifyRes.data?.paid || verifyRes.data?.success) {
        await clearCart(true);
        navigate('/orders', { replace: true });
      }
    } catch (error) {
      console.log('Verification background check error:', error);
    }
  };

  const handleProceedToPayment = async () => {
    setErrorMsg(null);

    if (!deliveryAddress.trim() || !phone.trim()) {
      setErrorMsg('Please go back to Cart and provide both a delivery address and phone number.');
      return;
    }

    if (cartItems.length === 0) {
      setErrorMsg('Your cart is empty.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        deliveryAddress: deliveryAddress.trim(),
        phone: phone.trim(),
        deliveryLat,
        deliveryLng,
        couponCode: appliedCouponCode || undefined,
      };

      const response = await api.post('/order/checkout', payload);

      if (response.data?.success && response.data?.checkoutUrl) {
        const { checkoutUrl, transactionId } = response.data;
        if (transactionId) {
          sessionStorage.setItem('foodify_pending_tx', String(transactionId));
        }
        window.location.href = checkoutUrl;
        return;
      }

      if (response.data?.success && response.data?.transactionId) {
        await verifyPaymentStatus(response.data.transactionId);
      } else if (response.data?.success) {
        await clearCart(true);
        navigate('/orders', { replace: true });
      } else {
        setErrorMsg(response.data?.message || 'Unable to initialize checkout.');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Checkout failed. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkout-page">
      <header className="checkout-topbar">
        <div className="checkout-topbar-inner">
          <button
            type="button"
            className="checkout-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
            <span>Back</span>
          </button>

          <span className="checkout-header-title">Checkout</span>

          <AuthControls redirectUrl="/checkout" />
        </div>
      </header>

      <main className="checkout-main">
        {errorMsg && (
          <div className="checkout-alert-error" role="alert">
            <AlertCircle size={17} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="checkout-layout">
          {/* LEFT COLUMN: Delivery, Vendor Breakdown, Payment Method */}
          <div className="checkout-left-col">
            <section className="checkout-card">
              <div className="checkout-card-header">
                <h2>Delivery Information</h2>
                <button
                  type="button"
                  className="checkout-edit-btn"
                  onClick={() => navigate(-1)}
                >
                  <Edit2 size={14} />
                  <span>Edit</span>
                </button>
              </div>

              <div className="checkout-info-row">
                <MapPin size={18} className="checkout-info-icon" />
                <p className="checkout-info-text">
                  {deliveryAddress || 'No address provided'}
                </p>
              </div>

              <div className="checkout-info-row">
                <Phone size={16} className="checkout-info-icon" />
                <p className="checkout-info-text">{phone || 'No phone number'}</p>
              </div>
            </section>

            <section className="checkout-card">
              <h2>Order Summary</h2>

              {groupedCart.map((group, idx) => {
                const vSubtotal = group.subtotal;

                const isMatch = Boolean(
                  !isDeliveryDiscount &&
                    discountAmount > 0 &&
                    couponVendorId &&
                    group.vendorId === couponVendorId
                );

                const vFoodDiscount = isMatch ? discountAmount : 0;
                const vFoodTotal = Math.max(0, vSubtotal - vFoodDiscount);

                const vPostDiscountFee = Number(vendorDeliveryFees[group.vendorId] || 0);
                const vDeliveryDiscount =
                  isDeliveryDiscount && postDiscountTotalDeliveryFee > 0
                    ? (vPostDiscountFee / postDiscountTotalDeliveryFee) * totalDeliveryDiscount
                    : 0;
                const vRawFee = vPostDiscountFee + vDeliveryDiscount;
                const vendorTotal = vFoodTotal + vPostDiscountFee;

                return (
                  <div key={group.vendorId || idx} className="checkout-vendor-block">
                    <h3 className="checkout-vendor-name">{group.vendorName}</h3>

                    {group.items.map((item) => (
                      <div key={item.id} className="checkout-item-row">
                        <span className="checkout-item-name">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="checkout-item-price">
                          {formatNaira(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}

                    <div className="checkout-meta-row">
                      <span>Food Subtotal</span>
                      <strong>{formatNaira(vSubtotal)}</strong>
                    </div>

                    {vFoodDiscount > 0 && (
                      <div className="checkout-meta-row discount">
                        <span>Food Discount</span>
                        <strong>-{formatNaira(vFoodDiscount)}</strong>
                      </div>
                    )}

                    <div className="checkout-meta-row">
                      <span>Food Total</span>
                      <strong>{formatNaira(vFoodTotal)}</strong>
                    </div>

                    <div className="checkout-meta-row">
                      <span>Estimated Delivery Fee</span>
                      <strong>{formatNaira(vRawFee)}</strong>
                    </div>

                    {vDeliveryDiscount > 0 && (
                      <div className="checkout-meta-row discount">
                        <span>Delivery Discount</span>
                        <strong>-{formatNaira(vDeliveryDiscount)}</strong>
                      </div>
                    )}

                    <div className="checkout-meta-row">
                      <span>Delivery Total</span>
                      <strong>
                        {vPostDiscountFee === 0 ? 'FREE' : formatNaira(vPostDiscountFee)}
                      </strong>
                    </div>

                    <div className="checkout-meta-row vendor-total">
                      <span>Vendor Total</span>
                      <strong>{formatNaira(vendorTotal)}</strong>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="checkout-card">
              <h2>Payment Method</h2>

              <div className="checkout-payment-badge">
                <ShieldCheck size={20} className="checkout-shield-icon" />
                <div>
                  <strong>Squad by GTCO</strong>
                  <span>Pay seamlessly via Card, Bank Transfer, or USSD</span>
                </div>
              </div>

              <div className="checkout-fee-note">
                <Sparkles size={14} />
                <span>Powered by Nigeria’s lowest 1% gateway rate—no hidden charges.</span>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Sticky Promo, Bill Breakdown & Pay Action */}
          <aside className="checkout-right-col" aria-label="Payment summary">
            {appliedCouponCode && (
              <section className="checkout-card">
                <h2>Applied Promo</h2>
                <div className="checkout-applied-coupon">
                  <Tag size={18} className="checkout-coupon-icon" />
                  <div>
                    <strong>{appliedCouponCode}</strong>
                    <span>Discount: -{formatNaira(discountAmount)}</span>
                  </div>
                </div>
              </section>
            )}

            <section className="checkout-card">
              <h2>Payment Details</h2>

              <div className="checkout-bill-row">
                <span>Food Subtotal</span>
                <span>{formatNaira(totalPrice)}</span>
              </div>

              {totalFoodDiscount > 0 && (
                <div className="checkout-bill-row discount">
                  <span>Food Discount</span>
                  <span>-{formatNaira(totalFoodDiscount)}</span>
                </div>
              )}

              <div className="checkout-bill-row">
                <span>Food Total</span>
                <span>{formatNaira(foodTotal)}</span>
              </div>

              <div className="checkout-divider" />

              <div className="checkout-bill-row">
                <span>
                  Estimated Delivery Fee ({groupedCart.length} Vendor
                  {groupedCart.length > 1 ? 's' : ''})
                </span>
                <span>{formatNaira(rawTotalDeliveryFee)}</span>
              </div>

              {totalDeliveryDiscount > 0 && (
                <div className="checkout-bill-row discount">
                  <span>Delivery Discount</span>
                  <span>-{formatNaira(totalDeliveryDiscount)}</span>
                </div>
              )}

              <div className="checkout-bill-row">
                <span>Total Delivery Fee</span>
                <span>
                  {postDiscountTotalDeliveryFee === 0
                    ? 'FREE'
                    : formatNaira(postDiscountTotalDeliveryFee)}
                </span>
              </div>

              <div className="checkout-bill-row grand-total">
                <span>Grand Total</span>
                <strong>{formatNaira(grandTotal)}</strong>
              </div>
            </section>

            <div className="checkout-bottom-bar">
              <div className="checkout-total-row">
                <span className="checkout-total-label">Grand Total</span>
                <strong className="checkout-total-price">{formatNaira(grandTotal)}</strong>
              </div>

              <button
                type="button"
                className="checkout-pay-btn"
                onClick={handleProceedToPayment}
                disabled={isSubmitting || cartItems.length === 0}
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="checkout-spin" />
                ) : (
                  <>
                    <span>Proceed to Pay</span>
                    <Lock size={16} />
                  </>
                )}
              </button>
            </div>

            <div className="checkout-footer-nav">
              <Link to="/cart">Return to Cart</Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default CheckoutPage;
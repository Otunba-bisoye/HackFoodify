import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  X,
  ShoppingBag,
  ChevronRight,
  Store,
  AlertCircle,
  Sparkles,
  Plus,
  Minus,
  ArrowLeft,
  Clock,
  Star,
  ShoppingCart,
} from 'lucide-react';
import {
  fetchExploreVendors,
  searchCatalogProducts,
  groupProductsByVendor,
  type WebVendor,
  type WebProduct,
} from '../../services/catalogApi';
import './Discover.css';
import { assets } from '../../assets/assets';
import { useCart } from '../../hooks/useCart';
import type { CartItem } from '../../context/cart.types';

interface ToastMessage {
  id: string;
  text: string;
  type: 'add' | 'remove';
}

const formatNaira = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString('en-NG')}`;

const getGreetingDetails = (hasCategory: boolean, query: string) => {
  if (query.trim()) {
    return {
      title: `Results for "${query.trim()}"`,
      subtitle: 'Matching vendors and dishes ready to order',
    };
  }
  if (hasCategory) {
    return {
      title: 'Craving Something Good?',
      subtitle: 'Handpicked spots serving your selected category',
    };
  }

  const hour = new Date().getHours();
  if (hour < 11) {
    return {
      title: 'Start Your Day Right',
      subtitle: 'Fresh breakfast hits to fuel your morning',
    };
  }
  if (hour < 16) {
    return {
      title: 'You Earned a Serious Lunch',
      subtitle: 'Beat the midday slump with something legendary',
    };
  }
  if (hour < 21) {
    return {
      title: 'Dinner Served. Zero Dishes.',
      subtitle: 'Unwind with the best meals in Abeokuta tonight',
    };
  }
  return {
    title: 'Local Gems Near You',
    subtitle: 'The neighborhood favorites everyone’s ordering',
  };
};

export const DiscoverPage: React.FC = () => {
  const {
    cartItems,
    addToCart,
    removeFromCart,
    totalCount: totalCartCount,
    totalPrice: totalCartAmount,
  } = useCart();

  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
  const trimmedQuery = searchQuery.trim();

  // Catalog & Search State
  const [vendors, setVendors] = useState<WebVendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchState, setSearchState] = useState<{
    query: string;
    results: WebProduct[];
  } | null>(null);

  const isSearchActive = trimmedQuery.length > 0;
  const isSearchLoading = isSearchActive && searchState?.query !== trimmedQuery;
  const searchResults =
    isSearchActive && searchState?.query === trimmedQuery
      ? searchState.results
      : null;

  // Cart Drawer & Toast State
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'add' | 'remove') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  }, []);

  // Map cartItems by product id for O(1) quantity lookups
  const cartByProductId = useMemo(() => {
    const map = new Map<string, CartItem>();
    for (const item of cartItems) {
      map.set(item.id, item);
    }
    return map;
  }, [cartItems]);

  // 1. Fetch explore vendors on mount or manual retry
  useEffect(() => {
    let ignore = false;

    const fetchVendors = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchExploreVendors();
        if (!ignore) {
          setVendors(data);
        }
      } catch (err) {
        console.error('Failed to fetch explore vendors:', err);
        if (!ignore) {
          setError('Failed to load vendors. Check your connection and try again.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchVendors();

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // 2. Debounced search against /product/search
  useEffect(() => {
    if (!trimmedQuery) return;

    let ignore = false;

    const timer = setTimeout(async () => {
      try {
        const products = await searchCatalogProducts(trimmedQuery);
        if (!ignore) {
          setSearchState({ query: trimmedQuery, results: products });
        }
      } catch (err) {
        console.error('Product search failed:', err);
        if (!ignore) {
          setSearchState({ query: trimmedQuery, results: [] });
        }
      }
    }, 350);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery]);

  // Update input & sync URL param
  const handleSearchChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value.trim()) {
      next.set('q', value);
    } else {
      next.delete('q');
    }
    setSearchParams(next, { replace: true });
  };

  // Derive unique categories dynamically from loaded vendors/products
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    vendors.forEach((v) => {
      if (v.category) map.set(v.category, v.category);
      (v.products || []).forEach((p) => {
        if (typeof p.category === 'string' && p.category) {
          map.set(p.category, p.category);
        } else if (p.category && typeof p.category === 'object' && p.category.id) {
          map.set(p.category.id, p.category.name || p.category.id);
        } else if (p.categoryId) {
          map.set(p.categoryId, p.categoryId);
        }
      });
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [vendors]);

  // Group search results by vendor, with client-side fallback if user searched a vendor/area name
  const groupedSearchResults = useMemo(() => {
    if (searchResults === null) return [];

    const apiGrouped = groupProductsByVendor(searchResults);
    if (apiGrouped.length > 0) return apiGrouped;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return vendors.filter(
      (v) =>
        v.businessName?.toLowerCase().includes(q) ||
        v.category?.toLowerCase().includes(q)
    );
  }, [searchResults, searchQuery, vendors]);

  // Filter vendors by selected category
  const categoryFilteredVendors = useMemo(() => {
    if (selectedCategory === 'all') return null;

    return vendors
      .map((vendor) => {
        const matchingProducts = (vendor.products || []).filter((p) => {
          const catId =
            typeof p.category === 'object' ? p.category?.id : p.category;
          return (
            p.categoryId === selectedCategory ||
            catId === selectedCategory ||
            vendor.category === selectedCategory
          );
        });

        if (matchingProducts.length === 0) return null;
        return { ...vendor, products: matchingProducts };
      })
      .filter((v): v is WebVendor => v !== null);
  }, [vendors, selectedCategory]);

  const isCategoryActive = !isSearchActive && selectedCategory !== 'all';

  const activeVendors = isSearchActive
    ? groupedSearchResults
    : isCategoryActive
    ? categoryFilteredVendors || []
    : vendors;

  // Cart Actions wired to CartContext
  const handleAddToCart = useCallback(
    async (product: WebProduct, vendor: WebVendor) => {
      const productImage =
        (product as { image?: string }).image ||
        (product.images && product.images[0]) ||
        undefined;

      await addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: productImage,
        vendorId: vendor.id,
        vendorName:
          vendor.businessName ||
          (vendor as { name?: string }).name ||
          'Vendor',
      });
      showToast(`+1 ${product.name}`, 'add');
    },
    [addToCart, showToast]
  );

  const handleDecrementCart = useCallback(
    async (productId: string, productName: string) => {
      await removeFromCart(productId);
      showToast(`-1 ${productName}`, 'remove');
    },
    [removeFromCart, showToast]
  );

  const headerDetails = getGreetingDetails(
    selectedCategory !== 'all',
    searchQuery
  );

  return (
    <div className="discover-page">
      {/* Top Sticky Header */}
      <header className="discover-topbar">
        <div className="discover-topbar-inner">
          <Link to="/" className="discover-brand-link">
            <ArrowLeft size={18} />
            <img src={assets.foodify_large} alt="" className="logo" />
          </Link>

          {/* Search Pill */}
          <div className="discover-search-pill">
            <Search size={18} className="discover-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search foods, groceries, shops, or areas..."
              aria-label="Search foods, groceries, shops, or areas"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                className="discover-clear-btn"
                onClick={() => handleSearchChange('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Bag Button */}
          <button
            type="button"
            className="discover-bag-btn"
            onClick={() => setIsCartOpen(true)}
            aria-label="Open bag"
          >
            <ShoppingCart size={18} />
            <span>Cart</span>
            {totalCartCount > 0 && (
              <span className="discover-bag-badge">{totalCartCount}</span>
            )}
          </button>
        </div>
      </header>

      <main className="discover-main">
        {/* Category Filter Strip */}
        {categories.length > 0 && (
          <div className="discover-categories" role="tablist" aria-label="Categories">
            <button
              type="button"
              className={`discover-cat-chip ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All Spots
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`discover-cat-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Section Heading */}
        <div className="discover-feed-header">
          <div>
            <h1>{headerDetails.title}</h1>
            <p>{headerDetails.subtitle}</p>
          </div>
          {isSearchActive && !isSearchLoading && (
            <span className="discover-result-count">
              {activeVendors.length}{' '}
              {activeVendors.length === 1 ? 'vendor' : 'vendors'} found
            </span>
          )}
        </div>

        {/* Loading State */}
        {(loading && !isSearchActive) || (isSearchActive && isSearchLoading) ? (
          <div className="discover-state-box">
            <div className="discover-spinner" />
            <p>
              {isSearchActive
                ? `Searching for "${searchQuery.trim()}"...`
                : 'Fetching available vendors...'}
            </p>
          </div>
        ) : error && !isSearchActive && vendors.length === 0 ? (
          <div className="discover-state-box error">
            <AlertCircle size={32} />
            <h3>Couldn’t load vendors</h3>
            <p>{error}</p>
            <button
              type="button"
              className="discover-primary-btn"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Try again
            </button>
          </div>
        ) : activeVendors.length === 0 ? (
          <div className="discover-state-box">
            <Store size={36} />
            <h3>
              {isSearchActive
                ? 'No products or shops found'
                : 'No vendors available in this category yet'}
            </h3>
            <p>Try searching for another meal or reset your active filters.</p>
            {(isSearchActive || isCategoryActive) && (
              <button
                type="button"
                className="discover-primary-btn"
                onClick={() => {
                  handleSearchChange('');
                  setSelectedCategory('all');
                }}
              >
                Show all vendors
              </button>
            )}
          </div>
        ) : (
          <div className="discover-vendor-list">
            {activeVendors.map((vendor) => {
              const availableProducts = (vendor.products || []).filter(
                (p) => p.isAvailable !== false
              );

              return (
                <section key={vendor.id} className="discover-vendor-section">
                  <div className="discover-vendor-header">
                    <div className="discover-vendor-identity">
                      {vendor.image ? (
                        <img
                          src={vendor.image}
                          alt={vendor.businessName}
                          className="discover-vendor-logo"
                        />
                      ) : (
                        <div className="discover-vendor-logo-placeholder">
                          <Store size={18} />
                        </div>
                      )}

                      <div>
                        <h2>{vendor.businessName}</h2>
                        <div className="discover-vendor-meta">
                          {vendor.category && <span>{vendor.category}</span>}
                          {typeof vendor.rating === 'number' && (
                            <span>
                              <Star size={13} /> {vendor.rating.toFixed(1)}
                            </span>
                          )}
                          {vendor.deliveryTime && (
                            <span>
                              <Clock size={13} /> {vendor.deliveryTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/vendor/${vendor.id}`}
                      className="discover-see-all-btn"
                    >
                      <span>Menu</span>
                      <ChevronRight size={15} />
                    </Link>
                  </div>

                  {availableProducts.length > 0 ? (
                    <div className="discover-product-grid">
                      {availableProducts.map((product) => {
                        const qty = cartByProductId.get(product.id)?.quantity || 0;

                        return (
                          <article
                            key={product.id}
                            className="discover-product-card"
                          >
                            <div className="discover-product-thumb">
                              {product.images && product.images.length > 0 ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  loading="lazy"
                                />
                              ) : (
                                <div className="discover-product-thumb-fallback">
                                  <Sparkles size={20} />
                                </div>
                              )}
                            </div>

                            <div className="discover-product-body">
                              <h3 title={product.name}>{product.name}</h3>
                              <p>{product.description || 'Freshly prepared to order'}</p>

                              <div className="discover-product-footer">
                                <span className="discover-product-price">
                                  {formatNaira(product.price)}
                                </span>

                                {qty === 0 ? (
                                  <button
                                    type="button"
                                    className="discover-add-btn"
                                    onClick={() => handleAddToCart(product, vendor)}
                                  >
                                    <Plus size={15} />
                                    <span>Add</span>
                                  </button>
                                ) : (
                                  <div className="discover-qty-stepper">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDecrementCart(product.id, product.name)
                                      }
                                      aria-label={`Remove one ${product.name}`}
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <span>{qty}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleAddToCart(product, vendor)}
                                      aria-label={`Add one more ${product.name}`}
                                    >
                                      <Plus size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="discover-no-items">No items available right now.</p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Slide-Over Bag Drawer */}
      {isCartOpen && (
        <div
          className="discover-drawer-backdrop"
          onClick={() => setIsCartOpen(false)}
        >
          <aside
            className="discover-drawer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Your order bag"
          >
            <div className="discover-drawer-header">
              <h2>Your Bag ({totalCartCount})</h2>
              <button
                type="button"
                className="discover-clear-btn"
                onClick={() => setIsCartOpen(false)}
                aria-label="Close bag"
              >
                <X size={18} />
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="discover-drawer-empty">
                <ShoppingBag size={36} />
                <p>Your bag is empty</p>
                <span>Add meals from any vendor to start an order.</span>
              </div>
            ) : (
              <>
                <div className="discover-drawer-items">
                  {cartItems.map((item) => (
                    <div key={item.id} className="discover-drawer-item">
                      <div>
                        <h4>{item.name}</h4>
                        <span className="discover-drawer-vendor">
                          {item.vendorName}
                        </span>
                        <p>{formatNaira(item.price * item.quantity)}</p>
                      </div>
                      <div className="discover-qty-stepper">
                        <button
                          type="button"
                          onClick={() =>
                            handleDecrementCart(item.id, item.name)
                          }
                        >
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleAddToCart(
                              {
                                id: item.id,
                                name: item.name,
                                price: item.price,
                                images: item.image ? [item.image] : [],
                              } as WebProduct,
                              {
                                id: item.vendorId,
                                businessName: item.vendorName,
                              } as WebVendor
                            )
                          }
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="discover-drawer-footer">
                  <div className="discover-drawer-subtotal">
                    <span>Subtotal</span>
                    <strong>{formatNaira(totalCartAmount)}</strong>
                  </div>
                  <Link
                    to="/cart"
                    className="discover-checkout-btn"
                    onClick={() => setIsCartOpen(false)}
                  >
                    Proceed to Checkout
                  </Link>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* Floating Cart Toasts */}
      <div className="discover-toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`discover-toast ${t.type}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiscoverPage;
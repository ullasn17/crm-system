'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Printer,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  RefreshCw,
  Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  taxRate: number;
  discountPercent: number;
  stockQuantity: number;
}

export default function BillingPOSPage() {
  const { user, activeStoreId } = useAuth();

  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online'>('Cash');
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);

  // Stripe Payment Gateway States
  const [stripeRedirecting, setStripeRedirecting] = useState(false);
  const [cartRestoredNotice, setCartRestoredNotice] = useState('');

  const [processing, setProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [error, setError] = useState('');

  // Fetch products with stock
  const loadProducts = () => {
    let url = '/api/products';
    if (activeStoreId) url += `?storeId=${activeStoreId}`;
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setProducts(json.data.products || []);
      })
      .catch(console.error);
  };

  // Fetch customers
  const loadCustomers = () => {
    let url = '/api/customers';
    if (activeStoreId) url += `?storeId=${activeStoreId}`;
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCustomers(json.data.customers || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, [activeStoreId]);

  // Cart operations
  const addToCart = (product: any) => {
    setError('');
    const existingIndex = cart.findIndex((i) => i.productId === product._id);
    const availableStock = product.stockQuantity ?? 100;

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > availableStock) {
        setError(`Cannot exceed available stock (${availableStock}) for ${product.name}`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      if (availableStock < 1) {
        setError(`Product "${product.name}" is out of stock in this branch.`);
        return;
      }
      setCart([
        ...cart,
        {
          productId: product._id,
          name: product.name,
          sku: product.sku,
          unitPrice: product.price,
          quantity: 1,
          taxRate: product.taxRate || 18,
          discountPercent: 0,
          stockQuantity: availableStock,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.stockQuantity) {
              setError(`Maximum available stock reached (${item.stockQuantity})`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const updateDiscount = (productId: string, discount: number) => {
    const cappedDiscount = Math.min(Math.max(0, discount), 25);
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, discountPercent: cappedDiscount } : i))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Totals calculation
  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const discountTotal = cart.reduce(
    (acc, item) => acc + Math.round((item.unitPrice * item.quantity * item.discountPercent) / 100),
    0
  );
  const taxable = subtotal - discountTotal;
  const taxTotal = cart.reduce((acc, item) => {
    const itemSubtotal = item.unitPrice * item.quantity;
    const itemDiscount = Math.round((itemSubtotal * item.discountPercent) / 100);
    const itemTax = Math.round(((itemSubtotal - itemDiscount) * item.taxRate) / 100);
    return acc + itemTax;
  }, 0);
  const grandTotal = taxable + taxTotal;

  // Quick Customer Creation
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomerName || !quickCustomerPhone) return;

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickCustomerName,
          phone: quickCustomerPhone,
          storeId: activeStoreId || user?.storeId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedCustomer(json.data.customer);
        setShowQuickCustomerModal(false);
        setQuickCustomerName('');
        setQuickCustomerPhone('');
        loadCustomers();
      } else {
        setError(json.error || 'Failed to create customer');
      }
    } catch {
      setError('Network communication failed');
    }
  };

  // Save cart to sessionStorage before Stripe redirect
  const savePendingSaleToSessionStorage = (targetMethod: 'Cash' | 'Online') => {
    if (typeof window === 'undefined') return;
    const pendingData = {
      cart,
      selectedCustomer,
      paymentMethod: targetMethod,
      grandTotal,
      timestamp: Date.now(),
    };
    sessionStorage.setItem('storepulse_pending_stripe_sale', JSON.stringify(pendingData));
  };

  // Handle return from Stripe Hosted Checkout
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const stripeStatus = urlParams.get('stripe_status');
    const sessionId = urlParams.get('session_id');
    const returnMethod = (urlParams.get('method') as 'Online' | 'Cash') || 'Online';

    const pendingJson = sessionStorage.getItem('storepulse_pending_stripe_sale');
    const pending = pendingJson ? JSON.parse(pendingJson) : null;

    if (stripeStatus === 'cancelled') {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (pending?.cart?.length) {
        setCart(pending.cart);
        if (pending.selectedCustomer) setSelectedCustomer(pending.selectedCustomer);
        if (pending.paymentMethod) setPaymentMethod(pending.paymentMethod);
      }
      sessionStorage.removeItem('storepulse_pending_stripe_sale');
      setCartRestoredNotice('Stripe checkout was cancelled. Cart items and customer have been preserved.');
      return;
    }

    if (stripeStatus === 'success' && sessionId) {
      window.history.replaceState({}, document.title, window.location.pathname);
      (async () => {
        setProcessing(true);
        try {
          const res = await fetch('/api/payments/stripe/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          const json = await res.json();
          if (json.success) {
            await executeSale({
              stripeSessionId: sessionId,
              stripePaymentIntentId: json.data?.paymentIntentId || sessionId,
              actualMethod: returnMethod || pending?.paymentMethod || 'Online',
              items: pending?.cart?.length ? pending.cart : undefined,
              customer: pending?.selectedCustomer || undefined,
            });
            sessionStorage.removeItem('storepulse_pending_stripe_sale');
          } else {
            setError(json.error || 'Stripe payment verification failed');
          }
        } catch {
          setError('Failed to verify Stripe payment on return');
        } finally {
          setProcessing(false);
        }
      })();
    }
  }, []);

  // Execute and persist sale to backend
  const executeSale = async (paymentDetails?: {
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
    actualMethod?: 'Cash' | 'Online';
    items?: CartItem[];
    customer?: any;
  }) => {
    setProcessing(true);
    setError('');

    const targetItems = paymentDetails?.items || cart;
    const targetCustomer = paymentDetails?.customer !== undefined ? paymentDetails.customer : selectedCustomer;

    if (!targetItems || targetItems.length === 0) {
      setError('Cannot execute sale with no items in cart.');
      setProcessing(false);
      return;
    }

    try {
      const payload = {
        storeId: activeStoreId || user?.storeId,
        customerId: targetCustomer?._id || null,
        customerName: targetCustomer?.name || 'Walk-in Customer',
        customerPhone: targetCustomer?.phone || '',
        items: targetItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          discountPercent: i.discountPercent,
        })),
        paymentMethod: paymentDetails?.actualMethod || paymentMethod,
        stripeSessionId: paymentDetails?.stripeSessionId,
        stripePaymentIntentId: paymentDetails?.stripePaymentIntentId,
        idempotencyKey: `SALE-${Date.now()}-${Math.random()}`,
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setCompletedSale(json.data.sale);
        setCart([]);
        setSelectedCustomer(null);
        loadProducts(); // refresh inventory
      } else {
        setError(json.error || 'Checkout failed');
      }
    } catch {
      setError('Transaction execution failed');
    } finally {
      setProcessing(false);
      setStripeRedirecting(false);
    }
  };

  // Submit Sale Checkout router (Cash vs Online Stripe Gateway)
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Cannot checkout an empty cart');
      return;
    }

    setError('');

    // 1. Direct Cash Settlement
    if (paymentMethod === 'Cash') {
      await executeSale();
      return;
    }

    // 2. Online Payment -> Direct redirect to Stripe Payment Gateway
    if (paymentMethod === 'Online') {
      setStripeRedirecting(true);
      try {
        savePendingSaleToSessionStorage('Online');
        const res = await fetch('/api/payments/stripe/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: grandTotal,
            currency: 'inr',
            description: `StorePulse POS: ${cart.length} item(s) - ${selectedCustomer?.name || 'Walk-in'}`,
            customerEmail: selectedCustomer?.email || 'counter@storepulse.local',
            customerName: selectedCustomer?.name || 'Walk-in Customer',
            returnPath: '/billing?method=Online',
          }),
        });
        const json = await res.json();
        const checkoutUrl = json.data?.url || json.data?.session?.url;
        if (json.success && checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        } else {
          setError(json.error || 'Failed to initialize Stripe online gateway');
          setStripeRedirecting(false);
        }
      } catch {
        setError('Network error initiating online payment session');
        setStripeRedirecting(false);
      }
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.category.toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Point of Sale (POS)"
        description={`Active checkout register for ${user?.store?.name || 'Assigned Store'}. Scan products, add discounts, and record transactions.`}
      />

      {cartRestoredNotice && (
        <div className="p-3.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#FBBF24] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#F59E0B]" />
            <span>{cartRestoredNotice}</span>
          </div>
          <button onClick={() => setCartRestoredNotice('')} className="text-[#FBBF24] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-[#EF4444] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* POS Grid: Catalog on Left, Order Summary / Cart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Product Catalog - 7 Cols */}
        <div className="lg:col-span-7 bg-[#141414] border border-[#222222] rounded-2xl p-5 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
            <input
              type="text"
              placeholder="Search products by SKU, title, or category..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#262626] text-white placeholder-[#666666] text-xs focus:outline-none focus:border-neutral-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const stock = p.stockQuantity ?? 0;
              const isOutOfStock = stock <= 0;

              return (
                <div
                  key={p._id}
                  onClick={() => !isOutOfStock && addToCart(p)}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                    isOutOfStock
                      ? 'bg-[#101010] border-[#1C1C1C] opacity-50 cursor-not-allowed'
                      : 'bg-[#181818] border-[#262626] hover:border-[#383838] hover:bg-[#1E1E1E] cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-mono text-[#888888] text-[10px] bg-[#111111] px-1.5 py-0.5 rounded border border-[#222222]">{p.sku}</span>
                      <Badge variant={stock > 5 ? 'success' : 'warning'} size="sm">
                        {stock} in stock
                      </Badge>
                    </div>
                    <h4 className="text-xs font-semibold text-white line-clamp-2 leading-tight">
                      {p.name}
                    </h4>
                    <p className="text-[11px] text-[#888888] mt-1">{p.category}</p>
                  </div>
                  <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-[#242424]">
                    <span className="text-xs font-semibold text-white">
                      ₹{p.price.toLocaleString()}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      disabled={isOutOfStock}
                    >
                      + Add
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart & Billing Checkout - 5 Cols */}
        <div className="lg:col-span-5 bg-[#141414] border border-[#222222] rounded-2xl p-5 flex flex-col justify-between min-h-[600px]">
          <div>
            {/* Customer Selector */}
            <div className="pb-3.5 mb-3.5 border-b border-[#222222]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#888888]">
                  Customer
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(true)}
                  className="text-xs font-medium text-white hover:underline cursor-pointer"
                >
                  + Quick Add
                </button>
              </div>

              {selectedCustomer ? (
                <div className="p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium text-white">{selectedCustomer.name}</p>
                    <p className="text-[11px] text-[#888888]">{selectedCustomer.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-[#888888] hover:text-white p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <select
                  onChange={(e) => {
                    const found = customers.find((c) => c._id === e.target.value);
                    setSelectedCustomer(found || null);
                  }}
                  value=""
                  className="w-full text-xs text-white bg-[#0A0A0A] border border-[#262626] rounded-xl px-3 py-2.5 focus:outline-none focus:border-neutral-500"
                >
                  <option value="" className="bg-[#141414] text-white">Walk-in Customer (Unassigned)</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id} className="bg-[#141414] text-white">
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto mb-3 pr-1">
              {cart.length === 0 ? (
                <EmptyState
                  icon={<ShoppingCart className="w-5 h-5 text-[#888888]" />}
                  title="Cart is empty"
                  description="Select products from the catalog to begin building an invoice."
                  className="py-8"
                />
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="p-3 rounded-xl bg-[#181818] border border-[#262626] text-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-2">
                        <p className="font-medium text-white leading-tight">{item.name}</p>
                        <p className="text-[10px] text-[#888888] font-mono mt-0.5">
                          ₹{item.unitPrice.toLocaleString()} • {item.taxRate}% GST
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        className="text-[#888888] hover:text-rose-400 p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1 bg-[#101010] border border-[#262626] rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="p-1 text-[#888888] hover:text-white rounded"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-6 text-center font-semibold text-xs text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="p-1 text-[#888888] hover:text-white rounded"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      {/* Discount Input */}
                      <div className="flex items-center gap-1 text-[11px] text-[#888888]">
                        <span>Disc:</span>
                        <input
                          type="number"
                          min="0"
                          max="25"
                          value={item.discountPercent}
                          onChange={(e) => updateDiscount(item.productId, parseInt(e.target.value) || 0)}
                          className="w-12 px-1.5 py-0.5 rounded bg-[#101010] border border-[#262626] text-center font-medium text-xs text-white focus:outline-none"
                        />
                        <span>%</span>
                      </div>

                      {/* Line Total */}
                      <span className="font-semibold text-white">
                        ₹
                        {(
                          Math.round(item.unitPrice * item.quantity * (1 - item.discountPercent / 100)) +
                          Math.round(
                            (item.unitPrice * item.quantity * (1 - item.discountPercent / 100) * item.taxRate) /
                              100
                          )
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Calculations & Settlement */}
          <div className="pt-3.5 border-t border-[#222222] space-y-3.5">
            <div className="space-y-1.5 text-xs text-[#888888]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-white">₹{subtotal.toLocaleString()}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount</span>
                  <span className="font-medium">-₹{discountTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated Tax (GST)</span>
                <span className="font-medium text-white">₹{taxTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-white pt-2.5 border-t border-[#222222]">
                <span>Grand Total</span>
                <span className="text-white font-bold">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <span className="block text-[11px] font-semibold text-[#888888] uppercase tracking-wider">
                Payment Method
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('Cash');
                    setError('');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'Cash'
                      ? 'bg-white text-black font-semibold border-white shadow-xs'
                      : 'bg-[#181818] border-[#262626] text-[#888888] hover:text-white'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Cash Payment</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('Online');
                    setError('');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'Online'
                      ? 'bg-white text-black font-semibold border-white shadow-xs'
                      : 'bg-[#181818] border-[#262626] text-[#888888] hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Online (UPI / Card)</span>
                </button>
              </div>

              {paymentMethod === 'Online' && (
                <div className="p-3 rounded-xl bg-[#181818] border border-[#262626] text-xs text-[#888888] space-y-1">
                  <div className="flex items-center justify-between text-white font-medium">
                    <span>Stripe Checkout</span>
                    <Badge variant="neutral" size="sm">Secure</Badge>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#888888]">
                    Customer will be routed to the Stripe portal to pay via UPI QR, RuPay, Visa, Mastercard, or NetBanking.
                  </p>
                </div>
              )}
            </div>

            {/* Checkout Action Button */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full text-white font-semibold"
              disabled={cart.length === 0 || processing || stripeRedirecting}
              loading={processing || stripeRedirecting}
              onClick={handleCheckout}
            >
              <span className="text-white font-semibold">
                {paymentMethod === 'Cash'
                  ? `Complete Cash Sale • ₹${grandTotal.toLocaleString()}`
                  : `Proceed to Online Payment • ₹${grandTotal.toLocaleString()}`}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* QUICK CUSTOMER MODAL */}
      <Modal
        isOpen={showQuickCustomerModal}
        onClose={() => setShowQuickCustomerModal(false)}
        title="Quick Add Customer"
        description="Register customer phone & name for loyalty and invoice tracking."
        maxWidth="sm"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-[#D1D5DB] mb-1">Customer Full Name</label>
            <input
              type="text"
              required
              value={quickCustomerName}
              onChange={(e) => setQuickCustomerName(e.target.value)}
              placeholder="e.g. Ramesh Gupta"
              className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-white text-xs placeholder-[#666666] focus:outline-none focus:border-neutral-500"
            />
          </div>
          <div>
            <label className="block font-medium text-[#D1D5DB] mb-1">Phone Number</label>
            <input
              type="text"
              required
              value={quickCustomerPhone}
              onChange={(e) => setQuickCustomerPhone(e.target.value)}
              placeholder="+91 98000 00000"
              className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-white font-mono text-xs placeholder-[#666666] focus:outline-none focus:border-neutral-500"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setShowQuickCustomerModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="flex-1">
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* COMPLETED SALE PRINTABLE RECEIPT MODAL */}
      {completedSale && (
        <Modal
          isOpen={Boolean(completedSale)}
          onClose={() => setCompletedSale(null)}
          title="Transaction Completed"
          description={`Invoice #${completedSale.invoiceNumber} recorded successfully.`}
          maxWidth="md"
          footer={
            <div className="flex gap-2 w-full justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print()}
              >
                Print Receipt
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setCompletedSale(null)}
              >
                Done / New Sale
              </Button>
            </div>
          }
        >
          {/* Printable Receipt Card */}
          <div
            id="printable-receipt"
            className="p-4 rounded-xl bg-[#0A0A0A] border border-[#222222] text-xs font-mono space-y-3 text-white"
          >
            <div className="text-center pb-2.5 border-b border-[#222222]">
              <h2 className="font-bold text-sm tracking-tight text-white">STOREPULSE POS RECEIPT</h2>
              <p className="text-[10px] text-[#888888]">{user?.store?.name || 'Retail Branch'}</p>
              <p className="text-[10px] text-[#888888] mt-0.5">Invoice: {completedSale.invoiceNumber}</p>
              <p className="text-[10px] text-[#888888]">{new Date(completedSale.createdAt).toLocaleString()}</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-white">Customer: {completedSale.customerName}</p>
              {completedSale.customerPhone && (
                <p className="text-[10px] text-[#888888]">Phone: {completedSale.customerPhone}</p>
              )}
            </div>

            <div className="border-t border-b border-[#222222] py-2 space-y-1">
              {completedSale.items.map((i: any, idx: number) => (
                <div key={idx} className="flex justify-between text-[11px]">
                  <span className="truncate pr-2 text-zinc-300">
                    {i.quantity}x {i.name}
                  </span>
                  <span className="font-semibold text-white">₹{i.total.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-[#888888]">
                <span>Subtotal:</span>
                <span className="text-white">₹{completedSale.subtotal.toLocaleString()}</span>
              </div>
              {completedSale.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount:</span>
                  <span>-₹{completedSale.discountTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-[#888888]">
                <span>GST Tax:</span>
                <span className="text-white">₹{completedSale.taxTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-xs pt-1 border-t border-[#222222] text-white">
                <span>Grand Total:</span>
                <span>₹{completedSale.grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px] text-[#888888] pt-1">
                <span>Payment Mode:</span>
                <span className="font-semibold text-white">{completedSale.paymentMethod} (PAID)</span>
              </div>
            </div>

            <p className="text-center text-[10px] text-[#888888] pt-2 border-t border-[#222222]">
              Thank you for your purchase!
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

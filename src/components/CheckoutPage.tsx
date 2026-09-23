import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  Tag,
  Copy,
  Check,
  ArrowLeft,
  ShoppingBag,
  Truck,
  CreditCard,
  PackageCheck,
  User,
  MapPin,
  Sparkles,
  ChevronRight,
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { CartItem } from '../types';
import { handleImageError } from '../utils/imageUtils';
import { analytics } from '../utils/analytics';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

async function submitOrder(order: any) {
  try {
    const shippingDetails = typeof order.shipping === 'object' && order.shipping !== null
      ? {
          address: order.shipping.address || '',
          city: order.shipping.city || '',
          state: order.shipping.state || '',
          postalCode: order.shipping.zip || order.shipping.postalCode || '',
          country: order.shipping.country || 'United States',
        }
      : {
          address: order.billing?.address || '',
          city: order.billing?.city || '',
          state: order.billing?.state || '',
          postalCode: order.billing?.zipCode || order.billing?.postalCode || '',
          country: order.billing?.country || 'United States',
        };

    const shippingAddressFormatted = typeof order.shipping === 'object' && order.shipping !== null
      ? `${order.shipping.name || ''}\n${order.shipping.address || ''}\n${order.shipping.city || ''}, ${order.shipping.state || ''} ${order.shipping.zip || ''}`.trim()
      : `${order.billing?.address || ''}\n${order.billing?.city || ''}, ${order.billing?.state || ''} ${order.billing?.zipCode || ''}\n${order.billing?.country || 'United States'}`.trim();

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: order.orderId,
        customerName: `${order.billing?.firstName || ''} ${order.billing?.lastName || ''}`.trim() || order.customerName || 'Valued Customer',
        customerEmail: order.billing?.email || order.customerEmail || '',
        customerPhone: order.billing?.phone || '',
        companyName: order.billing?.company || '',
        shippingAddress: shippingAddressFormatted,
        shippingDetails,
        billingAddress: order.billing,
        orderNotes: order.orderNotes || '',
        cartItems: (order.items || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          variant: item.weight || item.variant || item.size,
          weight: item.weight,
          quantity: item.quantity,
          price: item.price,
          total: item.total || item.price * item.quantity,
          image: item.image,
        })),
        subtotal: order.subtotal || 0,
        discount: order.discount || 0,
        couponCode: order.couponCode,
        shippingCost: order.shippingCost || 0,
        orderTotal: order.total || 0,
        paymentMethod: order.paymentMethod || 'btc',
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      console.warn('Order submission response notice:', data);
    }
    return data;
  } catch (err) {
    console.error('Failed to submit order via checkout API:', err);
    return null;
  }
}

interface CheckoutPageProps {
  cartItems: CartItem[];
  onClearCart: () => void;
  onSelectPage?: (page: string) => void;
}

export default function CheckoutPage({ cartItems, onClearCart, onSelectPage }: CheckoutPageProps) {
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const { user, isLoggedIn, openAccountModal } = useAuth();
  // Coupon state
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState<number>(0);
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Billing details form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('United States (US)');
  const [streetAddress1, setStreetAddress1] = useState('');
  const [streetAddress2, setStreetAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Auto-populate with authenticated member details
  useEffect(() => {
    if (user) {
      if (!email) setEmail(user.email || '');
      if (!firstName && user.name) {
        const parts = user.name.trim().split(' ');
        setFirstName(parts[0] || '');
        if (!lastName && parts.length > 1) {
          setLastName(parts.slice(1).join(' '));
        }
      }
      if (!phone && user.phone) setPhone(user.phone);
      if (!streetAddress1 && user.deliveryAddress) setStreetAddress1(user.deliveryAddress);
    }
  }, [user]);

  // Shipping & Options
  const [shipToDifferent, setShipToDifferent] = useState(false);
  const [shipFirstName, setShipFirstName] = useState('');
  const [shipLastName, setShipLastName] = useState('');
  const [shipAddress, setShipAddress] = useState('');
  const [shipCity, setShipCity] = useState('');
  const [shipState, setShipState] = useState('');
  const [shipZip, setShipZip] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'btc' | 'zelle' | 'wire' | 'google_apple'>('btc');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [copiedBtc, setCopiedBtc] = useState(false);

  // Order Subtotals Calculation
  const subtotal = cartItems.reduce(
    (acc, item) => acc + (item.unitPrice !== undefined ? item.unitPrice : item.product.price) * item.quantity,
    0
  );
  const totalItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const discountRate = couponApplied === 15 ? 0.15 : couponApplied === 10 ? 0.10 : 0;
  const discount = subtotal * discountRate;
  const freeShippingThreshold = 250;
  const shippingCost = subtotal >= freeShippingThreshold || cartItems.length === 0 ? 0 : 19.99;
  const total = Math.max(0, subtotal - discount + shippingCost);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const amountUntilFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  // Apply Coupon Handler
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) return;
    
    if (cleanCode === 'HERBS15OFF') {
      setCouponApplied(15);
      setCouponMsg({ text: 'Code HERBS15OFF applied! 15% VIP discount added.', isError: false });
    } else if (cleanCode === 'WELCOME10' || cleanCode === 'GLOBAL10' || cleanCode === 'HERBS') {
      setCouponApplied(10);
      setCouponMsg({ text: `Code ${cleanCode} applied! 10% discount added.`, isError: false });
    } else {
      setCouponMsg({ text: 'Invalid code. Try HERBS15OFF for 15% off.', isError: true });
    }
  };

  // Submit Order Handler
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setTermsError(true);
      const termsEl = document.getElementById('checkout-terms-container');
      if (termsEl) {
        termsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setTermsError(false);

    setIsSubmitting(true);

    const orderId = `GM-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderData = {
      orderId,
      customerName: `${firstName} ${lastName}`.trim() || 'Valued Customer',
      customerEmail: email,
      email: email,
      to: email,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      billing: {
        name: `${firstName} ${lastName}`.trim() || 'Valued Customer',
        firstName,
        lastName,
        company: companyName,
        country,
        address: `${streetAddress1}${streetAddress2 ? ', ' + streetAddress2 : ''}`,
        city,
        state,
        zipCode,
        phone,
        email,
      },
      shipping: shipToDifferent ? {
        name: `${shipFirstName} ${shipLastName}`.trim() || `${firstName} ${lastName}`.trim(),
        address: shipAddress,
        city: shipCity,
        state: shipState,
        zip: shipZip,
      } : 'Same as billing address',
      items: cartItems.map(item => {
        const itemPrice = item.unitPrice !== undefined ? item.unitPrice : item.product.price;
        return {
          id: item.product.id,
          name: item.product.name,
          weight: item.selectedWeight || item.product.weight,
          quantity: item.quantity,
          price: itemPrice,
          total: itemPrice * item.quantity,
          image: item.product.image,
        };
      }),
      subtotal,
      discount,
      couponCode: couponApplied ? couponCode : undefined,
      shippingCost,
      total,
      paymentMethod,
      orderNotes,
    };

    try {
      const serverResult = await submitOrder(orderData);
      if (serverResult && serverResult.orderId) {
        orderData.orderId = serverResult.orderId;
      }
    } catch (err) {
      console.error('Order submission error:', err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setCompletedOrder(orderData);
      setOrderComplete(true);

      // Identify contact & track purchase in Google Analytics 4
      analytics.identify({
        email,
        firstName,
        lastName,
        phone,
      });

      analytics.purchase({
        orderId: orderData.orderId,
        value: total,
        items: cartItems.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          category: item.product.category,
        })),
        shipping: shippingCost,
        coupon: couponApplied ? couponCode : undefined,
      });

      onClearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1000);
  };

  const BTC_WALLET_ADDRESS = '1CxJc1KVwjapJsw559cpYyBy7PxnD6UNkM';

  const copyBtcAddress = () => {
    navigator.clipboard.writeText(BTC_WALLET_ADDRESS);
    setCopiedBtc(true);
    setTimeout(() => setCopiedBtc(false), 2000);
  };

  // Steps definition for the Progress Stepper
  const steps = [
    { id: 1, name: 'Shopping Cart', icon: ShoppingBag, status: 'completed' },
    { id: 2, name: 'Shipping & Address', icon: MapPin, status: orderComplete ? 'completed' : 'current' },
    { id: 3, name: 'Payment Method', icon: CreditCard, status: orderComplete ? 'completed' : 'current' },
    { id: 4, name: 'Confirmation', icon: PackageCheck, status: orderComplete ? 'current' : 'upcoming' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10 text-left font-sans">
      {/* 1. Header & Navigation Breadcrumb */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <nav className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Link to="/" className="hover:text-emerald-800 transition">Home</Link>
            <ChevronRight size={12} className="text-gray-300" />
            <Link to="/products" className="hover:text-emerald-800 transition">Catalog</Link>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-emerald-950 font-bold">Secure Checkout</span>
          </nav>
          <h1 className="font-heading font-extrabold text-xl sm:text-3xl text-gray-900 tracking-tight flex flex-wrap items-center gap-2">
            <span>Dispensary Express Checkout</span>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 inline-flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-800" />
              SSL 256-Bit Secured
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200/80 px-3.5 py-2 rounded-xl">
          <div className="flex items-center gap-1.5 text-emerald-800">
            <Truck size={15} />
            <span>Stealth Express</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5 text-gray-700">
            <Lock size={13} className="text-emerald-700" />
            <span>Encrypted Checkout</span>
          </div>
        </div>
      </div>

      {/* 2. Progress Stepper Component */}
      <div className="mb-8 bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';

            return (
              <div
                key={step.id}
                className={`relative flex items-center gap-3 p-2.5 sm:p-3 rounded-xl transition ${
                  isCompleted
                    ? 'bg-emerald-50/70 border border-emerald-200'
                    : isCurrent
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'bg-gray-50 border border-gray-200/60 text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                    isCompleted
                      ? 'bg-emerald-800 text-white'
                      : isCurrent
                      ? 'bg-emerald-500 text-emerald-950 font-extrabold'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <Check size={15} strokeWidth={3} /> : <Icon size={16} />}
                </div>

                <div className="min-w-0">
                  <span
                    className={`block text-[10px] font-bold uppercase tracking-wider ${
                      isCurrent ? 'text-emerald-300' : isCompleted ? 'text-emerald-700' : 'text-gray-400'
                    }`}
                  >
                    Step 0{step.id}
                  </span>
                  <p
                    className={`text-xs font-bold truncate ${
                      isCurrent ? 'text-white' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* If Order Complete Confirmation View */}
      {orderComplete && completedOrder ? (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Order Received Header Banner */}
          <div className="bg-emerald-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500 text-emerald-950 rounded-xl shadow-xs">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  Order Successfully Dispatched &amp; Logged
                </span>
                <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-white tracking-tight mt-0.5">
                  Thank You, {completedOrder.billing.firstName || 'Valued Customer'}!
                </h2>
                <p className="text-xs text-emerald-100/90 mt-1 font-medium max-w-xl">
                  Order confirmation and invoice tracking have been sent to <strong className="text-white underline">{completedOrder.billing.email}</strong>.
                </p>
              </div>
            </div>
            <div className="bg-emerald-950/60 border border-emerald-700/60 px-4 py-3 rounded-xl text-right sm:text-right w-full sm:w-auto">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 block">Order Ref</span>
              <strong className="font-mono text-sm font-bold text-white">{completedOrder.orderId}</strong>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs font-semibold">
            <div>
              <span className="text-gray-400 block uppercase tracking-wider text-[10px]">Order Date</span>
              <strong className="text-gray-900 font-bold">{completedOrder.date}</strong>
            </div>
            <div>
              <span className="text-gray-400 block uppercase tracking-wider text-[10px]">Total Paid/Due</span>
              <strong className="text-emerald-800 font-extrabold text-sm">{formatPrice(completedOrder.total)}</strong>
            </div>
            <div>
              <span className="text-gray-400 block uppercase tracking-wider text-[10px]">Payment Method</span>
              <strong className="text-gray-900 capitalize truncate block">
                {completedOrder.paymentMethod === 'btc' ? 'Bitcoin / Crypto' : completedOrder.paymentMethod === 'zelle' ? 'Zelle / CashApp' : completedOrder.paymentMethod === 'wire' ? 'E-Transfer' : 'Apple / Google Pay'}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 block uppercase tracking-wider text-[10px]">Packaging</span>
              <strong className="text-emerald-800">Double Vacuum Sealed</strong>
            </div>
          </div>

          {/* Crypto Instructions if BTC */}
          {completedOrder.paymentMethod === 'btc' && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-6 text-left space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-heading font-bold text-sm text-amber-950 uppercase tracking-wider flex items-center gap-2">
                  <Lock size={16} className="text-amber-800" />
                  Bitcoin Cold-Storage Payment Address
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  Amount: {formatPrice(completedOrder.total)}
                </span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                Please transfer exactly <strong>{formatPrice(completedOrder.total)}</strong> worth of Bitcoin to the wallet address below. Upon 1 blockchain confirmation, your order will transition immediately to express packaging and dispatch.
              </p>
              <div className="bg-white border border-amber-300 p-3 rounded-xl flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-gray-800 truncate font-semibold">{BTC_WALLET_ADDRESS}</span>
                <button
                  type="button"
                  onClick={copyBtcAddress}
                  className="flex items-center gap-1.5 bg-amber-800 hover:bg-amber-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer shadow-xs"
                >
                  {copiedBtc ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedBtc ? 'Copied!' : 'Copy Wallet'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Clean Order Breakdown */}
          <div className="grid md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-7 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-gray-50/90 px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-900">
                  Purchased Items Breakdown
                </h3>
                <span className="text-xs font-bold text-gray-500">{completedOrder.items.length} items</span>
              </div>
              <div className="p-4 divide-y divide-gray-100">
                {completedOrder.items.map((item: any) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          onError={handleImageError}
                          className="w-11 h-11 object-cover rounded-lg border border-gray-100"
                        />
                      )}
                      <div>
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <p className="text-gray-500 text-[11px]">
                          Qty: {item.quantity} {item.weight ? `• ${item.weight}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900">{formatPrice(item.total)}</span>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 p-4 border-t border-gray-200 text-xs space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-gray-900">{formatPrice(completedOrder.subtotal)}</span>
                </div>
                {completedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>Discount (Coupon):</span>
                    <span>-{formatPrice(completedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Stealth Shipping:</span>
                  <span className="font-semibold text-gray-900">
                    {completedOrder.shippingCost === 0 ? 'FREE' : formatPrice(completedOrder.shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total Paid:</span>
                  <span className="text-emerald-800">{formatPrice(completedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Addresses Card */}
            <div className="md:col-span-5 space-y-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs text-xs space-y-3">
                <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-800" />
                  Delivery &amp; Client Address
                </h4>
                <div className="text-gray-600 space-y-1 font-medium">
                  <p className="font-bold text-gray-900 text-sm">{completedOrder.billing.name}</p>
                  {completedOrder.billing.company && <p>{completedOrder.billing.company}</p>}
                  <p>{completedOrder.billing.address}</p>
                  <p>{completedOrder.billing.city}, {completedOrder.billing.state} {completedOrder.billing.zipCode}</p>
                  <p>{completedOrder.billing.country}</p>
                  <p className="pt-2 font-semibold text-gray-800">Phone: {completedOrder.billing.phone}</p>
                  <p className="font-semibold text-gray-800">Email: {completedOrder.billing.email}</p>
                </div>
              </div>

              <Link
                to="/products"
                className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={15} />
                <span>Continue Shopping Catalog</span>
              </Link>
            </div>
          </div>
        </div>
      ) : cartItems.length === 0 ? (
        /* Empty Cart State */
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 space-y-4 max-w-xl mx-auto shadow-xs">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto">
            <ShoppingBag size={32} />
          </div>
          <h3 className="font-heading font-extrabold text-xl text-gray-900 tracking-tight">
            Your Checkout Cart is Empty
          </h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
            Explore our premium cannabis strains, concentrates, and wellness products to begin checkout.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-xs cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Browse Catalog</span>
          </Link>
        </div>
      ) : (
        /* Active Checkout Workflow */
        <form onSubmit={handlePlaceOrder} className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (Step-by-Step Forms) - Col 7 */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Customer Contact & Shipping Details Card */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs flex items-center justify-center">
                    1
                  </span>
                  <h2 className="font-heading font-extrabold text-lg text-gray-900 tracking-tight">
                    Contact &amp; Shipping Details
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-gray-400">* Required fields</span>
              </div>

              {/* Member Auth Banner */}
              {isLoggedIn ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0" />
                    <span className="text-xs text-emerald-950 font-semibold">
                      Signed in as <strong className="font-bold">{user?.name}</strong> ({user?.email})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAccountModal('profile')}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer text-left"
                  >
                    View Account &amp; Past Orders
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-gray-600 font-medium">
                    Returning dispensary member with saved shipping info?
                  </span>
                  <button
                    type="button"
                    onClick={() => openAccountModal('login')}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer text-left"
                  >
                    Sign in to auto-fill details
                  </button>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label htmlFor="first_name" className="block text-gray-700">
                    First name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    required
                    placeholder="e.g. Alexander"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl bg-gray-50/50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="last_name" className="block text-gray-700">
                    Last name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    required
                    placeholder="e.g. Hayes"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl bg-gray-50/50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label htmlFor="email_addr" className="block text-gray-700">
                    Email address (for stealth tracking) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email_addr"
                    required
                    placeholder="e.g. alex@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl bg-gray-50/50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="phone_num" className="block text-gray-700">
                    Phone number (SMS alerts) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone_num"
                    required
                    placeholder="e.g. +1 (555) 019-2834"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl bg-gray-50/50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label htmlFor="country_select" className="block text-gray-700">
                    Country / Region <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="country_select"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl bg-gray-50/50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-medium transition cursor-pointer"
                  >
                    <option value="United States (US)">United States (US)</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom (UK)">United Kingdom (UK)</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="Worldwide / International">Worldwide / International</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="company_name" className="block text-gray-700">
                    Company name <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="company_name"
                    placeholder="Optional business name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl bg-gray-50/50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>
              </div>

              <div className="space-y-2 text-xs font-semibold">
                <label htmlFor="street_address" className="block text-gray-700">
                  Street address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="street_address"
                  required
                  placeholder="House number and street name"
                  value={streetAddress1}
                  onChange={(e) => setStreetAddress1(e.target.value)}
                  className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl bg-gray-50/50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                />
                <input
                  type="text"
                  placeholder="Apartment, suite, unit, etc. (optional)"
                  value={streetAddress2}
                  onChange={(e) => setStreetAddress2(e.target.value)}
                  className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl bg-gray-50/50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label htmlFor="city" className="block text-gray-700">
                    Town / City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    required
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl bg-gray-50/50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="state" className="block text-gray-700">
                    State / Region <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="state"
                    required
                    placeholder="e.g. California"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl bg-gray-50/50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="zip" className="block text-gray-700">
                    ZIP / Postal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="zip"
                    required
                    placeholder="e.g. 90210"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl bg-gray-50/50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>
              </div>

              {/* Ship to a different address toggle */}
              <div className="pt-3 border-t border-gray-100">
                <label className="flex items-center gap-2.5 text-xs font-bold text-gray-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shipToDifferent}
                    onChange={(e) => setShipToDifferent(e.target.checked)}
                    className="rounded text-emerald-800 focus:ring-emerald-700 w-4 h-4 cursor-pointer"
                  />
                  <span>Ship to a different recipient or stealth address?</span>
                </label>

                {shipToDifferent && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4 text-xs font-semibold">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 mb-1">Recipient First Name</label>
                        <input
                          type="text"
                          value={shipFirstName}
                          onChange={(e) => setShipFirstName(e.target.value)}
                          className="w-full border border-gray-300 p-2.5 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1">Recipient Last Name</label>
                        <input
                          type="text"
                          value={shipLastName}
                          onChange={(e) => setShipLastName(e.target.value)}
                          className="w-full border border-gray-300 p-2.5 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1">Alternate Shipping Address</label>
                      <input
                        type="text"
                        placeholder="Alternate Street Address, City, State, ZIP"
                        value={shipAddress}
                        onChange={(e) => setShipAddress(e.target.value)}
                        className="w-full border border-gray-300 p-2.5 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Order Notes */}
              <div className="pt-3 border-t border-gray-100 space-y-1.5">
                <label htmlFor="order_notes" className="block text-xs font-bold text-gray-700">
                  Stealth Delivery Instructions <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="order_notes"
                  rows={3}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Special instructions for vacuum packing, discrete drop-off location, or specific strain requirements..."
                  className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50/50 focus:bg-white text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                ></textarea>
              </div>
            </div>

            {/* Step 2: Payment Gateway Selection Card */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h2 className="font-heading font-extrabold text-lg text-gray-900 tracking-tight">
                    Select Secure Payment Method
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Zero Processing Fees
                </span>
              </div>

              {/* Gateway Options */}
              <div className="space-y-3">
                {/* 1. Bitcoin / Cryptocurrency */}
                <label
                  onClick={() => setPaymentMethod('btc')}
                  className={`block p-4 rounded-xl border transition cursor-pointer ${
                    paymentMethod === 'btc'
                      ? 'border-emerald-700 bg-emerald-50/30 ring-1 ring-emerald-700/30'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_gateway"
                        checked={paymentMethod === 'btc'}
                        onChange={() => setPaymentMethod('btc')}
                        className="text-emerald-800 focus:ring-emerald-700 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-900">Bitcoin / Cryptocurrency</span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">BTC, ETH, USDT • Instant 1-Confirmation Dispatch</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 select-none">
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-[#F7931A] text-white rounded text-[10px] font-bold">
                        BTC
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-[#627EEA] text-white rounded text-[10px] font-bold">
                        ETH
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-[#26A17B] text-white rounded text-[10px] font-bold">
                        USDT
                      </div>
                    </div>
                  </div>

                  {paymentMethod === 'btc' && (
                    <div className="mt-3 pt-3 border-t border-emerald-100 text-[11px] text-gray-600 space-y-1">
                      <p>
                        Pay securely with crypto for maximum privacy. Cold storage wallet instructions and QR tags are provided immediately upon clicking <strong>Place Order</strong>.
                      </p>
                    </div>
                  )}
                </label>

                {/* 2. Zelle / Cash App / Venmo */}
                <label
                  onClick={() => setPaymentMethod('zelle')}
                  className={`block p-4 rounded-xl border transition cursor-pointer ${
                    paymentMethod === 'zelle'
                      ? 'border-emerald-700 bg-emerald-50/30 ring-1 ring-emerald-700/30'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_gateway"
                        checked={paymentMethod === 'zelle'}
                        onChange={() => setPaymentMethod('zelle')}
                        className="text-emerald-800 focus:ring-emerald-700 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-xs text-gray-900">Zelle / Cash App / Venmo</span>
                        <p className="text-[11px] text-gray-500 mt-0.5">Instant P2P bank transfer for US clients</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 select-none">
                      <div className="px-2 py-0.5 bg-[#7414CA] text-white rounded text-[10px] font-black">Zelle</div>
                      <div className="px-2 py-0.5 bg-[#00D632] text-white rounded text-[10px] font-black">Cash App</div>
                      <div className="px-2 py-0.5 bg-[#008CFF] text-white rounded text-[10px] font-black">Venmo</div>
                    </div>
                  </div>

                  {paymentMethod === 'zelle' && (
                    <div className="mt-3 pt-3 border-t border-emerald-100 text-[11px] text-gray-600 space-y-1">
                      <p>
                        Direct handle transfer instructions and payment cashtags will be sent immediately to your email invoice.
                      </p>
                    </div>
                  )}
                </label>

                {/* 3. Interac e-Transfer / Bank Wire */}
                <label
                  onClick={() => setPaymentMethod('wire')}
                  className={`block p-4 rounded-xl border transition cursor-pointer ${
                    paymentMethod === 'wire'
                      ? 'border-emerald-700 bg-emerald-50/30 ring-1 ring-emerald-700/30'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_gateway"
                        checked={paymentMethod === 'wire'}
                        onChange={() => setPaymentMethod('wire')}
                        className="text-emerald-800 focus:ring-emerald-700 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-xs text-gray-900">Interac e-Transfer / Bank Wire</span>
                        <p className="text-[11px] text-gray-500 mt-0.5">Canadian Interac Auto-Deposit &amp; Wire Transfers</p>
                      </div>
                    </div>

                    <div className="px-2 py-0.5 bg-[#FFB800] text-black rounded text-[10px] font-black border border-amber-300">
                      Interac
                    </div>
                  </div>

                  {paymentMethod === 'wire' && (
                    <div className="mt-3 pt-3 border-t border-emerald-100 text-[11px] text-gray-600 space-y-1">
                      <p>
                        Auto-deposit email instructions and security question references will be generated with your Order ID.
                      </p>
                    </div>
                  )}
                </label>

                {/* 4. Google Pay / Apple Pay */}
                <label
                  onClick={() => setPaymentMethod('google_apple')}
                  className={`block p-4 rounded-xl border transition cursor-pointer ${
                    paymentMethod === 'google_apple'
                      ? 'border-emerald-700 bg-emerald-50/30 ring-1 ring-emerald-700/30'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment_gateway"
                        checked={paymentMethod === 'google_apple'}
                        onChange={() => setPaymentMethod('google_apple')}
                        className="text-emerald-800 focus:ring-emerald-700 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-xs text-gray-900">Apple Pay / Google Pay</span>
                        <p className="text-[11px] text-gray-500 mt-0.5">1-Tap Biometric Checkout (Touch / Face ID)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 select-none">
                      <div className="px-2 py-0.5 bg-black text-white rounded text-[10px] font-semibold"> Pay</div>
                      <div className="px-2 py-0.5 bg-gray-100 border border-gray-300 text-gray-800 rounded text-[10px] font-bold">G Pay</div>
                    </div>
                  </div>

                  {paymentMethod === 'google_apple' && (
                    <div className="mt-3 pt-3 border-t border-emerald-100 text-[11px] text-gray-600 space-y-1">
                      <p>Express 1-tap checkout enabled for verified mobile wallets and cards.</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Terms and conditions agreement checkbox */}
              <div id="checkout-terms-container" className={`pt-3 border-t transition-all rounded-lg p-2 ${termsError ? 'bg-red-50/80 border-red-300 ring-2 ring-red-400' : 'border-gray-100'}`}>
                {termsError && (
                  <div className="mb-2 text-xs font-bold text-red-700 flex items-center gap-1.5">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span>Please accept the dispensary terms and conditions to proceed.</span>
                  </div>
                )}
                <label className="flex items-start gap-2.5 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={agreeTerms}
                    onChange={(e) => {
                      setAgreeTerms(e.target.checked);
                      if (e.target.checked) setTermsError(false);
                    }}
                    className="mt-0.5 rounded text-emerald-800 focus:ring-emerald-700 w-4 h-4 cursor-pointer"
                  />
                  <span className="leading-snug">
                    I confirm that I am of legal age (21+) and agree to the dispensary{' '}
                    <Link
                      to="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-emerald-800 hover:text-emerald-950 font-bold underline decoration-emerald-700/60 hover:decoration-emerald-900 transition-colors inline-block cursor-pointer"
                      title="Read Terms & Discreet Shipping Conditions in a new tab"
                    >
                      Terms &amp; Discreet Shipping Conditions
                    </Link>{' '}
                    <span className="text-red-500">*</span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column (Cleaner Sticky Order Summary Section) - Col 5 */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
            <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
              {/* Summary Card Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                <div>
                  <h3 className="font-heading font-extrabold text-base text-gray-900 tracking-tight">
                    Order Summary
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">Review your items before dispatch</p>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Free Shipping Progress Meter */}
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200/70 text-xs">
                <div className="flex items-center justify-between font-bold mb-1.5">
                  <span className="text-gray-700 flex items-center gap-1.5">
                    <Truck size={14} className="text-emerald-800" />
                    Stealth Express Shipping
                  </span>
                  <span className={shippingCost === 0 ? 'text-emerald-800 font-extrabold' : 'text-gray-600'}>
                    {shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
                  </span>
                </div>

                {shippingCost === 0 ? (
                  <p className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                    <CheckCircle size={12} />
                    You qualify for Free Discreet Express Shipping!
                  </p>
                ) : (
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden mb-1">
                      <div
                        className="bg-emerald-700 h-full transition-all duration-300"
                        style={{ width: `${freeShippingProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Add <strong className="text-emerald-800 font-bold">{formatPrice(amountUntilFreeShipping)}</strong> more for Free Shipping.
                    </p>
                  </div>
                )}
              </div>

              {/* Itemized Product List (Clean Compact Rows) */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {cartItems.map((item) => {
                  const itemPrice = item.unitPrice !== undefined ? item.unitPrice : item.product.price;
                  const itemKey = `${item.product.id}-${item.selectedWeight || 'default'}`;

                  return (
                    <div
                      key={itemKey}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-gray-50/70 border border-gray-100 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            onError={handleImageError}
                            className="w-12 h-12 object-cover rounded-lg border border-gray-200 bg-white"
                          />
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-800 text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs">
                            {item.quantity}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{item.product.name}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                            {item.selectedWeight && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                                {item.selectedWeight}
                              </span>
                            )}
                            <span>{formatPrice(itemPrice)} ea</span>
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-gray-900 flex-shrink-0">
                        {formatPrice(itemPrice * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Accordion Box */}
              <div className="pt-2 border-t border-gray-100 text-xs">
                {!showCouponInput && couponApplied === 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowCouponInput(true)}
                    className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Tag size={13} />
                    <span>Have a promo code? (Click to apply)</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="e.g. HERBS15OFF"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono uppercase bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {couponMsg && (
                      <p className={`text-[11px] font-bold ${couponMsg.isError ? 'text-red-600' : 'text-emerald-800'}`}>
                        {couponMsg.text}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Pricing Math Breakdown */}
              <div className="pt-3 border-t border-gray-100 space-y-2 text-xs font-semibold">
                <div className="flex justify-between text-gray-600">
                  <span>Items Subtotal:</span>
                  <span className="font-bold text-gray-900">{formatPrice(subtotal)}</span>
                </div>

                {couponApplied > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span className="flex items-center gap-1">
                      <Sparkles size={12} /> Discount ({couponApplied}% VIP):
                    </span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span>Stealth Express Shipping:</span>
                  <span className="font-bold text-gray-900">
                    {shippingCost === 0 ? (
                      <span className="text-emerald-800">FREE</span>
                    ) : (
                      formatPrice(shippingCost)
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center text-base font-extrabold text-gray-900 pt-3 border-t border-gray-200">
                  <div>
                    <span>Total Amount:</span>
                    <span className="block text-[10px] text-gray-400 font-normal">Includes stealth packing &amp; taxes</span>
                  </div>
                  <span className="text-xl font-extrabold text-emerald-800">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              {/* Main Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <span>Securing &amp; Dispatching Order...</span>
                ) : (
                  <>
                    <Lock size={15} />
                    <span>Complete Order • {formatPrice(total)}</span>
                  </>
                )}
              </button>

              {/* Security & Packaging Badges */}
              <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-700 flex-shrink-0" />
                  <span>256-Bit SSL Secured</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <PackageCheck size={14} className="text-emerald-700 flex-shrink-0" />
                  <span>Double Vacuum Sealed</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}


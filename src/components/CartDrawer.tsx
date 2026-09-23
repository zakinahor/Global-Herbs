import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, ShoppingBag, Plus, Minus, CheckCircle, CreditCard } from 'lucide-react';
import { CartItem } from '../types';
import { handleImageError } from '../utils/imageUtils';
import { analytics } from '../utils/analytics';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: number, quantity: number, selectedWeight?: string) => void;
  onRemoveItem: (productId: number, selectedWeight?: string) => void;
  onClearCart: () => void;
  onGoToCheckout?: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onGoToCheckout,
}: CartDrawerProps) {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [shippingName, setShippingName] = useState('');
  const [shippingEmail, setShippingEmail] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bitcoin');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + (item.unitPrice !== undefined ? item.unitPrice : item.product.price) * item.quantity,
    0
  );

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    if (!shippingName.trim() || !shippingEmail.trim() || !shippingAddress.trim()) {
      setCheckoutError('Please fill out your name, email address, and complete delivery address.');
      return;
    }

    if (!shippingEmail.includes('@') || !shippingEmail.includes('.')) {
      setCheckoutError('Please enter a valid email address.');
      return;
    }

    setIsSubmittingOrder(true);

    const orderId = `GH-EXP-${Date.now().toString(36).toUpperCase()}`;
    const discount = paymentMethod === 'bitcoin' ? subtotal * 0.05 : 0;
    const shippingCost = subtotal >= 250 ? 0 : 19.99;
    const orderTotal = Math.max(0, subtotal - discount + shippingCost);

    try {
      await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          customerName: shippingName.trim(),
          customerEmail: shippingEmail.trim().toLowerCase(),
          customerPhone: shippingPhone.trim() || undefined,
          shippingAddress: shippingAddress.trim(),
          cartItems: cartItems.map((item, idx) => {
            const price = item.unitPrice !== undefined ? item.unitPrice : item.product.price;
            return {
              id: item.product.id || `ITEM-${idx + 1}`,
              name: item.product.name,
              variant: item.selectedWeight || undefined,
              quantity: item.quantity,
              price,
              total: price * item.quantity,
              image: item.product.image,
            };
          }),
          subtotal,
          discount,
          shippingCost,
          orderTotal,
          paymentMethod,
          orderNotes: 'Express Drawer Checkout Submission',
        }),
      });
    } catch (err) {
      console.error('[Express Checkout Error]', err);
    } finally {
      setIsSubmittingOrder(false);
      setCheckoutSuccess(true);
      setTimeout(() => {
        onClearCart();
        setCheckoutSuccess(false);
        setCheckoutMode(false);
        onClose();
      }, 4000);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 transition-opacity animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Drawer Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-full sm:max-w-md bg-white shadow-2xl z-50 flex flex-col h-full animate-slide-in text-left">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-heading font-bold text-base text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag size={18} className="text-emerald-800" />
            <span>Shopping Cart</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition"
            aria-label="Close cart drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Screen */}
        {checkoutSuccess ? (
          <div className="flex-grow p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mb-2 animate-bounce">
              <CheckCircle size={36} />
            </div>
            <h4 className="font-heading font-bold text-lg text-gray-900">
              Order Registered Successfully!
            </h4>
            <p className="text-xs text-gray-500 max-w-xs leading-relaxed font-semibold">
              Thank you for ordering with Global Herbs. Our dispatch managers have received your invoice.
              You will receive payment and delivery tracking instructions shortly.
            </p>
          </div>
        ) : (
          <>
            {/* Scrollable Body */}
            <div className="flex-grow overflow-y-auto p-5">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 text-gray-400 space-y-4">
                  <ShoppingBag size={64} className="stroke-1 opacity-25" />
                  <div>
                    <h4 className="font-heading font-bold text-sm text-gray-800 uppercase tracking-wider">
                      Your Cart is Empty
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Choose from our AAA+ products to fill your order.
                    </p>
                  </div>
                </div>
              ) : checkoutMode ? (
                /* Inline Checkout Form */
                <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs font-semibold text-gray-700">
                  <div className="pb-2 border-b border-gray-100">
                    <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-emerald-800">
                      Discreet Delivery Invoice
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Double-vacuum package with complete safety.
                    </p>
                  </div>

                  {checkoutError && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">
                      {checkoutError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label htmlFor="shipping_name" className="block text-gray-600 uppercase tracking-wider">
                      Recipient Delivery Name *
                    </label>
                    <input
                      type="text"
                      id="shipping_name"
                      required
                      value={shippingName}
                      onChange={(e) => setShippingName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full border border-gray-200 px-3.5 py-2 rounded-lg bg-gray-50 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="shipping_email" className="block text-gray-600 uppercase tracking-wider">
                      Email Address (For Invoice &amp; Courier Updates) *
                    </label>
                    <input
                      type="email"
                      id="shipping_email"
                      required
                      value={shippingEmail}
                      onChange={(e) => setShippingEmail(e.target.value)}
                      placeholder="e.g. john@example.com"
                      className="w-full border border-gray-200 px-3.5 py-2 rounded-lg bg-gray-50 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="shipping_phone" className="block text-gray-600 uppercase tracking-wider">
                      Phone Number (Optional, for SMS Courier Alerts)
                    </label>
                    <input
                      type="tel"
                      id="shipping_phone"
                      value={shippingPhone}
                      onChange={(e) => setShippingPhone(e.target.value)}
                      placeholder="e.g. +1 (555) 000-0000"
                      className="w-full border border-gray-200 px-3.5 py-2 rounded-lg bg-gray-50 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="shipping_address" className="block text-gray-600 uppercase tracking-wider">
                      Complete Shipping Address *
                    </label>
                    <input
                      type="text"
                      id="shipping_address"
                      required
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Street address, City, ZIP / Postcode"
                      className="w-full border border-gray-200 px-3.5 py-2 rounded-lg bg-gray-50 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-gray-600 uppercase tracking-wider">
                      Discreet Payment Method *
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <label className={`border rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition ${
                        paymentMethod === 'bitcoin'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}>
                        <input
                          type="radio"
                          name="payment"
                          value="bitcoin"
                          checked={paymentMethod === 'bitcoin'}
                          onChange={() => setPaymentMethod('bitcoin')}
                          className="sr-only"
                        />
                        <span className="font-bold text-[11px] uppercase tracking-wider">Bitcoin / Crypto</span>
                        <span className="text-[9px] text-gray-400">-5% Promo Discount</span>
                      </label>

                      <label className={`border rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition ${
                        paymentMethod === 'interac'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}>
                        <input
                          type="radio"
                          name="payment"
                          value="interac"
                          checked={paymentMethod === 'interac'}
                          onChange={() => setPaymentMethod('interac')}
                          className="sr-only"
                        />
                        <span className="font-bold text-[11px] uppercase tracking-wider">Interac E-Transfer</span>
                        <span className="text-[9px] text-gray-400">Standard Processing</span>
                      </label>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg space-y-1.5 border border-gray-100 mt-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Items Total:</span>
                      <span className="font-bold text-gray-800">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Delivery Fee:</span>
                      <span className="font-bold">{subtotal >= 250 ? 'FREE' : formatPrice(20)}</span>
                    </div>
                    {paymentMethod === 'bitcoin' && (
                      <div className="flex justify-between text-red-600">
                        <span>Crypto Discount (5%):</span>
                        <span className="font-bold">-{formatPrice(subtotal * 0.05)}</span>
                      </div>
                    )}
                    <div className="divider my-1"></div>
                    <div className="flex justify-between text-xs font-bold text-gray-900 pt-1">
                      <span>Order Total:</span>
                      <span>
                        {formatPrice(
                          subtotal +
                          (subtotal >= 250 ? 0 : 20) -
                          (paymentMethod === 'bitcoin' ? subtotal * 0.05 : 0)
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutMode(false)}
                      className="flex-1 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-bold transition uppercase tracking-wider cursor-pointer text-center"
                    >
                      Back to Cart
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingOrder}
                      className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold rounded-lg transition uppercase tracking-wider cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {isSubmittingOrder ? (
                        <span>Registering...</span>
                      ) : (
                        <span>Submit Order</span>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Cart Items List */
                <ul className="space-y-4">
                  {cartItems.map((item) => {
                    const itemUnitPrice = item.unitPrice !== undefined ? item.unitPrice : item.product.price;
                    const itemKey = `${item.product.id}-${item.selectedWeight || 'default'}`;
                    const weightLabel = item.selectedWeight || item.product.weight;

                    return (
                      <li
                        key={itemKey}
                        className="flex gap-4 pb-4 border-b border-gray-100 last:border-b-0"
                      >
                        {/* Image */}
                        <div className="w-16 h-20 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={(e) => handleImageError(e, item.product.category, item.product.name)}
                          />
                        </div>

                        {/* Info & Quantity controls */}
                        <div className="flex-grow flex flex-col justify-between py-0.5">
                          <div>
                            <h4 className="font-heading font-bold text-xs text-gray-900 line-clamp-1">
                              {item.product.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                                {item.product.category}
                              </span>
                              {weightLabel && (
                                <span className="text-[9px] font-extrabold text-emerald-900 bg-emerald-100 px-1.5 py-0.2 rounded">
                                  {weightLabel}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Adjust qty & price */}
                          <div className="flex justify-between items-center mt-2">
                            <div className="flex items-center border border-gray-200 rounded-md bg-gray-50">
                              <button
                                onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1, item.selectedWeight)}
                                className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-150 rounded-l transition cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="px-2.5 text-[11px] font-bold text-gray-800">{item.quantity}</span>
                              <button
                                onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.selectedWeight)}
                                className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-150 rounded-r transition cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                <Plus size={10} />
                              </button>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-xs font-bold text-gray-900 block">
                                  {formatPrice(itemUnitPrice * item.quantity)}
                                </span>
                                {item.quantity > 1 && (
                                  <span className="text-[9px] text-gray-400 font-medium block">
                                    ({formatPrice(itemUnitPrice)} ea)
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => onRemoveItem(item.product.id, item.selectedWeight)}
                                className="text-gray-400 hover:text-red-500 transition cursor-pointer"
                                aria-label="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Subtotal & Action buttons in Footer */}
            {cartItems.length > 0 && !checkoutMode && (
              <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
                <div className="flex justify-between items-center text-sm font-bold text-gray-900">
                  <span>{t('cart.subtotal', 'Subtotal')}:</span>
                  <span className="text-base text-emerald-800">{formatPrice(subtotal)}</span>
                </div>
                <p className="text-[10px] text-gray-400 font-semibold text-center leading-relaxed">
                  We discreetly process your packages. Deliveries are packaged in plain boxes with smell-proof bags.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={onClearCart}
                    className="flex-1 py-3 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition text-center cursor-pointer"
                  >
                    Clear Cart
                  </button>
                  <button
                    onClick={() => {
                      analytics.beginCheckout(cartItems, subtotal);
                      onClose();
                      if (onGoToCheckout) {
                        onGoToCheckout();
                      }
                      navigate('/checkout');
                    }}
                    className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition transform active:scale-95 duration-100 text-center cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CreditCard size={15} />
                    <span>Proceed to Checkout</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

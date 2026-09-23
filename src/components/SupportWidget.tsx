import React, { useState } from 'react';
import { MessageSquare, X, Send, CheckCircle2, Phone, Mail, Clock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('Product Consultation & Advice');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMessage('Please provide your name, email, and message.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          subject: `[${topic}] Inquire from ${name.trim()}`,
          message: message.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setIsSuccess(true);
        setName('');
        setEmail('');
        setPhone('');
        setMessage('');
        setTimeout(() => {
          setIsSuccess(false);
          setIsOpen(false);
        }, 4000);
      } else {
        setErrorMessage(data.error || 'Unable to deliver message. Please try again.');
      }
    } catch {
      setErrorMessage('Network connection error. Please try again or email us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom-Left) */}
      <div className="fixed bottom-20 md:bottom-6 left-3 sm:left-6 z-40">
        <button
          id="support-widget-trigger-btn"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer font-bold text-xs uppercase tracking-wider group focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 min-h-[44px]"
          aria-label="Open support and inquiries desk"
        >
          <div className="relative">
            <MessageSquare size={17} className="group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <span className="hidden sm:inline">Ask / Inquire</span>
        </button>
      </div>

      {/* Support Dialog Drawer / Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            />

            {/* Dialog Panel */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 max-h-[88vh] sm:max-h-[90vh] flex flex-col text-left pb-[env(safe-area-inset-bottom,0px)]"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-base tracking-tight text-white leading-tight">
                      Dispensary Inquiries &amp; Support
                    </h3>
                    <p className="text-[11px] text-emerald-200">
                      Direct notification to admin desk (Replies directly to your inbox)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                  aria-label="Close inquiry dialog"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4 text-xs">
                {/* Fast Contact Reference */}
                <div className="grid grid-cols-2 gap-2 bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-[11px]">
                  <a
                    href="tel:+12132801161"
                    className="flex items-center gap-2 text-emerald-900 hover:text-emerald-700 font-semibold"
                  >
                    <Phone size={13} className="text-emerald-700" />
                    <span>+1 (213) 280-1161</span>
                  </a>
                  <a
                    href="mailto:globalherbsinc@gmail.com"
                    className="flex items-center gap-2 text-emerald-900 hover:text-emerald-700 font-semibold truncate"
                  >
                    <Mail size={13} className="text-emerald-700 flex-shrink-0" />
                    <span className="truncate">globalherbsinc@gmail.com</span>
                  </a>
                </div>

                {isSuccess ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-2 py-8">
                    <CheckCircle2 size={36} className="text-emerald-700 mx-auto" />
                    <h4 className="font-heading font-bold text-sm text-emerald-900">
                      Message Dispatched to Admin Desk!
                    </h4>
                    <p className="text-xs text-emerald-700 leading-relaxed max-w-sm mx-auto">
                      Thank you! Your inquiry has been routed straight to our dispatch administration team.
                      We will review your notes and reply directly to your email address.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {errorMessage && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
                        {errorMessage}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="widget-name" className="block font-bold text-gray-700 uppercase tracking-wider mb-1 text-[10px]">
                          Your Name *
                        </label>
                        <input
                          id="widget-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alex Green"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                        />
                      </div>

                      <div>
                        <label htmlFor="widget-email" className="block font-bold text-gray-700 uppercase tracking-wider mb-1 text-[10px]">
                          Your Email (For Direct Reply) *
                        </label>
                        <input
                          id="widget-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. alex@example.com"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="widget-phone" className="block font-bold text-gray-700 uppercase tracking-wider mb-1 text-[10px]">
                          Phone (Optional)
                        </label>
                        <input
                          id="widget-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +1 (555) 000-0000"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                        />
                      </div>

                      <div>
                        <label htmlFor="widget-topic" className="block font-bold text-gray-700 uppercase tracking-wider mb-1 text-[10px]">
                          Inquiry Topic *
                        </label>
                        <select
                          id="widget-topic"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 text-gray-800"
                        >
                          <option value="Product Consultation & Advice">Product Consultation &amp; Advice</option>
                          <option value="Shipping & Stealth Delivery">Shipping &amp; Stealth Delivery</option>
                          <option value="Payment & Crypto Guide">Payment &amp; Crypto Guide</option>
                          <option value="Order Status & Tracking">Order Status &amp; Tracking</option>
                          <option value="Wholesale / Bulk Dispensary Order">Wholesale / Bulk Dispensary Order</option>
                          <option value="Other Question">Other Question</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="widget-message" className="block font-bold text-gray-700 uppercase tracking-wider mb-1 text-[10px]">
                        Your Inquiry / Question *
                      </label>
                      <textarea
                        id="widget-message"
                        required
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message, strain recommendation request, delivery inquiry..."
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <ShieldCheck size={13} className="text-emerald-700" />
                        <span>Discreet &amp; confidential communication</span>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white rounded-xl font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-60 text-[11px]"
                      >
                        {isSubmitting ? (
                          <span>Sending...</span>
                        ) : (
                          <>
                            <Send size={13} /> Send Inquiry
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Footer reassurance */}
              <div className="bg-gray-50 border-t border-gray-100 px-6 py-2.5 flex items-center justify-between text-[10px] text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-emerald-700" />
                  <span>Mon – Sat: 24/7 Dispatch Desk</span>
                </div>
                <span>Cave Junction, Oregon</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

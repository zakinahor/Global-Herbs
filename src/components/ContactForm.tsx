import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle, Phone, User, Tag, Sparkles } from 'lucide-react';
import { analytics } from '../utils/analytics';

export default function ContactForm() {
  // Support Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('Product Question');
  const [message, setMessage] = useState('');
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true);
  const [sendingContact, setSendingContact] = useState(false);
  const [contactResult, setContactResult] = useState<{ success: boolean; text: string } | null>(null);

  // Subscription Form State
  const [subEmail, setSubEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subResult, setSubResult] = useState<{ success: boolean; text: string; discountCode?: string } | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName || !cleanEmail || !message.trim()) {
      setContactResult({ success: false, text: 'Please fill in your name, email, and message.' });
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setContactResult({ success: false, text: 'Please enter a valid email address.' });
      return;
    }

    setSendingContact(true);
    setContactResult(null);

    const firstName = cleanName.split(' ')[0] || cleanName;

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          phone: phone.trim() || undefined,
          subject,
          message: message.trim(),
          subscribeNewsletter,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setContactResult({
          success: true,
          text: data.message || `Thank you, ${firstName}! Your inquiry was received. We will get back to you shortly.`,
        });

        // Reset inputs
        setName('');
        setEmail('');
        setPhone('');
        setMessage('');
      } else {
        setContactResult({
          success: false,
          text: data.error || 'Failed to submit inquiry. Please try again.',
        });
      }
    } catch (err: any) {
      setContactResult({
        success: false,
        text: 'Network error communicating with contact service. Please try again later.',
      });
    } finally {
      setSendingContact(false);
    }
  };

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSubEmail = subEmail.trim().toLowerCase();

    if (!cleanSubEmail || !cleanSubEmail.includes('@') || !cleanSubEmail.includes('.')) {
      setSubResult({ success: false, text: 'Please enter a valid email address.' });
      return;
    }

    setSubscribing(true);
    setSubResult(null);

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanSubEmail,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubResult({
          success: true,
          text: `Subscribed! Your VIP 15% discount coupon is active.`,
          discountCode: 'HERBS15OFF',
        });
        setSubEmail('');
      } else {
        setSubResult({
          success: false,
          text: data.error || 'Failed to complete subscription. Please try again.',
        });
      }
    } catch (err) {
      setSubResult({
        success: false,
        text: 'Network error connecting to subscription service. Please try again later.',
      });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <section id="contact-section" className="bg-gray-50 border-y border-gray-100 py-16">
      <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-12 gap-12">
        
        {/* Support & Orders Inquiry Form (Col 7) */}
        <div className="md:col-span-7 bg-white p-8 rounded-2xl border border-gray-100 shadow-xs text-left">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Sparkles size={11} className="text-emerald-700" />
                Direct Support &amp; Assistance
              </span>
            </div>
            <h3 className="font-heading font-bold text-xl text-gray-900 mb-2">
              Have Questions or Need an Account? Send Us an Inquiry
            </h3>
            <p className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 font-semibold mb-4 flex items-center gap-2">
              <Mail size={14} className="text-emerald-700 flex-shrink-0" />
              <span>Our support team attends to inquiries within 1-2 hours. Submitting this form alerts our dispensary admin desk immediately.</span>
            </p>
          </div>

          <form id="direct-contact-form" onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="contact_name" className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="contact_name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    className="w-full border border-gray-200 pl-9 pr-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                  <User size={14} className="absolute left-3 top-3.5 text-gray-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="contact_email" className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="contact_email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                    required
                    className="w-full border border-gray-200 pl-9 pr-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                  <Mail size={14} className="absolute left-3 top-3.5 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="contact_phone" className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Phone (Optional for SMS Alerts)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="contact_phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 019-2834"
                    className="w-full border border-gray-200 pl-9 pr-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  />
                  <Phone size={14} className="absolute left-3 top-3.5 text-gray-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="contact_subject" className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Inquiry Topic *
                </label>
                <div className="relative">
                  <select
                    id="contact_subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2.5 text-sm rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                  >
                    <option value="Product Question">Product &amp; Strain Inquiry</option>
                    <option value="Account Creation Request">Account Creation &amp; Wholesale Registration</option>
                    <option value="Product Custom Order Query">Custom Product Request / Query</option>
                    <option value="Shipping Status">Shipping &amp; Stealth Tracking Update</option>
                    <option value="Bulk Discount">Bulk Orders Discount Request</option>
                    <option value="Payment Issue">Payment Support &amp; Alt Currencies</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="contact_message" className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                Message / Order Request Details *
              </label>
              <textarea
                id="contact_message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your strain inquiries, custom requests, or shipping questions here..."
                required
                rows={4}
                className="w-full border border-gray-200 px-4 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              ></textarea>
            </div>

            {/* Results Alert banner */}
            {contactResult && (
              <div
                id="contact-result-alert"
                className={`p-4 rounded-lg flex items-start gap-2.5 text-xs font-semibold ${
                  contactResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {contactResult.success ? <CheckCircle2 size={18} className="text-emerald-700 flex-shrink-0" /> : <AlertCircle size={18} className="text-red-700 flex-shrink-0" />}
                <div className="space-y-1">
                  <p>{contactResult.text}</p>
                </div>
              </div>
            )}

            <button
              id="submit_contact_button"
              type="submit"
              disabled={sendingContact}
              className={`w-full sm:w-auto px-7 py-3 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-xs flex items-center justify-center gap-2 transition active:scale-95 duration-100 cursor-pointer ${
                sendingContact
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-emerald-800 hover:bg-emerald-900'
              }`}
            >
              <Send size={13} />
              <span>{sendingContact ? 'Sending Message...' : 'Send Message'}</span>
            </button>
          </form>
        </div>

        {/* Subscription Newsletter Form & Contact coordinates (Col 5) */}
        <div className="md:col-span-5 flex flex-col justify-between text-left space-y-8">
          {/* Support Contacts */}
          <div>
            <h3 className="font-heading font-bold text-lg text-gray-900 mb-4">
              Wholesale &amp; Direct Support
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              We offer wholesale bulk rates for dispensaries, pharmacies, and verified researchers.
              Get custom vacuum-sealed packages up to 5kg with complete security assurance.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-gray-700">
              <li>
                 <strong>Support Phone: </strong>
                <a href="tel:+12132801161" className="text-emerald-700 hover:underline">+1 (213) 280-1161</a>
              </li>
              <li>
                <strong>Order Support Email: </strong>
                <a href="mailto:globalherbsinc@gmail.com" className="text-emerald-700 hover:underline">
                  globalherbsinc@gmail.com
                </a>
              </li>
              <li>
                <strong>Dispatch Center: </strong>
                <span className="text-gray-500">238 Cedar Brook Ln, Cave Junction, OR 97523</span>
              </li>
            </ul>
          </div>

          {/* Subscribe Promo Card */}
          <div className="bg-emerald-950 text-white p-6 rounded-2xl shadow-md border border-emerald-900 flex flex-col justify-between">
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-900/50 text-emerald-300 rounded border border-emerald-800 text-[9px] font-bold uppercase tracking-wider mb-2">
                VIP Members Club
              </div>
              <h3 className="font-heading font-bold text-base text-white">
                Unlock Secret Coupon Codes
              </h3>
              <p className="text-[11px] text-emerald-200 mt-1">
                Subscribe to receive 15% off coupon codes and notifications about flash specials on flowers.
              </p>
            </div>

            <form id="newsletter-form" onSubmit={handleSubscribeSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  id="newsletter_sub_email"
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full bg-emerald-900/40 border border-emerald-800 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-emerald-400 focus:outline-none focus:ring-1 focus:ring-brand-green focus:border-brand-green"
                />
                <Mail size={14} className="absolute left-3.5 top-3 text-emerald-400" />
              </div>

              {subResult && (
                <div className={`p-2.5 rounded-lg text-xs font-semibold ${subResult.success ? 'bg-emerald-900/80 border border-emerald-700 text-emerald-200' : 'bg-red-950/80 border border-red-800 text-red-200'}`}>
                  <p className="text-[11px]">{subResult.text}</p>
                  {subResult.discountCode && (
                    <div className="mt-1.5 inline-block bg-emerald-500/20 border border-emerald-400/50 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-emerald-300 tracking-wider">
                      Code: {subResult.discountCode}
                    </div>
                  )}
                </div>
              )}

              <button
                id="newsletter_submit_button"
                type="submit"
                disabled={subscribing}
                className={`w-full py-2.5 px-4 rounded-lg font-bold text-[10px] uppercase tracking-wider text-emerald-950 transition cursor-pointer active:scale-95 duration-100 ${
                  subscribing
                    ? 'bg-emerald-800 text-emerald-400 cursor-not-allowed'
                    : 'bg-brand-green hover:bg-brand-green-hover text-emerald-950 font-bold shadow-xs'
                }`}
              >
                {subscribing ? 'Subscribing...' : 'Get Discount Code'}
              </button>
            </form>
          </div>

        </div>

      </div>
    </section>
  );
}


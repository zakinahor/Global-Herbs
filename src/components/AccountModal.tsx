import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  LogIn,
  CheckCircle2,
  Mail,
  Shield,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Package,
  MapPin,
  Phone,
  LogOut,
  Save,
  Clock,
  Sparkles,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth, MemberOrder } from '../context/AuthContext';
import { analytics } from '../utils/analytics';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const {
    user,
    isLoggedIn,
    login,
    register,
    logout,
    updateProfile,
    getMyOrders,
    modalTab,
    setModalTab,
  } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regAccountType, setRegAccountType] = useState('Personal Dispensary Member');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');

  // Profile edit state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Orders state
  const [myOrders, setMyOrders] = useState<MemberOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Inquiry state
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquirySubject, setInquirySubject] = useState('Dispensary Account & Product Consultation');
  const [inquiryMessage, setInquiryMessage] = useState('');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string | null>(null);

  // Sync profile edit state when user changes
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditAddress(user.deliveryAddress || '');
      setEditNotes(user.notes || '');
      setInquiryName(user.name || '');
      setInquiryEmail(user.email || '');
    }
  }, [user]);

  // Load orders when on profile tab
  useEffect(() => {
    if (isLoggedIn && modalTab === 'profile') {
      setOrdersLoading(true);
      getMyOrders()
        .then((orders) => setMyOrders(orders))
        .finally(() => setOrdersLoading(false));
    }
  }, [isLoggedIn, modalTab]);

  if (!isOpen) return null;

  // Handle Login Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setFeedback({ success: false, text: 'Please provide both email and password.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    setForgotPasswordMessage(null);

    const res = await login(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ success: true, text: res.message || 'Successfully logged in!' });
      analytics.identify({ email: loginEmail.trim().toLowerCase() });
      setLoginPassword('');
    } else {
      setFeedback({ success: false, text: res.error || 'Invalid credentials. Please try again.' });
    }
  };

  // Handle Register Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setFeedback({ success: false, text: 'Please complete all required fields.' });
      return;
    }

    if (regPassword.length < 6) {
      setFeedback({ success: false, text: 'Password must be at least 6 characters long.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await register({
      name: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
      accountType: regAccountType,
      phone: regPhone.trim() || undefined,
      deliveryAddress: regAddress.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      setFeedback({
        success: true,
        text: `Welcome, ${regName}! Your account has been registered and you are now logged in.`,
      });
      analytics.identify({
        email: regEmail.trim().toLowerCase(),
        firstName: regName.split(' ')[0],
        lastName: regName.split(' ').slice(1).join(' '),
      });
      setRegPassword('');
    } else {
      setFeedback({ success: false, text: res.error || 'Failed to create account.' });
    }
  };

  // Handle Profile Update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSaveSuccess(false);
    setProfileError(null);

    const res = await updateProfile({
      name: editName.trim(),
      phone: editPhone.trim(),
      deliveryAddress: editAddress.trim(),
      notes: editNotes.trim(),
    });

    setProfileSaving(false);
    if (res.success) {
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3500);
    } else {
      setProfileError(res.error || 'Could not save profile changes.');
      setTimeout(() => setProfileError(null), 4000);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async () => {
    const emailToUse = loginEmail.trim() || user?.email;
    if (!emailToUse) {
      setFeedback({ success: false, text: 'Please enter your registered email address above first.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse }),
      });
      const data = await response.json();
      setForgotPasswordMessage(data.message || 'Password assistance request dispatched to admin desk.');
    } catch {
      setForgotPasswordMessage('Could not reach password reset service. Please email globalherbsinc@gmail.com directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Inquiry Submit
  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryEmail.trim() || !inquiryMessage.trim()) {
      setFeedback({ success: false, text: 'Please enter your email and message.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inquiryName.trim() || 'Valued Member',
          email: inquiryEmail.trim().toLowerCase(),
          subject: inquirySubject,
          message: inquiryMessage.trim(),
          type: 'account-inquiry',
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setFeedback({
          success: true,
          text: `Inquiry sent! Our dispatch team has received your message at globalherbsinc@gmail.com and will reply to ${inquiryEmail}.`,
        });
        setInquiryMessage('');
      } else {
        setFeedback({ success: false, text: data.error || 'Failed to dispatch message.' });
      }
    } catch {
      setFeedback({ success: false, text: 'Network connection issue. Please retry.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 animate-fade-in text-left">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden relative max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white px-6 py-4 flex justify-between items-center relative flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Shield className="text-emerald-400" size={18} />
              <h3 className="font-heading font-extrabold text-base uppercase tracking-tight">
                Global Herbs Member Portal
              </h3>
            </div>
            <p className="text-[11px] text-emerald-200">
              {isLoggedIn ? `Authenticated as ${user?.email}` : 'Access your member profile, order tracking & dispensary perks'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-100 bg-gray-50 text-xs font-bold uppercase tracking-wider flex-shrink-0 overflow-x-auto">
          {isLoggedIn ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setModalTab('profile');
                  setFeedback(null);
                }}
                className={`flex-1 py-3 px-3 text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  modalTab === 'profile'
                    ? 'border-emerald-800 text-emerald-900 bg-white font-black'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <User size={14} className="text-emerald-700" />
                <span>My Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTab('inquiry');
                  setFeedback(null);
                }}
                className={`flex-1 py-3 px-3 text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  modalTab === 'inquiry'
                    ? 'border-emerald-800 text-emerald-900 bg-white font-black'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <HelpCircle size={14} />
                <span>Dispensary Support</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setModalTab('login');
                  setFeedback(null);
                  setForgotPasswordMessage(null);
                }}
                className={`flex-1 py-3 px-3 text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  modalTab === 'login'
                    ? 'border-emerald-800 text-emerald-900 bg-white font-black'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <LogIn size={14} className="text-emerald-700" />
                <span>Sign In (Existing)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTab('register');
                  setFeedback(null);
                  setForgotPasswordMessage(null);
                }}
                className={`flex-1 py-3 px-3 text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  modalTab === 'register'
                    ? 'border-emerald-800 text-emerald-900 bg-white font-black'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <UserPlus size={14} className="text-emerald-700" />
                <span>Create Account</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTab('inquiry');
                  setFeedback(null);
                  setForgotPasswordMessage(null);
                }}
                className={`flex-1 py-3 px-3 text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  modalTab === 'inquiry'
                    ? 'border-emerald-800 text-emerald-900 bg-white font-black'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <HelpCircle size={14} />
                <span>Ask Question</span>
              </button>
            </>
          )}
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-grow space-y-4 text-xs">
          {/* Status feedback alerts */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 ${
                feedback.success
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              {feedback.success ? (
                <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-700 flex-shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* TAB 1: LOG IN FOR RETURNING USERS */}
          {!isLoggedIn && modalTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 text-emerald-900 text-[11px] font-medium leading-relaxed">
                Welcome back! Sign in with your registered dispensary credentials to access your order records, saved delivery addresses, and VIP discounts.
              </div>

              <div className="space-y-1">
                <label htmlFor="login_email" className="block font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="login_email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="e.g. member@example.com"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label htmlFor="login_password" className="block font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] text-emerald-800 hover:text-emerald-950 font-bold hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    id="login_password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {forgotPasswordMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-medium">
                  {forgotPasswordMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold rounded-xl uppercase tracking-wider transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 text-xs shadow-xs"
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <LogIn size={15} />
                    <span>Log In to Dispensary Account</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-[11px] text-gray-500 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                <span>Don't have an account yet?</span>
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('register');
                    setFeedback(null);
                  }}
                  className="text-emerald-800 font-bold hover:underline cursor-pointer"
                >
                  Create a New Member Account
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SIGN UP / REGISTRATION */}
          {!isLoggedIn && modalTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 text-emerald-900 text-[11px] font-medium leading-relaxed">
                Join Global Herbs Dispensary to enjoy discrete express packaging, member-only wholesale pricing, order history tracking, and automatic checkout presets.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="reg_name" className="block font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="reg_name"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="reg_email" className="block font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="reg_email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="reg_password" className="block font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                    Create Password (Min 6 chars) *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      id="reg_password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium text-xs pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="reg_account_type" className="block font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                    Account Tier
                  </label>
                  <select
                    id="reg_account_type"
                    value={regAccountType}
                    onChange={(e) => setRegAccountType(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium text-xs"
                  >
                    <option value="Personal Dispensary Member">Personal Dispensary Client</option>
                    <option value="Medical & Therapeutic Patient">Medical &amp; Therapeutic Patient</option>
                    <option value="VIP Connoisseur Club">VIP Connoisseur Club (15% Off)</option>
                    <option value="Wholesale & Bulk Purchaser">Wholesale &amp; Bulk Purchaser</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="reg_phone" className="block font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                    Phone (Optional, for SMS courier updates)
                  </label>
                  <input
                    type="tel"
                    id="reg_phone"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 000-0000"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="reg_address" className="block font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                    Default Delivery Address (Optional)
                  </label>
                  <input
                    type="text"
                    id="reg_address"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="e.g. 123 Main St, Portland, OR 97201"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold rounded-xl uppercase tracking-wider transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 text-xs shadow-xs"
              >
                {isSubmitting ? (
                  <span>Registering Member Account...</span>
                ) : (
                  <>
                    <UserPlus size={15} />
                    <span>Create Account &amp; Log In</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-[11px] text-gray-500 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                <span>Already have an account?</span>
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('login');
                    setFeedback(null);
                  }}
                  className="text-emerald-800 font-bold hover:underline cursor-pointer"
                >
                  Log In with Your Credentials
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: LOGGED-IN MEMBER DASHBOARD */}
          {isLoggedIn && user && modalTab === 'profile' && (
            <div className="space-y-5">
              {/* Member Card */}
              <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 text-emerald-300 font-black text-xl flex items-center justify-center border border-white/20 shadow-inner">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading font-extrabold text-base text-white">{user.name}</h4>
                        <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Active Member
                        </span>
                      </div>
                      <p className="text-xs text-emerald-200">{user.email}</p>
                      <span className="inline-block mt-1 bg-white/15 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-md">
                        {user.accountType || 'Personal Dispensary Account'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={logout}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-200 hover:text-white bg-red-950/40 hover:bg-red-900/60 px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Log Out</span>
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-emerald-100">
                  <div>
                    <span className="text-emerald-300 block">Member ID:</span>
                    <span className="font-mono font-bold text-white">{user.id}</span>
                  </div>
                  <div>
                    <span className="text-emerald-300 block">Stealth Packaging:</span>
                    <span className="font-bold text-white">Priority Discreet</span>
                  </div>
                  <div>
                    <span className="text-emerald-300 block">VIP Welcome Coupon:</span>
                    <span className="font-mono font-bold text-emerald-200">HERBS15OFF</span>
                  </div>
                </div>
              </div>

              {/* Saved Delivery Address & Profile Quick Update */}
              <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-800" />
                    <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                      Saved Delivery Details (Auto-fills Checkout)
                    </h5>
                  </div>
                  {profileSaveSuccess && (
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Saved!
                    </span>
                  )}
                  {profileError && (
                    <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                      <AlertCircle size={13} /> {profileError}
                    </span>
                  )}
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="e.g. +1 (555) 000-0000"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Default Shipping Address
                    </label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="e.g. 123 Main St, Portland, OR 97201"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Delivery Notes / Drop-off Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="e.g. Leave package by side porch door..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold rounded-xl uppercase tracking-wider transition cursor-pointer text-[11px] disabled:opacity-60"
                  >
                    <Save size={13} />
                    <span>{profileSaving ? 'Saving Changes...' : 'Save Delivery Profile'}</span>
                  </button>
                </form>
              </div>

              {/* Order History */}
              <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-emerald-800" />
                    <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                      Recent Orders ({myOrders.length})
                    </h5>
                  </div>
                  <a
                    href="/track"
                    className="text-[11px] text-emerald-800 hover:underline font-bold flex items-center gap-1"
                  >
                    <span>Full Tracking Tool</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {ordersLoading ? (
                  <div className="py-6 text-center text-gray-400">Loading order records...</div>
                ) : myOrders.length === 0 ? (
                  <div className="p-5 bg-gray-50 border border-gray-100 rounded-xl text-center space-y-2">
                    <Package size={28} className="text-gray-300 mx-auto" />
                    <p className="text-xs text-gray-600 font-semibold">No recent orders on file for this email.</p>
                    <p className="text-[11px] text-gray-400">
                      When you place an order at checkout, your itemized package tracking will show here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {myOrders.map((order) => (
                      <div
                        key={order.orderId}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between hover:bg-emerald-50/40 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-gray-900">{order.orderId}</span>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {order.status || 'Stealth Dispatched'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">{order.date || order.createdAt}</p>
                          <p className="text-[10px] text-gray-600 font-medium">
                            Tracking: <span className="font-mono text-emerald-800 font-bold">{order.trackingNumber}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-xs text-gray-900">
                            ${Number(order.orderTotal || 0).toFixed(2)}
                          </span>
                          <span className="block text-[10px] text-gray-400 uppercase">
                            {order.paymentMethod || 'BTC'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DISPENSARY CONSULTATION & INQUIRY */}
          {modalTab === 'inquiry' && (
            <form onSubmit={handleInquirySubmit} className="space-y-3.5">
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 text-emerald-900 text-[11px] font-medium leading-relaxed">
                Have questions about specific strain effects, bulk orders, payment via cryptocurrency, or discreet delivery methods?
                Write your message below. Our admin desk reviews and replies directly to your email.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={inquiryName}
                    onChange={(e) => setInquiryName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                    Your Email (For Direct Reply) *
                  </label>
                  <input
                    type="email"
                    required
                    value={inquiryEmail}
                    onChange={(e) => setInquiryEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                  Topic / Subject
                </label>
                <select
                  value={inquirySubject}
                  onChange={(e) => setInquirySubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium text-xs"
                >
                  <option value="Dispensary Account & Product Consultation">Dispensary Account &amp; Product Consultation</option>
                  <option value="Stealth Shipping & Tracking Help">Stealth Shipping &amp; Tracking Help</option>
                  <option value="Crypto Payment (BTC / USDT) Assistance">Crypto Payment (BTC / USDT) Assistance</option>
                  <option value="Wholesale & Bulk Inquiries">Wholesale &amp; Bulk Inquiries</option>
                  <option value="Other Member Inquiries">Other Member Inquiries</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                  Your Question or Request *
                </label>
                <textarea
                  rows={3}
                  required
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  placeholder="Describe your inquiry, strain preference, or questions..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold rounded-xl uppercase tracking-wider transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 text-xs shadow-xs"
              >
                {isSubmitting ? (
                  <span>Dispatching to Admin Desk...</span>
                ) : (
                  <>
                    <Mail size={15} />
                    <span>Send Message to globalherbsinc@gmail.com</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer reassurance banner */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-2.5 flex items-center justify-between text-[10px] text-gray-500 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-emerald-700" />
            <span>Mon – Sat: 24/7 Dispensing Service</span>
          </div>
          <span className="font-semibold text-emerald-800">Direct Admin Dispatch</span>
        </div>
      </div>
    </div>
  );
}

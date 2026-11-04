import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Package,
  Clock,
  Truck,
  MapPin,
  Lock,
  LogOut,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Eye,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Copy,
  Check,
  Send,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  Search,
  FileText,
  MailCheck,
} from 'lucide-react';
import { useAuth, MemberOrder, SavedAddress } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import SEOHead from '../SEOHead';
import COAModal from '../COAModal';

type DashboardTab =
  | 'overview'
  | 'orders'
  | 'tracking'
  | 'profile'
  | 'addresses'
  | 'security'
  | 'claim';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const {
    user,
    isLoggedIn,
    isLoading: isAuthLoading,
    isEmailVerified,
    logout,
    resendVerificationEmail,
    updateProfile,
    changePassword,
    saveDeliveryAddress,
    deleteDeliveryAddress,
    getMyOrders,
    claimGuestOrder,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Selected order for detailed modal
  const [selectedOrder, setSelectedOrder] = useState<MemberOrder | null>(null);

  // Verification banner feedback
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Personal Info form
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Change Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Saved Address modal/form
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrStreet1, setAddrStreet1] = useState('');
  const [addrStreet2, setAddrStreet2] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrZip, setAddrZip] = useState('');
  const [addrCountry, setAddrCountry] = useState('United States');
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);

  // Claim Order form
  const [claimOrderId, setClaimOrderId] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Tracking tab input
  const [trackingLookupId, setTrackingLookupId] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      navigate('/login?redirect=/account');
    }
  }, [isLoggedIn, isAuthLoading, navigate]);

  // Load profile inputs on user change
  useEffect(() => {
    if (user) {
      setNameInput(user.name || '');
      setPhoneInput(user.phone || '');
      setClaimEmail(user.email || '');
    }
  }, [user]);

  // Fetch orders
  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const list = await getMyOrders();
      setOrders(list);
    } catch (err) {
      console.error('[Dashboard] Error loading orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadOrders();
    }
  }, [isLoggedIn]);

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setResendStatus(null);
    const res = await resendVerificationEmail();
    setResendingEmail(false);
    if (res.success) {
      setResendStatus('Verification email dispatched! Please check your inbox.');
    } else {
      setResendStatus(res.error || 'Failed to dispatch verification email. Please try again later.');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    const res = await updateProfile({
      name: nameInput.trim(),
      phone: phoneInput.trim(),
    });
    setProfileSaving(false);
    if (res.success) {
      setProfileMsg({ text: 'Customer profile updated successfully!', isError: false });
    } else {
      setProfileMsg({ text: res.error || 'Failed to update profile.', isError: true });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'New password must be at least 6 characters.', isError: true });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({ text: 'Passwords do not match.', isError: true });
      return;
    }

    setPasswordSaving(true);
    const res = await changePassword(newPassword);
    setPasswordSaving(false);

    if (res.success) {
      setPasswordMsg({ text: 'Password successfully updated!', isError: false });
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setPasswordMsg({ text: res.error || 'Failed to update password.', isError: true });
    }
  };

  const handleOpenAddressModal = (addr?: SavedAddress) => {
    if (addr) {
      setEditingAddressId(addr.id || null);
      setAddrStreet1(addr.street1);
      setAddrStreet2(addr.street2 || '');
      setAddrCity(addr.city);
      setAddrState(addr.state);
      setAddrZip(addr.zipCode);
      setAddrCountry(addr.country || 'United States');
      setAddrIsDefault(Boolean(addr.isDefault));
    } else {
      setEditingAddressId(null);
      setAddrStreet1('');
      setAddrStreet2('');
      setAddrCity('');
      setAddrState('');
      setAddrZip('');
      setAddrCountry('United States');
      setAddrIsDefault((user?.savedAddresses || []).length === 0);
    }
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrStreet1.trim() || !addrCity.trim() || !addrState.trim() || !addrZip.trim()) {
      return;
    }

    setAddressSaving(true);
    const addressToSave: SavedAddress = {
      id: editingAddressId || `addr-${Date.now()}`,
      street1: addrStreet1.trim(),
      street2: addrStreet2.trim() || undefined,
      city: addrCity.trim(),
      state: addrState.trim(),
      zipCode: addrZip.trim(),
      country: addrCountry.trim(),
      isDefault: addrIsDefault,
    };

    await saveDeliveryAddress(addressToSave);
    setAddressSaving(false);
    setIsAddressModalOpen(false);
  };

  const handleDeleteAddress = async (idx: number) => {
    if (window.confirm('Are you sure you want to remove this delivery address?')) {
      await deleteDeliveryAddress(idx);
    }
  };

  const handleClaimOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimMsg(null);

    if (!claimOrderId.trim()) {
      setClaimMsg({ text: 'Please enter a valid Order Reference Number.', isError: true });
      return;
    }

    setClaimLoading(true);
    const res = await claimGuestOrder(claimOrderId.trim(), claimEmail.trim());
    setClaimLoading(false);

    if (res.success) {
      setClaimMsg({
        text: `Order #${claimOrderId.toUpperCase()} successfully linked to your customer account!`,
        isError: false,
      });
      setClaimOrderId('');
      loadOrders();
    } else {
      setClaimMsg({
        text: res.error || 'Failed to claim order. Please verify that the order email matches your verified account email.',
        isError: true,
      });
    }
  };

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Loading Customer Account...
          </p>
        </div>
      </div>
    );
  }

  // Calculate high-level stats
  const totalOrdersCount = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.orderTotal || 0), 0);
  const latestOrder = orders[0];

  return (
    <div className="min-h-[85vh] bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-left">
      <SEOHead
        customTitle="Customer Dashboard | Global Herbs Online Dispensary"
        customDescription="Manage your Global Herbs customer profile, view itemized past orders, track live stealth dispatches, and configure saved delivery addresses."
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Email Verification Banner if Unverified */}
        {!isEmailVerified && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl flex-shrink-0 mt-0.5">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="font-heading font-bold text-xs sm:text-sm text-amber-950 uppercase tracking-wider">
                  Email Verification Pending
                </h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Please verify your email address (<strong>{user.email}</strong>) to guarantee uninterrupted courier tracking alerts and express stealth order processing.
                </p>
                {resendStatus && (
                  <p className="text-xs font-bold text-emerald-800 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>{resendStatus}</span>
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleResendVerification}
              disabled={resendingEmail}
              className="whitespace-nowrap px-4 py-2 bg-amber-800 hover:bg-amber-900 active:scale-98 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {resendingEmail ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <MailCheck size={14} />
                  <span>Resend Verification Email</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-900 text-white font-heading font-extrabold text-2xl sm:text-3xl flex items-center justify-center shadow-md flex-shrink-0">
              {user.name ? user.name.charAt(0).toUpperCase() : 'G'}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                  {user.accountType}
                </span>
                {isEmailVerified ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200/70">
                    <CheckCircle2 size={11} />
                    Verified Member
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
                    Unverified
                  </span>
                )}
              </div>
              <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-gray-900 tracking-tight">
                Welcome back, {user.name}!
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {user.email} · Customer ID: <span className="font-mono text-[11px] text-gray-700 font-bold">{user.id.substring(0, 10)}...</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:self-center">
            <Link
              to="/products"
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag size={14} />
              <span>Shop Catalog</span>
            </Link>
            <button
              onClick={() => logout()}
              className="px-3.5 py-2.5 border border-gray-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-gray-600 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-1.5 shadow-xs overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 min-w-max">
            {[
              { id: 'overview', label: 'Overview', icon: Sparkles },
              { id: 'orders', label: `My Orders (${totalOrdersCount})`, icon: Package },
              { id: 'tracking', label: 'Order Tracking', icon: Truck },
              { id: 'profile', label: 'Personal Information', icon: User },
              { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
              { id: 'security', label: 'Change Password', icon: Lock },
              { id: 'claim', label: 'Claim Guest Orders', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DashboardTab)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Total Orders
                </span>
                <span className="font-heading font-extrabold text-2xl text-gray-900">
                  {totalOrdersCount}
                </span>
                <p className="text-[11px] text-gray-500 mt-1">Dispensary purchases</p>
              </div>

              <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Lifetime Total
                </span>
                <span className="font-heading font-extrabold text-2xl text-emerald-850">
                  {formatPrice(totalSpent)}
                </span>
                <p className="text-[11px] text-gray-500 mt-1">Settled &amp; processing</p>
              </div>

              <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Member Since
                </span>
                <span className="font-heading font-extrabold text-lg sm:text-xl text-gray-900 truncate block">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active 2026'}
                </span>
                <p className="text-[11px] text-gray-500 mt-1">Verified Client Account</p>
              </div>

              <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Packaging Protocol
                </span>
                <span className="font-heading font-bold text-sm text-emerald-800 flex items-center gap-1.5 mt-1">
                  <ShieldCheck size={16} />
                  <span>Double Vacuum Sealed</span>
                </span>
                <p className="text-[11px] text-gray-500 mt-1">Stealth Priority Courier</p>
              </div>
            </div>

            {/* Latest Order Snippet or Prompt */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-heading font-extrabold text-base text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Package size={17} className="text-emerald-800" />
                  <span>Recent Order Activity</span>
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Orders</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {latestOrder ? (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-900">
                        {latestOrder.orderId}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                        {latestOrder.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Placed on {latestOrder.date} · {latestOrder.items.length} item(s) · Total:{' '}
                      <strong className="text-emerald-900">{formatPrice(latestOrder.orderTotal)}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedOrder(latestOrder)}
                      className="px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                    >
                      <Eye size={13} />
                      <span>Details</span>
                    </button>
                    {latestOrder.trackingNumber && (
                      <button
                        onClick={() => {
                          setTrackingLookupId(latestOrder.orderId);
                          setActiveTab('tracking');
                        }}
                        className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                      >
                        <Truck size={13} />
                        <span>Track</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 space-y-2">
                  <ShoppingBag size={28} className="mx-auto text-gray-300" />
                  <p className="text-xs">No orders recorded yet under this customer account.</p>
                  <Link
                    to="/products"
                    className="inline-block px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                  >
                    Start Shopping
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: My Orders */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <div>
                  <h2 className="font-heading font-extrabold text-lg text-gray-900 tracking-tight">
                    Order History
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Itemized list of all dispensary orders placed with your verified customer credentials.
                  </p>
                </div>
                <button
                  onClick={loadOrders}
                  disabled={ordersLoading}
                  className="p-2 text-gray-500 hover:text-emerald-800 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  title="Refresh Orders"
                >
                  <RefreshCw size={16} className={ordersLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {ordersLoading ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <RefreshCw size={24} className="animate-spin mx-auto text-emerald-800" />
                  <p className="text-xs font-bold uppercase tracking-wider">Syncing Orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <Package size={32} className="mx-auto text-gray-300" />
                  <h3 className="font-heading font-bold text-sm text-gray-800">
                    No Orders Placed Yet
                  </h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Orders placed with this account will appear here immediately with live tracking and itemized receipts.
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <Link
                      to="/products"
                      className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs"
                    >
                      Browse Catalog
                    </Link>
                    <button
                      onClick={() => setActiveTab('claim')}
                      className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition"
                    >
                      Claim a Guest Order
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.orderId}
                      className="p-4 sm:p-5 rounded-xl border border-gray-200 hover:border-emerald-300 bg-white hover:bg-emerald-50/20 transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-extrabold text-gray-900">
                            {order.orderId}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                            {order.status}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">
                          Placed: {order.date}
                        </span>
                      </div>

                      {/* Items Preview */}
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs"
                          >
                            <span className="w-5 h-5 rounded-full bg-emerald-800 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                              {item.quantity}
                            </span>
                            <span className="font-medium text-gray-800 truncate flex-1">
                              {item.name}
                            </span>
                            {item.variant && (
                              <span className="text-[10px] text-gray-400 font-semibold">
                                ({item.variant})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">
                            Total:{' '}
                            <strong className="text-emerald-900 font-extrabold text-sm">
                              {formatPrice(order.orderTotal)}
                            </strong>
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className="text-gray-500 capitalize">
                            Method: <strong>{order.paymentMethod}</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Eye size={13} />
                            <span>View Invoice</span>
                          </button>
                          {order.trackingNumber && (
                            <button
                              onClick={() => {
                                setTrackingLookupId(order.orderId);
                                setActiveTab('tracking');
                              }}
                              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                            >
                              <Truck size={13} />
                              <span>Track Package</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Order Tracking */}
        {activeTab === 'tracking' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h2 className="font-heading font-extrabold text-lg text-gray-900 tracking-tight flex items-center gap-2">
                  <Truck size={20} className="text-emerald-800" />
                  <span>Stealth Express Live Tracking</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Check the live dispatch and delivery milestone status of any Global Herbs order.
                </p>
              </div>

              {/* Order Selection or Input */}
              <div className="max-w-xl flex gap-2">
                <input
                  type="text"
                  value={trackingLookupId}
                  onChange={(e) => setTrackingLookupId(e.target.value)}
                  placeholder="Enter Order ID (e.g. GH-179372... or GM-954724-HGE)"
                  className="flex-1 px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono text-gray-900"
                />
                <Link
                  to={`/track-order?orderId=${encodeURIComponent(trackingLookupId.trim())}`}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Search size={14} />
                  <span>Track</span>
                </Link>
              </div>

              {/* Quick List of Customer's Trackable Orders */}
              {orders.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                    Your Trackable Orders:
                  </h4>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {orders.map((o) => (
                      <button
                        key={o.orderId}
                        onClick={() => setTrackingLookupId(o.orderId)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          trackingLookupId === o.orderId
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <span className="font-mono text-xs font-bold text-gray-900 block truncate">
                          {o.orderId}
                        </span>
                        <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                          <span className="font-semibold">{o.date}</span>
                          <span className="text-emerald-800 font-bold">{o.status}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Personal Information */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 shadow-xs max-w-2xl space-y-6 animate-fade-in">
            <div>
              <h2 className="font-heading font-extrabold text-lg text-gray-900 tracking-tight flex items-center gap-2">
                <User size={19} className="text-emerald-800" />
                <span>Personal Information</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Update your account details and contact preferences stored in your customer profile.
              </p>
            </div>

            {profileMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                  profileMsg.isError
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                }`}
              >
                {profileMsg.isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Email Address <span className="text-gray-400 font-normal">(Primary Auth Identifier)</span>
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed font-medium"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  To change your verified email address, please contact support for identity confirmation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="py-2.5 px-6 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {profileSaving ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tab 5: Saved Delivery Addresses */}
        {activeTab === 'addresses' && (
          <div className="bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="font-heading font-extrabold text-lg text-gray-900 tracking-tight flex items-center gap-2">
                  <MapPin size={19} className="text-emerald-800" />
                  <span>Saved Delivery Addresses</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage stealth delivery destinations for express, one-click checkout.
                </p>
              </div>

              <button
                onClick={() => handleOpenAddressModal()}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>Add Address</span>
              </button>
            </div>

            {(!user.savedAddresses || user.savedAddresses.length === 0) ? (
              <div className="text-center py-12 text-gray-400 space-y-3">
                <MapPin size={32} className="mx-auto text-gray-300" />
                <p className="text-xs font-medium">No saved delivery addresses found.</p>
                <button
                  onClick={() => handleOpenAddressModal()}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  Add Your First Address
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {user.savedAddresses.map((addr, idx) => (
                  <div
                    key={addr.id || idx}
                    className={`p-4 rounded-xl border relative transition ${
                      addr.isDefault
                        ? 'bg-emerald-50/50 border-emerald-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {addr.isDefault && (
                      <span className="absolute top-3 right-3 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-800 text-white">
                        Default
                      </span>
                    )}

                    <h4 className="font-heading font-bold text-xs text-gray-900 mb-1">
                      {addr.name || user.name}
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {addr.street1}
                      {addr.street2 && <>, {addr.street2}</>}
                      <br />
                      {addr.city}, {addr.state} {addr.zipCode}
                      <br />
                      {addr.country}
                    </p>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <button
                        onClick={() => handleOpenAddressModal(addr)}
                        className="text-gray-500 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(idx)}
                        className="text-gray-400 hover:text-red-600 cursor-pointer"
                        title="Delete Address"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Change Password */}
        {activeTab === 'security' && (
          <div className="bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 shadow-xs max-w-xl space-y-6 animate-fade-in">
            <div>
              <h2 className="font-heading font-extrabold text-lg text-gray-900 tracking-tight flex items-center gap-2">
                <Lock size={19} className="text-emerald-800" />
                <span>Change Password</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Update your account password. For security, choose a phrase of at least 6 characters with mixed symbols and numbers.
              </p>
            </div>

            {passwordMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                  passwordMsg.isError
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                }`}
              >
                {passwordMsg.isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={passwordSaving}
                className="py-2.5 px-6 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {passwordSaving ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tab 7: Claim Guest Orders */}
        {activeTab === 'claim' && (
          <div className="bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 shadow-xs max-w-2xl space-y-6 animate-fade-in">
            <div>
              <h2 className="font-heading font-extrabold text-lg text-gray-900 tracking-tight flex items-center gap-2">
                <FileText size={19} className="text-emerald-800" />
                <span>Link Past Guest Orders</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                If you previously placed an order as a guest before creating your account, you can link it to your profile here. We will verify that the email address on the invoice matches your verified customer email (<strong>{user.email}</strong>).
              </p>
            </div>

            {claimMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                  claimMsg.isError
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                }`}
              >
                {claimMsg.isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                <span>{claimMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleClaimOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Order Reference Number (e.g. GH-178... or GM-954724-HGE)
                </label>
                <input
                  type="text"
                  required
                  value={claimOrderId}
                  onChange={(e) => setClaimOrderId(e.target.value)}
                  placeholder="GH-..."
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Associated Billing Email Address
                </label>
                <input
                  type="email"
                  required
                  value={claimEmail}
                  onChange={(e) => setClaimEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={claimLoading}
                className="py-2.5 px-6 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {claimLoading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Verifying Ownership...</span>
                  </>
                ) : (
                  <span>Verify &amp; Link Order</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Address Edit / Add Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <h3 className="font-heading font-bold text-base text-gray-900">
              {editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
            </h3>

            <form onSubmit={handleSaveAddress} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={addrStreet1}
                  onChange={(e) => setAddrStreet1(e.target.value)}
                  placeholder="123 Main St, Apt 4B"
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Street Address 2 (Optional)</label>
                <input
                  type="text"
                  value={addrStreet2}
                  onChange={(e) => setAddrStreet2(e.target.value)}
                  placeholder="Suite, unit, floor"
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    placeholder="Los Angeles"
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">State / Province</label>
                  <input
                    type="text"
                    required
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    placeholder="CA"
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Postal / ZIP Code</label>
                  <input
                    type="text"
                    required
                    value={addrZip}
                    onChange={(e) => setAddrZip(e.target.value)}
                    placeholder="90001"
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={addrCountry}
                    onChange={(e) => setAddrCountry(e.target.value)}
                    placeholder="United States"
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addrIsDefault}
                    onChange={(e) => setAddrIsDefault(e.target.checked)}
                    className="rounded text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                  />
                  <span className="font-semibold text-gray-700">Set as default delivery address</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold uppercase tracking-wider hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addressSaving}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                >
                  {addressSaving ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Itemized Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 my-auto text-left space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Dispensary Invoice
                </span>
                <h3 className="font-heading font-extrabold text-lg text-gray-900">
                  Order #{selectedOrder.orderId}
                </h3>
              </div>
              <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                {selectedOrder.status}
              </span>
            </div>

            {/* Courier & Tracking */}
            <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Carrier:</span>
                <strong className="text-gray-800">{selectedOrder.carrier}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tracking Number:</span>
                <strong className="font-mono text-emerald-800">{selectedOrder.trackingNumber || 'Pending Courier Scan'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stealth Delivery Address:</span>
                <span className="text-gray-800 text-right max-w-xs">{selectedOrder.shippingAddress}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Purchased Botanical Items
              </h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5">Weight / Variant</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedOrder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-bold text-gray-900">{item.name}</td>
                        <td className="p-2.5 text-gray-500">{item.variant || 'Standard'}</td>
                        <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                        <td className="p-2.5 text-right">{formatPrice(item.price)}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-900">
                          {formatPrice(item.total || item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="pt-2 border-t border-gray-100 flex justify-between items-baseline text-xs">
              <span className="text-gray-500">
                Payment: <strong className="uppercase">{selectedOrder.paymentMethod}</strong>
              </span>
              <div className="text-right space-y-1">
                <div className="text-sm font-extrabold text-emerald-900">
                  Total Paid: {formatPrice(selectedOrder.orderTotal)}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Close Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

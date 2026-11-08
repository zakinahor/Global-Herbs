import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GoogleSignInButton from '../GoogleSignInButton';
import SEOHead from '../SEOHead';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loginWithGoogle, isLoggedIn } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (isLoggedIn) {
      navigate('/account');
    }
  }, [isLoggedIn, navigate]);

  // Password Strength Calculation
  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = calculatePasswordStrength(password);
  const getStrengthLabel = (s: number) => {
    if (!password) return { label: '', color: 'bg-gray-200', text: 'text-gray-400' };
    if (s <= 1) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-500' };
    if (s <= 2) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-500' };
    if (s <= 3) return { label: 'Good', color: 'bg-blue-500', text: 'text-blue-500' };
    return { label: 'Strong', color: 'bg-emerald-600', text: 'text-emerald-600' };
  };

  const strengthInfo = getStrengthLabel(strength);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify and try again.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Please accept the Terms of Service and Privacy Policy to register.');
      return;
    }

    setIsLoading(true);

    const result = await register({
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone.trim(),
    });

    setIsLoading(false);

    if (result.success) {
      setSuccessMessage(
        result.message || 'Account successfully created! Redirecting to your customer dashboard...'
      );
      setTimeout(() => {
        navigate('/account');
      }, 1500);
    } else {
      setErrorMessage(result.error || 'Registration failed. Please check your details and try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    const res = await loginWithGoogle();
    if (res.success) {
      navigate('/account');
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  };

  return (
    <div className="min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 flex items-center justify-center font-sans">
      <SEOHead
        activePage="register"
        customTitle="Create Customer Account | Global Herbs Online Dispensary"
        customDescription="Register for a Global Herbs customer account. Enjoy expedited checkout, order tracking, stealth parcel notifications, and exclusive subscriber specials."
      />

      <div className="max-w-md w-full space-y-6">
        {/* Header Branding */}
        <div className="text-center">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-3">
            <Sparkles size={12} />
            Verified Customer Portal
          </span>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-gray-900 tracking-tight">
            Create Your Account
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
            Join Global Herbs for secure order tracking, saved delivery addresses, and priority stealth dispatch.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200/90 text-left">
          {/* Quick Google Sign In */}
          <div className="mb-6">
            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              label="Continue with Google"
              className="w-full justify-center"
            />
            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-400 font-bold tracking-wider">
                  Or register with email
                </span>
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800"
            >
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 font-semibold"
            >
              <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-gray-900 transition"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-gray-900 transition"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Phone Number <span className="text-gray-400 font-normal">(Optional for courier updates)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Phone size={16} />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-gray-900 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-gray-900 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength Meter */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    <div className={`rounded-full h-full ${strength >= 1 ? strengthInfo.color : 'bg-gray-200'}`} />
                    <div className={`rounded-full h-full ${strength >= 2 ? strengthInfo.color : 'bg-gray-200'}`} />
                    <div className={`rounded-full h-full ${strength >= 3 ? strengthInfo.color : 'bg-gray-200'}`} />
                    <div className={`rounded-full h-full ${strength >= 4 ? strengthInfo.color : 'bg-gray-200'}`} />
                  </div>
                  <div className="flex justify-between text-[10px] font-semibold">
                    <span className="text-gray-400">Security strength:</span>
                    <span className={strengthInfo.text}>{strengthInfo.label}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-gray-900 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Terms and Privacy Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                />
                <span className="text-xs text-gray-600 leading-snug">
                  I confirm that I am at least 21 years old and agree to the{' '}
                  <Link to="/terms" className="text-emerald-800 hover:underline font-bold">
                    Terms &amp; Conditions
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-emerald-800 hover:underline font-bold">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Trust Footer */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-[11px] text-gray-500 font-semibold">
            <ShieldCheck size={14} className="text-emerald-700" />
            <span>256-Bit SSL Encrypted &amp; Double Vacuum Stealth Guaranteed</span>
          </div>
        </div>

        {/* Existing Member Link */}
        <p className="text-center text-xs text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-emerald-800 hover:underline">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
}

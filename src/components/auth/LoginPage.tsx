import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GoogleSignInButton from '../GoogleSignInButton';
import SEOHead from '../SEOHead';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isLoggedIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Parse redirect path if specified (e.g. from checkout redirect)
  const queryParams = new URLSearchParams(location.search);
  const redirectTarget = queryParams.get('redirect') || '/account';

  useEffect(() => {
    if (isLoggedIn) {
      navigate(redirectTarget);
    }
  }, [isLoggedIn, navigate, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    const result = await login(email.trim().toLowerCase(), password);

    setIsLoading(false);

    if (result.success) {
      setSuccessMessage('Login successful! Redirecting to your account...');
      setTimeout(() => {
        navigate(redirectTarget);
      }, 800);
    } else {
      setErrorMessage(
        result.error || 'Invalid email or password. Please verify your credentials and try again.'
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    const res = await loginWithGoogle();
    if (res.success) {
      navigate(redirectTarget);
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  };

  return (
    <div className="min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 flex items-center justify-center font-sans">
      <SEOHead
        activePage="login"
        customTitle="Customer Sign In | Global Herbs Online Dispensary"
        customDescription="Sign in to your Global Herbs customer account. Access order history, track stealth parcels, manage delivery addresses, and view your verified client profile."
      />

      <div className="max-w-md w-full space-y-6">
        {/* Header Branding */}
        <div className="text-center">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-3">
            <Sparkles size={12} />
            Secure Member Access
          </span>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-gray-900 tracking-tight">
            Customer Sign In
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
            Enter your credentials to access your orders, saved addresses, and express checkout.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200/90 text-left">
          {/* Google Sign In */}
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
                  Or sign in with email
                </span>
              </div>
            </div>
          </div>

          {/* Alert Messages */}
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
            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Email Address
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
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-gray-900 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-emerald-800 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                />
                <span className="text-xs text-gray-600 font-medium">Remember this browser session</span>
              </label>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
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

        {/* Create Account Link */}
        <p className="text-center text-xs text-gray-600">
          New customer?{' '}
          <Link to="/register" className="font-bold text-emerald-800 hover:underline">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SEOHead from '../SEOHead';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(email.trim().toLowerCase());
    setIsLoading(false);

    if (result.success) {
      setIsSubmitted(true);
    } else {
      setErrorMessage(
        result.error || 'Failed to send password reset email. Please verify your address and try again.'
      );
    }
  };

  return (
    <div className="min-h-[75vh] py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 flex items-center justify-center font-sans">
      <SEOHead
        activePage="forgot-password"
        customTitle="Reset Password | Global Herbs Online Dispensary"
        customDescription="Reset your Global Herbs customer account password securely."
      />

      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
            <KeyRound size={22} />
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-gray-900 tracking-tight">
            Reset Your Password
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
            Enter your account email address below and we will send you a secure link to reset your password.
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200/90 text-left">
          {isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 space-y-4"
            >
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 size={30} />
              </div>
              <h3 className="font-heading font-bold text-lg text-gray-900">
                Password Reset Link Sent!
              </h3>
              <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
                We have dispatched a password recovery link to{' '}
                <strong className="text-emerald-900 font-bold">{email}</strong>. Please check your inbox and spam folder.
              </p>
              <div className="pt-4 flex flex-col gap-2">
                <Link
                  to="/login"
                  className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition text-center"
                >
                  Return to Sign In
                </Link>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="text-xs text-gray-500 hover:text-emerald-800 font-medium py-1 cursor-pointer"
                >
                  Did not receive email? Try another address
                </button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800"
                >
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Registered Email Address
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <Send size={14} />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-emerald-800 transition"
                >
                  <ArrowLeft size={13} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-[11px] text-gray-500 font-semibold">
            <ShieldCheck size={14} className="text-emerald-700" />
            <span>Encrypted Firebase Security Infrastructure</span>
          </div>
        </div>
      </div>
    </div>
  );
}

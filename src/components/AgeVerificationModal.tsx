import React, { useState, useEffect } from 'react';
import { ShieldAlert, Check, X, Lock, Scale, AlertTriangle, Sparkles, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AgeVerificationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [underAgeAttempt, setUnderAgeAttempt] = useState(false);

  useEffect(() => {
    // Check if user has already verified their age in localStorage or sessionStorage
    const localVerified = localStorage.getItem('globalherbs_age_verified');
    const sessionVerified = sessionStorage.getItem('globalherbs_age_verified');

    if (localVerified === 'true' || sessionVerified === 'true') {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, []);

  const handleVerifyAge = () => {
    if (rememberMe) {
      localStorage.setItem('globalherbs_age_verified', 'true');
    }
    sessionStorage.setItem('globalherbs_age_verified', 'true');
    setIsOpen(false);
  };

  const handleUnderAge = () => {
    setUnderAgeAttempt(true);
  };

  const handleExitSite = () => {
    window.location.href = 'https://www.google.com';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-y-auto border border-gray-200/80 text-left relative my-auto max-h-[95vh]"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-gray-900 text-white p-6 sm:p-8 text-center relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

            <div className="relative z-10 space-y-3">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-800/80 border border-emerald-600/60 rounded-full text-emerald-200 text-[10px] font-bold uppercase tracking-widest shadow-xs">
                <ShieldAlert size={14} className="text-amber-400" />
                <span>21+ Age Verification Required</span>
              </div>

              {/* Brand Header */}
              <div className="space-y-1">
                <h2 className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight">
                  GLOBAL HERBS
                </h2>
                <p className="text-[11px] font-medium text-emerald-300 uppercase tracking-widest">
                  Organic Botanical Dispensary
                </p>
              </div>

              {/* 21+ Age Icon Badge */}
              <div className="pt-2 flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-800/60 border-2 border-emerald-500/80 flex items-center justify-center text-amber-400 font-extrabold text-2xl shadow-inner">
                  21+
                </div>
              </div>
            </div>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 sm:p-8 space-y-6 bg-white">
            {!underAgeAttempt ? (
              <>
                <div className="space-y-2 text-center">
                  <h3 className="font-heading font-extrabold text-xl text-gray-900 tracking-tight">
                    Are you 21 years of age or older?
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed font-normal">
                    You must be at least 21 years old to enter this website and view our catalog of premium THCa flower, live rosin, edibles, and organic botanical extracts.
                  </p>
                </div>

                {/* Remember Me Toggle Box */}
                <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <label htmlFor="remember_me_check" className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      id="remember_me_check"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-emerald-800 border-gray-300 rounded focus:ring-emerald-700 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-gray-900 block leading-none mb-0.5">
                        Remember me on this device
                      </span>
                      <span className="text-[11px] text-gray-500 block leading-tight font-medium">
                        Saves your verification status for future visits
                      </span>
                    </div>
                  </label>
                  <Lock size={16} className="text-emerald-700 flex-shrink-0" />
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-1">
                  <button
                    onClick={handleVerifyAge}
                    className="w-full py-3.5 px-6 bg-emerald-800 hover:bg-emerald-900 active:scale-[0.99] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check size={18} className="text-emerald-300" />
                    <span>I AM 21 OR OLDER — ENTER SITE</span>
                  </button>

                  <button
                    onClick={handleUnderAge}
                    className="w-full py-3 px-6 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 font-bold text-xs uppercase tracking-wider rounded-2xl border border-gray-200 hover:border-red-200 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <X size={16} />
                    <span>I AM UNDER 21</span>
                  </button>
                </div>

                {/* Legal Disclaimer Footer */}
                <div className="pt-2 border-t border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                    By entering, you confirm you are 21+ and agree to our Terms of Service &amp; Privacy Policy. Farm Bill Compliant (Contains &lt;0.3% Delta-9 THC).
                  </p>
                </div>
              </>
            ) : (
              /* Under Age Access Denied State */
              <div className="space-y-5 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                  <AlertTriangle size={24} />
                </div>

                <div className="space-y-2">
                  <h3 className="font-heading font-extrabold text-xl text-gray-900 tracking-tight">
                    Access Denied
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed font-normal">
                    You must be 21 years of age or older to view or purchase products from Global Herbs Dispensary. Access to this catalog is restricted.
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleExitSite}
                    className="w-full py-3.5 px-6 bg-gray-900 hover:bg-black text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink size={16} />
                    <span>EXIT TO GOOGLE</span>
                  </button>

                  <button
                    onClick={() => setUnderAgeAttempt(false)}
                    className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer block mx-auto pt-2"
                  >
                    Go back to verification
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

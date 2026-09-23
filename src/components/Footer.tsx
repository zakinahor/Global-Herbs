import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowUpCircle, Youtube, Music2, ExternalLink } from 'lucide-react';
import logoUrl from '../assets/images/global_herbs_logo_1784328365704.jpg';
import { DEFAULT_FALLBACK_IMAGE } from '../utils/imageUtils';

interface FooterProps {
  onSelectPage?: (page: string) => void;
}

export default function Footer({ onSelectPage }: FooterProps) {
  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-zinc-950 text-white font-sans text-xs border-t border-zinc-900 select-none">
      {/* Upper Widget Area: Address & Warnings */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8 border-b border-zinc-900 text-left">
        {/* Contacts */}
        <div className="space-y-4">
          <h3 className="font-heading font-bold text-sm uppercase tracking-widest text-white border-b border-zinc-800 pb-2">
            Global Herbs
          </h3>
          <p className="text-gray-400 leading-relaxed font-semibold">
            <strong>Dispatch Center Address: </strong> <br />
            238 Cedar Brook Ln, Cave Junction, OR 97523 United States
          </p>
          <p className="text-gray-400 font-semibold">
            <strong>Phone Support: </strong>
            <a href="tel:+12132801161" className="text-emerald-400 hover:underline">+1 (213) 280-1161</a>
          </p>
          <p className="text-gray-400 font-semibold">
            <strong>Dispatch Support Email: </strong>
            <a href="mailto:globalherbsinc@gmail.com" className="text-emerald-400 hover:underline">
              globalherbsinc@gmail.com
            </a>
          </p>
          <p className="text-gray-400 font-semibold">
            <strong>Dispatch Operating Hours: </strong> <br />
            Monday – Saturday: 24 Hours Open (Dispatching Orders continuously), Sunday: Closed
          </p>
        </div>

        {/* Proposition 65 Warnings */}
        <div className="space-y-4">
          <h3 className="font-heading font-bold text-sm uppercase tracking-widest text-red-500 border-b border-zinc-800 pb-2">
            PROPOSITION 65 OFFICIAL WARNING
          </h3>
          <p className="text-red-400 font-bold leading-none">WARNING:</p>
          <ul className="list-square pl-5 space-y-2 text-gray-400 leading-relaxed font-semibold">
            <li>
              Cannabis (marijuana) smoke is on the Proposition 65 list because it can cause developmental harm and cancer.
            </li>
            <li>
              During pregnancy, smoking cannabis or being heavily exposed to cannabis smoke can harm the development of the child. It may affect the child’s birthweight, behavior, and learning ability.
            </li>
            <li>
              Smoking cannabis or being exposed to cannabis smoke may increase the risk of cancer.
            </li>
          </ul>
        </div>
      </div>

      {/* Middle Widget Area: Logo, Links & About */}
      <div className="bg-zinc-900/55 py-12 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-left">
          {/* Logo brand caption */}
          <div className="space-y-4">
            <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5">
              <img
                src={logoUrl}
                alt="Global Herbs Logo"
                className="w-9 h-9 rounded-full object-cover border border-emerald-800 shadow-md"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.src = DEFAULT_FALLBACK_IMAGE; }}
              />
              <h4 className="font-heading font-bold text-base tracking-tight text-white leading-none">
                Global Herbs
              </h4>
            </Link>
            <p className="text-gray-400 leading-relaxed font-semibold">
              Buy Legal THCa Weed Online | Premium Vape Cartridges | Farm Bill Compliant CBD &amp; Botanicals | Clean Solventless Concentrates.
              Discreet delivery with tracking.
            </p>

            {/* Official Social Media Channels */}
            <div className="pt-2 space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                Official Channels
              </span>
              <div className="flex flex-col gap-2">
                <a
                  href="https://www.youtube.com/@GlobalMarijuanaDispensary"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-red-950/40 border border-zinc-700/60 hover:border-red-600/60 text-gray-200 hover:text-red-300 transition-colors group"
                  title="Official YouTube Channel: Global Marijuana Dispensary"
                >
                  <div className="w-6 h-6 rounded-md bg-red-600 flex items-center justify-center text-white flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Youtube size={14} />
                  </div>
                  <div className="flex flex-col min-w-0 flex-grow text-left">
                    <span className="text-[11px] font-bold truncate">YouTube Channel</span>
                    <span className="text-[9px] text-gray-400 truncate">@GlobalMarijuanaDispensary</span>
                  </div>
                  <ExternalLink size={12} className="text-gray-500 group-hover:text-red-300 flex-shrink-0" />
                </a>

                <a
                  href="https://www.tiktok.com/@global.herbs6?_r=1&_t=ZS-99wVEhJX5DJ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-cyan-950/40 border border-zinc-700/60 hover:border-cyan-500/60 text-gray-200 hover:text-cyan-300 transition-colors group"
                  title="Official TikTok: @global.herbs6"
                >
                  <div className="w-6 h-6 rounded-md bg-black border border-cyan-500/50 flex items-center justify-center text-white flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Music2 size={13} className="text-cyan-400" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-grow text-left">
                    <span className="text-[11px] font-bold truncate">TikTok Profile</span>
                    <span className="text-[9px] text-gray-400 truncate">@global.herbs6</span>
                  </div>
                  <ExternalLink size={12} className="text-gray-500 group-hover:text-cyan-300 flex-shrink-0" />
                </a>
              </div>
            </div>
          </div>

          {/* Useful Links */}
          <div className="space-y-4">
            <h4 className="font-heading font-bold text-xs uppercase tracking-widest text-white">
              Useful Links
            </h4>
            <ul className="space-y-1.5 text-gray-400 font-semibold">
              <li>
                <Link
                  to="/checkout"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-emerald-400 cursor-pointer block py-1 border-b border-zinc-800/50 text-left"
                >
                  Dispensary Checkout
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-emerald-400 cursor-pointer block py-1 border-b border-zinc-800/50 text-left"
                >
                  About Our Shop
                </Link>
              </li>
              <li>
                <Link
                  to="/shipping"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-emerald-400 cursor-pointer block py-1 border-b border-zinc-800/50 text-left"
                >
                  Secure Shipping Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/returns"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-emerald-400 cursor-pointer block py-1 border-b border-zinc-800/50 text-left"
                >
                  Refund and Returns Guarantee
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-emerald-400 cursor-pointer block py-1 border-b border-zinc-800/50 text-left"
                >
                  Privacy Policy Terms
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-emerald-400 cursor-pointer block py-1 border-b border-zinc-800/50 text-left"
                >
                  Terms &amp; Discreet Shipping
                </Link>
              </li>
            </ul>
          </div>

          {/* Educational Guides (SEO) */}
          <div className="space-y-4">
            <h4 className="font-heading font-bold text-xs uppercase tracking-widest text-amber-400">
              Cannabis Knowledge Hub
            </h4>
            <ul className="space-y-1.5 text-gray-400 font-semibold">
              <li>
                <Link
                  to="/blog/announcing-global-herbs-mobile-app-seamless-orders"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-emerald-400 cursor-pointer block py-1 border-b border-zinc-800/50 text-left text-emerald-300 font-bold flex items-center justify-between"
                >
                  <span>New Mobile App Announcement</span>
                  <span className="text-[10px] bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 px-1.5 py-0.2 rounded uppercase">New</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-emerald-400 cursor-pointer block py-1 border-b border-zinc-800/50 text-left text-white font-bold"
                >
                  All Educational Guides
                </Link>
              </li>
              <li>
                <Link
                  to="/blog/what-is-thca-vs-delta-9-thc-legal-potency-guide"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-emerald-400 cursor-pointer block py-1 border-b border-zinc-800/50 text-left"
                >
                  What is THCa vs Delta-9 THC?
                </Link>
              </li>
              <li>
                <Link
                  to="/blog/how-to-dose-cbd-drops-tinctures-sleep-anxiety-guide"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-emerald-400 cursor-pointer block py-1 border-b border-zinc-800/50 text-left"
                >
                  CBD Sleep Drops Dosing Guide
                </Link>
              </li>
              <li>
                <Link
                  to="/blog/guide-to-solventless-live-hash-rosin-terpene-extraction"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="hover:text-emerald-400 cursor-pointer block py-1 border-b border-zinc-800/50 text-left"
                >
                  Live Hash Rosin &amp; Dabs Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* Core message */}
          <div className="space-y-4">
            <h4 className="font-heading font-bold text-xs uppercase tracking-widest text-white">
              Why Global Herbs?
            </h4>
            <p className="text-gray-400 leading-relaxed font-semibold">
              At Global Herbs, we prioritize your health, discretion, and absolute safety.
              Every purchase features triple odour-proof vacuum sealing, trackable delivery codes,
              and 100% full delivery refunds or free reshipping in the rare event of transit delays.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
              <ShieldCheck size={16} />
              <span>100% Guaranteed Discreet Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar copyright & payment icons */}
      <div className="bg-zinc-950 py-6 text-gray-500 text-[10px] font-semibold uppercase tracking-wider">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <p>
              Copyright 2023 &copy; <strong>Global Herbs</strong>. All Rights Reserved.
            </p>
            <div className="hidden sm:block h-3 w-px bg-zinc-800"></div>
            <button
              onClick={() => {
                localStorage.removeItem('globalherbs_age_verified');
                sessionStorage.removeItem('globalherbs_age_verified');
                window.location.reload();
              }}
              className="hover:text-emerald-400 cursor-pointer flex items-center gap-1"
              title="Reset Age Verification Preference"
            >
              <span>Verify Age (21+)</span>
            </button>
            <div className="hidden sm:block h-3 w-px bg-zinc-800"></div>
            <a href="#" onClick={scrollToTop} className="hover:text-emerald-400 flex items-center gap-1">
              <span>Back To Top</span>
              <ArrowUpCircle size={14} className="text-gray-400" />
            </a>
          </div>

          {/* Payment vector cards SVGs */}
          <div className="flex gap-2" aria-label="Accepted Payment Methods">
            {/* Paypal Icon */}
            <div className="w-10 h-6 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center" title="Paypal">
              <svg className="h-3.5 opacity-60 hover:opacity-100 transition-opacity" viewBox="0 0 64 32" xmlns="http://www.w3.org/2000/svg">
                <rect width="64" height="32" rx="4" fill="#003087"/>
                <path d="M22 8h6c3.5 0 5.5 1.5 5.5 4.5S31.5 17 28 17h-2.5l-2 7h-4l3.5-12.5L22 8z" fill="#0079C1"/>
                <path d="M24 12h6c3.5 0 5.5 1.5 5.5 4.5S33.5 21 30 21h-2.5l-2 7h-4l3.5-12.5L24 12z" fill="#00457C"/>
                <path d="M26 12h3c2 0 3.5.8 3.5 2.5s-1.5 2.5-3.5 2.5h-3l-1.5 5.5h-3l3-10.5z" fill="#fff"/>
              </svg>
            </div>
            {/* Apple Pay Icon */}
            <div className="w-10 h-6 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center" title="Apple Pay">
              <svg className="h-3.5 opacity-60 hover:opacity-100 transition-opacity" viewBox="0 0 64 32" xmlns="http://www.w3.org/2000/svg">
                <rect width="64" height="32" rx="4" fill="#000"/>
                <path d="M32 9c-1.8 0-3 1.2-3 3s1.2 3 3 3 3-1.2 3-3-1.2-3-3-3zM25 15h2v-6h-2v6z" fill="#fff"/>
              </svg>
            </div>
            {/* Bitcoin Icon */}
            <div className="w-10 h-6 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center" title="Bitcoin">
              <svg className="h-3.5 opacity-60 hover:opacity-100 transition-opacity" viewBox="0 0 64 32" xmlns="http://www.w3.org/2000/svg">
                <rect width="64" height="32" rx="4" fill="#f7931a"/>
                <path d="M24 8h6c1.5 0 2.5.5 2.5 1.5S31.5 11 30 11.5c2 0 3 1 3 2.5s-1.5 2.5-3.5 2.5h-5.5V8zm2.5 2.5h3c.8 0 1.2-.2 1.2-.8s-.4-.8-1.2-.8h-3v1.6zm0 4.4h3.5c.8 0 1.2-.2 1.2-.8s-.4-.8-1.2-.8h-3.5v1.6z" fill="#fff"/>
              </svg>
            </div>
            {/* Google Pay Icon */}
            <div className="w-10 h-6 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center" title="Google Pay">
              <svg className="h-3.5 opacity-60 hover:opacity-100 transition-opacity" viewBox="0 0 64 32" xmlns="http://www.w3.org/2000/svg">
                <rect width="64" height="32" rx="4" fill="#fff" stroke="#ececec"/>
                <path d="M22 16c0-3.3 2.7-6 6-6 1.6 0 3 .6 4.1 1.7l-1.7 1.7C29.6 12.7 28.9 12.5 28 12.5c-2 0-3.5 1.5-3.5 3.5s1.5 3.5 3.5 3.5c1.2 0 2-.6 2.4-1.2h-2.4v-2.2H33c.1.3.2.7.2 1.1 0 2.7-1.8 4.7-4.7 4.7-3.3.1-6-2.6-6-6z" fill="#4285F4"/>
                <path d="M38 12.5v7h-2.2v-7H38z" fill="#EA4335"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <div className="relative bg-zinc-950 text-white overflow-hidden py-16 md:py-24">
      {/* Dynamic Background Design overlay */}
      <div className="absolute inset-0 z-0 opacity-20">
        <img
          src="https://images.unsplash.com/photo-1536846862558-b80d25f0dbae?auto=format&fit=crop&q=80&w=1200"
          alt="Abstract dark green cannabis backdrop"
          className="w-full h-full object-cover scale-105 filter blur-xs"
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-zinc-950"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col items-start text-left">
        {/* Text Content */}
        <div className="max-w-3xl flex flex-col items-start text-left">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-900/40 text-emerald-300 rounded-full border border-emerald-800 text-xs font-semibold uppercase tracking-wider mb-6"
          >
            <Sparkles size={12} />
            <span>Guaranteed Safe &amp; Discreet Worldwide Shipping</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-tight mb-6 text-white"
          >
            Pure Botanical Power. <br />
            <span className="text-emerald-400">Crafted For Excellence.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gray-300 text-sm sm:text-base lg:text-lg mb-8 leading-relaxed max-w-2xl font-medium"
          >
            Welcome to <span className="text-white font-semibold">Global Herbs</span>.
            We source the finest medical-grade cannabis flowers, high-potency concentrates,
            delicious THC edibles, pure DMT cartridges, and organic magic mushrooms.
            Tested for safety, potency, and premium organic quality.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-4 w-full sm:w-auto"
          >
            <Link
              to="/shop"
              className="px-8 py-3.5 bg-brand-green hover:bg-brand-green-hover text-white font-semibold text-sm uppercase tracking-wider rounded-lg shadow-lg hover:shadow-brand-green/20 transition-all transform active:scale-95 duration-100 flex-grow sm:flex-grow-0 text-center cursor-pointer"
            >
              Shop Inventory
            </Link>
            <Link
              to="/contact"
              className="px-8 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm uppercase tracking-wider rounded-lg border border-zinc-700 hover:border-zinc-500 transition-all transform active:scale-95 duration-100 flex-grow sm:flex-grow-0 text-center cursor-pointer"
            >
              Order &amp; Support Form
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

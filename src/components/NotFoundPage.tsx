import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, ShoppingBag } from 'lucide-react';
import SEOHead from './SEOHead';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <SEOHead
        customTitle="404 Page Not Found | Global Herbs"
        customDescription="The page you are looking for does not exist or has been moved."
      />
      <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 border border-red-100 shadow-sm">
        <ShieldAlert size={32} />
      </div>
      <h1 className="font-heading font-bold text-4xl sm:text-5xl text-gray-900 tracking-tight mb-3">
        404 — Page Not Found
      </h1>
      <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto mb-8 leading-relaxed font-semibold">
        Sorry, the page you are looking for does not exist or has been moved. Explore our catalog of medical-grade botanical products.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-md"
        >
          <ArrowLeft size={16} />
          <span>Return Home</span>
        </Link>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs uppercase tracking-wider rounded-lg transition"
        >
          <ShoppingBag size={16} />
          <span>Browse Products</span>
        </Link>
      </div>
    </div>
  );
}

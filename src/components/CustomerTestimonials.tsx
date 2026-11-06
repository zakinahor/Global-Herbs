/**
 * src/components/CustomerTestimonials.tsx
 *
 * Displays genuine, approved customer reviews & testimonials on the homepage.
 * Strictly presents real feedback approved by dispensary administrators.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, ShieldCheck, Quote, ArrowRight, Sparkles } from 'lucide-react';
import { ProductReview } from '../types/review';
import { fetchHomepageTestimonials } from '../utils/productReviews';

export default function CustomerTestimonials() {
  const [testimonials, setTestimonials] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    fetchHomepageTestimonials()
      .then((items) => {
        if (isMounted) {
          setTestimonials(items);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <section className="py-16 sm:py-24 bg-white border-b border-gray-100 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-700" />
              Verified Patient Experiences
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-4xl text-gray-900 tracking-tight">
              Customer Reviews &amp; Testimonials
            </h2>
            <p className="text-gray-600 text-sm mt-2 max-w-xl font-normal">
              Read genuine, unedited feedback from verified buyers across the nation. Every review reflects real experiences with our organic flowers, cold-cured rosin, and discreet delivery.
            </p>
          </div>

          <Link
            to="/products"
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 flex-shrink-0"
          >
            <span>Browse Full Dispensary Menu</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {testimonials.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((item) => (
              <div
                key={item.id}
                className="bg-gray-50/80 border border-gray-200/80 rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:shadow-md transition duration-200 group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    {/* Stars */}
                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i < item.rating ? 'currentColor' : 'none'}
                          className={i < item.rating ? 'text-amber-400' : 'text-gray-200'}
                        />
                      ))}
                    </div>

                    <Quote size={20} className="text-emerald-800/20 group-hover:text-emerald-800/40 transition" />
                  </div>

                  {item.title && (
                    <h3 className="font-heading font-bold text-sm text-gray-900">
                      "{item.title}"
                    </h3>
                  )}

                  <p className="text-xs text-gray-600 leading-relaxed font-normal">
                    &ldquo;{item.comment}&rdquo;
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-gray-200/60 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-900">{item.author}</span>
                      {item.verified && (
                        <span
                          className="bg-emerald-100 text-emerald-850 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-emerald-200"
                          title="Verified Order Purchase"
                        >
                          <ShieldCheck size={10} />
                          Verified
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified Patron'}
                    </span>
                  </div>

                  <Link
                    to={`/products/${item.productSlug}`}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 truncate max-w-[130px] text-right hover:underline"
                    title={item.productName}
                  >
                    {item.productName}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-8 text-center max-w-2xl mx-auto space-y-3">
            <ShieldCheck size={32} className="text-emerald-800 mx-auto" />
            <h3 className="font-heading font-bold text-base text-gray-900">
              Community Reviews Welcome
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed max-w-lg mx-auto">
              We take pride in our 100% genuine, unverified-free review process. Have you received your dispatch from Global Herbs? Submit your experience on any individual product page to share with fellow patients.
            </p>
            <div className="pt-2">
              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <span>Explore Botanical Menu</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Sparkles,
  ShieldCheck,
  Truck,
  Leaf,
  Award,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  FileText,
  Star,
  Clock,
  Droplets,
  Package,
  Layers,
  HeartHandshake,
  Search,
  ExternalLink,
  Youtube,
  Music2,
} from 'lucide-react';
import RedditIcon from './icons/RedditIcon';
import { products, categories } from '../data/products';
import { blogArticles } from '../data/blogArticles';
import { NON_INDEXABLE_CATEGORY_SLUGS, NON_INDEXABLE_PRODUCT_IDS } from '../utils/sitemap';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import ProductCard from './ProductCard';
import SEOHead from './SEOHead';
import COAModal from './COAModal';
import { Product } from '../types';

interface HomePageProps {
  onAddToCart: (productId: number, selectedWeight?: string, quantity?: number, unitPrice?: number) => Promise<void>;
  onOpenSearch?: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const HOME_FAQS: FAQItem[] = [
  {
    category: 'Legal & Shipping',
    question: 'Is THCa flower legal to order and ship across the United States?',
    answer:
      'Yes. Under the federal 2018 Farm Bill (H.R. 2), hemp-derived botanicals containing less than 0.3% Delta-9 THC on a dry-weight basis are federally compliant. Because THCa converts to active THC only upon heat application (decarboxylation), raw THCa flower falls under legal industrial hemp definitions and can be lawfully shipped via USPS directly to your address with our law enforcement notice included.',
  },
  {
    category: 'Discretion & Packaging',
    question: 'How are orders packaged, and is the shipping 100% odourless and discreet?',
    answer:
      'Discretion is our standard protocol. Every botanical order is double-vacuum sealed inside industrial multi-barrier, moisture-proof and scent-proof bags before placement into a plain brown box or standard USPS Priority mailer. There is zero mention of dispensary, cannabis, or botanicals on the shipping label, guaranteeing full privacy from dispatch to delivery.',
  },
  {
    category: 'Testing & Purity',
    question: 'How can I verify the laboratory testing and Certificate of Analysis (COA)?',
    answer:
      'Every production batch undergoes mandatory third-party ISO/IEC-17025 accredited laboratory testing. You can inspect complete cannabinoid profiles, terpene percentages, and negative screening results for pesticides, heavy metals, microbials, and residual solvents via the interactive COA viewer on any product page or by scanning the QR code on your product packaging.',
  },
  {
    category: 'Ordering & Dispatch',
    question: 'When will my order dispatch and how do I track my delivery status?',
    answer:
      'Orders received Monday through Saturday prior to 2:00 PM PST are processed and handed directly to priority postal dispatch the very same day from our Oregon hub. Once scanned, you receive an automated email confirmation with your real-time tracking number, which can also be tracked directly through our on-site Order Tracking page.',
  },
  {
    category: 'Payments & Guarantees',
    question: 'What happens if my package is delayed or damaged during transit?',
    answer:
      'We stand behind every dispatch with our 100% Guaranteed Delivery Pledge. If a tracked parcel is confirmed lost, seized, or damaged in transit, our support desk immediately reships a brand-new replacement package at zero extra cost to you.',
  },
];

export default function HomePage({ onAddToCart, onOpenSearch }: HomePageProps) {
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'flower' | 'concentrates' | 'edibles'>('flower');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [coaProduct, setCoaProduct] = useState<Product | null>(null);

  // Filter indexable products for showcase
  const validProducts = products.filter(
    (p) => !NON_INDEXABLE_PRODUCT_IDS.has(p.id) && !NON_INDEXABLE_CATEGORY_SLUGS.has(p.categorySlug)
  );

  const curatedProducts = validProducts
    .filter((p) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'flower') return p.categorySlug === 'flower';
      if (activeTab === 'concentrates') return p.categorySlug === 'concentrates';
      if (activeTab === 'edibles') return p.categorySlug === 'edibles';
      return true;
    })
    .slice(0, 8);

  const featuredArticles = blogArticles.slice(0, 3);
  const indexableCategories = categories.filter((c) => !NON_INDEXABLE_CATEGORY_SLUGS.has(c.slug));

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const openSampleCoa = () => {
    const sample = validProducts.find((p) => p.categorySlug === 'flower') || validProducts[0];
    setCoaProduct(sample);
  };

  return (
    <div className="w-full flex flex-col flex-grow bg-white text-gray-900">
      <SEOHead
        activePage="home"
        customTitle="Global Herbs - Premium Legal Botanicals, THCa Strains & Natural Extracts"
        customDescription="Discover lab-tested THCa flowers, solventless rosin concentrates, Farm Bill compliant botanicals & natural edibles at Global Herbs. Stealth tracked shipping worldwide."
      />

      {/* ================================================================ */}
      {/* 1. ELEVATED BOTANICAL HERO */}
      {/* ================================================================ */}
      <section className="relative bg-emerald-950 text-white overflow-hidden py-20 lg:py-28 border-b border-emerald-900">
        {/* Subtle Ambient Botanical Lighting */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-25">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600 rounded-full filter blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500 rounded-full filter blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
              {/* Trust Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 text-xs font-semibold tracking-wide backdrop-blur-xs"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Farm Bill Compliant • Oregon Dispatch Hub • 100% Lab Tested</span>
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.12]"
              >
                Pure Botanical Purity. <br />
                <span className="text-emerald-400">Lab-Verified Potency.</span>
              </motion.h1>

              {/* Sub-headline / Value Proposition */}
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-2xl font-normal"
              >
                Global Herbs curates the highest grade THCa craft flowers, solventless live hash rosin, and organic wellness extracts. Sourced directly from premier Pacific Northwest growers, batch-tested for safety, and shipped in double-vacuum sealed odourless stealth packaging.
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto pt-2"
              >
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white font-bold text-sm uppercase tracking-wider shadow-lg hover:shadow-brand-green/25 transition-all duration-200 active:scale-95 cursor-pointer text-center"
                >
                  <span>Explore Botanical Catalog</span>
                  <ArrowRight size={16} />
                </Link>

                <button
                  onClick={openSampleCoa}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-900 text-emerald-100 border border-emerald-700/60 font-semibold text-sm transition-all duration-200 active:scale-95 cursor-pointer text-center"
                >
                  <FileText size={16} className="text-emerald-300" />
                  <span>Inspect Lab Certificate (COA)</span>
                </button>
              </motion.div>

              {/* Key Trust Signals Below CTAs */}
              <div className="pt-4 border-t border-emerald-900/80 grid grid-cols-3 gap-4 w-full text-left">
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white font-heading">100%</div>
                  <div className="text-[11px] text-emerald-300 font-medium leading-tight">Scent-Proof Stealth</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white font-heading">&lt; 0.3%</div>
                  <div className="text-[11px] text-emerald-300 font-medium leading-tight">Delta-9 THC Compliant</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white font-heading">Same-Day</div>
                  <div className="text-[11px] text-emerald-300 font-medium leading-tight">Oregon Dispatch</div>
                </div>
              </div>
            </div>

            {/* Right Showcase Card */}
            <div className="lg:col-span-5 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-emerald-900/40 border border-emerald-700/40 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl text-left relative overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-emerald-800/60 pb-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-800/80 flex items-center justify-center text-emerald-300">
                      <Award size={20} />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-sm text-white">Dispensary Standard</h4>
                      <p className="text-[11px] text-emerald-300">Third-Party Lab Certified</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-emerald-800 text-emerald-200 rounded-full">
                    2026 Harvest
                  </span>
                </div>

                <div className="space-y-4 text-xs text-emerald-100/90 leading-relaxed font-medium">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Triple Scent-Lock Barrier:</strong> Guaranteed odourless delivery through US domestic postal streams.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Solventless Purity:</strong> Live hash rosin cold-cured without butane, propane, or chemical carriers.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Full-Spectrum Terpenes:</strong> Preserved flavonoids and natural entourage profiles intact.
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-emerald-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className="fill-amber-400" />
                      ))}
                    </div>
                    <span className="text-white ml-1">4.9 / 5.0</span>
                  </div>
                  <Link
                    to="/blog"
                    className="text-xs font-semibold text-emerald-300 hover:text-white flex items-center gap-1 transition"
                  >
                    <span>Read Education</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 2. WHAT GLOBAL HERBS OFFERS (THE BOTANICAL SPECTRUM) */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-24 bg-gray-50/70 border-b border-gray-100 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block mb-2">
              Curated Apothecary
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-4xl text-gray-900 tracking-tight">
              A Complete Spectrum of Lab-Verified Botanicals
            </h2>
            <p className="text-gray-600 text-sm sm:text-base mt-3 leading-relaxed">
              Every botanical form factor in our collection is precision-formulated, legal under federal guidelines, and packaged with verified Certificates of Analysis.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Pillar 1 - Artisanal THCa Flower */}
            <Link
              id="pillar-flowers"
              to="/category/flowers"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="group bg-white p-7 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md hover:border-emerald-400 transition-all duration-200 flex flex-col justify-between cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
              title="Explore Artisanal THCa Flower Category"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-5 font-bold group-hover:scale-105 group-hover:bg-emerald-100 transition-all">
                  <Leaf size={24} />
                </div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2 group-hover:text-emerald-800 transition-colors">
                  Artisanal THCa Flower
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal mb-4">
                  Slow-cured, hand-trimmed indoor and light-dep greenhouse buds. Packed with dense trichomes, high natural terpene content, and federally compliant Delta-9 levels.
                </p>
              </div>
              <div className="text-xs font-bold text-emerald-800 group-hover:text-emerald-950 flex items-center gap-1.5 pt-4 border-t border-gray-100 transition-colors">
                <span>Browse Flower Strains</span>
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Pillar 2 - Solventless Live Hash Rosin */}
            <Link
              id="pillar-concentrates"
              to="/category/concentrates"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="group bg-white p-7 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md hover:border-emerald-400 transition-all duration-200 flex flex-col justify-between cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
              title="Explore Concentrates & Live Hash Rosin"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-5 font-bold group-hover:scale-105 group-hover:bg-emerald-100 transition-all">
                  <Droplets size={24} />
                </div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2 group-hover:text-emerald-800 transition-colors">
                  Solventless Live Hash Rosin
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal mb-4">
                  Pressed exclusively with pure ice-water, heat, and hydraulic pressure. Zero residual hydrocarbons or chemical solvents for an uncompromisingly clean experience.
                </p>
              </div>
              <div className="text-xs font-bold text-emerald-800 group-hover:text-emerald-950 flex items-center gap-1.5 pt-4 border-t border-gray-100 transition-colors">
                <span>Browse Concentrates</span>
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Pillar 3 - Precision Edibles & Wellness */}
            <Link
              id="pillar-edibles"
              to="/category/edibles"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="group bg-white p-7 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md hover:border-emerald-400 transition-all duration-200 flex flex-col justify-between cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
              title="Explore Edibles & Wellness"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-5 font-bold group-hover:scale-105 group-hover:bg-emerald-100 transition-all">
                  <Layers size={24} />
                </div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-2 group-hover:text-emerald-800 transition-colors">
                  Precision Edibles &amp; Wellness
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal mb-4">
                  Gummies, tinctures, and functional botanical capsules with exact milligram dosages. Crafted for predictable duration, clear onset, and deep natural relaxation.
                </p>
              </div>
              <div className="text-xs font-bold text-emerald-800 group-hover:text-emerald-950 flex items-center gap-1.5 pt-4 border-t border-gray-100 transition-colors">
                <span>Browse Edibles &amp; Tinctures</span>
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 3. FEATURED PRODUCTS & CURATED SHOWCASE */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-24 bg-white border-b border-gray-100 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block mb-2">
                Dispensary Showcase
              </span>
              <h2 className="font-heading font-extrabold text-2xl sm:text-4xl text-gray-900 tracking-tight">
                Featured Dispensary Batches
              </h2>
            </div>

            {/* Interactive Category Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setActiveTab('flower')}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'flower'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                THCa Flowers
              </button>
              <button
                onClick={() => setActiveTab('concentrates')}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'concentrates'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Solventless Rosin
              </button>
              <button
                onClick={() => setActiveTab('edibles')}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'edibles'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Artisan Edibles
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Products
              </button>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {curatedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>

          {/* Explore Catalog CTA */}
          <div className="mt-12 text-center">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-xs"
            >
              <span>View Full Inventory ({products.length} Products)</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 4. WHY CHOOSE GLOBAL HERBS (TRUST PILLARS) */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-24 bg-emerald-950 text-white text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-2">
              The Global Herbs Standard
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-4xl text-white tracking-tight">
              Why Discerning Botanists Choose Global Herbs
            </h2>
            <p className="text-gray-300 text-sm sm:text-base mt-3 leading-relaxed font-normal">
              We treat botanical sourcing with pharmaceutical precision. From organic living soil cultivation to sealed dispatch, integrity defines every order.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-900/80 border border-emerald-700 flex items-center justify-center text-emerald-300">
                <Package size={22} />
              </div>
              <h3 className="font-heading font-bold text-base text-white">Double Vacuum Stealth</h3>
              <p className="text-xs text-gray-300 leading-relaxed font-normal">
                Double-sealed in medical-grade odor-barrier film with zero exterior marking. 100% discrete and scent-free guaranteed.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-900/80 border border-emerald-700 flex items-center justify-center text-emerald-300">
                <ShieldCheck size={22} />
              </div>
              <h3 className="font-heading font-bold text-base text-white">Certified Lab Analysis</h3>
              <p className="text-xs text-gray-300 leading-relaxed font-normal">
                Every batch is vetted by independent accredited labs for cannabinoid potency, zero heavy metals, and zero residual pesticides.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-900/80 border border-emerald-700 flex items-center justify-center text-emerald-300">
                <Truck size={22} />
              </div>
              <h3 className="font-heading font-bold text-base text-white">Priority Tracked Dispatch</h3>
              <p className="text-xs text-gray-300 leading-relaxed font-normal">
                Fast processing from Cave Junction, Oregon with live tracking updates directly to your inbox and real-time portal lookup.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-900/80 border border-emerald-700 flex items-center justify-center text-emerald-300">
                <HeartHandshake size={22} />
              </div>
              <h3 className="font-heading font-bold text-base text-white">Guaranteed Delivery</h3>
              <p className="text-xs text-gray-300 leading-relaxed font-normal">
                Every package is insured against postal mishaps. If your shipment is stalled or lost, our desk immediately reships a new package.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 5. BOTANICAL EDUCATION & SCIENCE GUIDE */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-24 bg-white border-b border-gray-100 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest">
                Botanical Science &amp; Education
              </span>
              <h2 className="font-heading font-extrabold text-2xl sm:text-4xl text-gray-900 tracking-tight leading-tight">
                Understanding THCa vs. Delta-9 &amp; The Entourage Effect
              </h2>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed font-normal">
                Tetrahydrocannabinolic Acid (THCa) is the raw, non-psychoactive precursor synthesized in living cannabis trichomes. In its raw form, it complies fully with federal hemp statutes. Only when heated through vaping or combustion does it decarboxylate into active Delta-9 THC.
              </p>

              <div className="space-y-3.5 text-xs sm:text-sm text-gray-700">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <Leaf className="text-emerald-700 w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-900 block font-heading">Raw Cannabinoid Architecture</strong>
                    Raw cured flowers test at &lt; 0.3% Delta-9 THC while delivering rich THCa concentrations up to 32%+.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <Droplets className="text-emerald-700 w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-900 block font-heading">Terpene Retention</strong>
                    Our cold-cure protocol preserves fragile monoterpenes like Myrcene, Limonene, and Caryophyllene for natural taste and aroma.
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  to="/blog/understanding-thca-flower-vs-delta-9-thc-complete-guide"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition"
                >
                  <span>Read Full Science Guide</span>
                  <ArrowRight size={13} />
                </Link>
                <button
                  onClick={openSampleCoa}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <FileText size={14} className="text-emerald-700" />
                  <span>View Batch COA Specs</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 sm:p-8 space-y-6">
                <h3 className="font-heading font-bold text-base text-gray-900 border-b border-gray-200 pb-3">
                  Terpene Profile Breakdown
                </h3>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-800 mb-1">
                      <span>Beta-Caryophyllene (Spicy, Woody)</span>
                      <span className="text-emerald-700">1.12%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full w-[65%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-800 mb-1">
                      <span>Myrcene (Earthy, Herbal, Calming)</span>
                      <span className="text-emerald-700">0.84%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full w-[50%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-800 mb-1">
                      <span>Limonene (Citrus, Uplifting)</span>
                      <span className="text-emerald-700">0.58%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full w-[38%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-800 mb-1">
                      <span>Linalool (Floral, Lavender, Relaxing)</span>
                      <span className="text-emerald-700">0.30%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full w-[22%]" />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-gray-200 text-[11px] text-gray-500 font-medium">
                  Verified by ISO/IEC accredited chromatography testing. Batch analysis certified free of synthetic cannabinoids, mold, or heavy metals.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 6. FEATURED KNOWLEDGE HUB ARTICLES */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-24 bg-gray-50/80 border-b border-gray-100 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block mb-2">
                Knowledge Hub
              </span>
              <h2 className="font-heading font-extrabold text-2xl sm:text-4xl text-gray-900 tracking-tight">
                Dispensary Insights &amp; Guides
              </h2>
            </div>
            <Link
              to="/blog"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
            >
              <span>Explore All {blogArticles.length} Guides</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {featuredArticles.map((article) => (
              <article
                key={article.id}
                className="bg-white rounded-2xl overflow-hidden border border-gray-200/80 shadow-2xs hover:shadow-md transition duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                    <img
                      src={article.featuredImage}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 bg-emerald-950/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {article.category}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 font-semibold mb-2">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {article.readTime}
                      </span>
                      <span>•</span>
                      <span>{article.publishedDate}</span>
                    </div>

                    <h3 className="font-heading font-bold text-base text-gray-900 group-hover:text-emerald-800 transition line-clamp-2 mb-2 leading-snug">
                      <Link to={`/blog/${article.slug}`}>{article.title}</Link>
                    </h3>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed font-normal">
                      {article.excerpt}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={article.author.avatar}
                      alt={article.author.name}
                      className="w-6 h-6 rounded-full object-cover border border-gray-200"
                      loading="lazy"
                    />
                    <span className="text-xs font-semibold text-gray-700">{article.author.name}</span>
                  </div>
                  <Link
                    to={`/blog/${article.slug}`}
                    className="text-xs font-bold text-emerald-800 group-hover:translate-x-0.5 transition flex items-center gap-0.5"
                  >
                    <span>Read</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 6.5. OFFICIAL VIDEO & SOCIAL CHANNELS */}
      {/* ================================================================ */}
      <section className="py-14 sm:py-20 bg-zinc-950 text-white text-left relative overflow-hidden border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-zinc-800">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                Official Media &amp; Community
              </span>
              <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
                Watch Behind The Scenes &amp; Strain Reviews
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-xl">
                Tune into official strain breakdowns, unboxings, live solventless press demos, and stealth packaging overviews on our verified channels.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-3 text-xs text-zinc-400 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Updated weekly with fresh harvest content</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* YouTube Card */}
            <a
              href="https://www.youtube.com/@GlobalMarijuanaDispensary"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-red-600/70 transition-all duration-200 hover:shadow-2xl hover:shadow-red-950/30"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                      <Youtube size={26} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block">
                        Official YouTube Channel
                      </span>
                      <h3 className="font-heading font-bold text-lg sm:text-xl text-white group-hover:text-red-300 transition-colors">
                        Global Herbs
                      </h3>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-red-400 group-hover:bg-red-950/50 transition-colors">
                    <ExternalLink size={16} />
                  </div>
                </div>

                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                  In-depth dispensary video reviews, high-potency THCa flower trichome macro breakdowns, live resin extraction guides, and customer unboxing demonstrations.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 text-[11px] font-semibold text-zinc-300 border border-zinc-700/50">
                    Strain Breakdowns
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 text-[11px] font-semibold text-zinc-300 border border-zinc-700/50">
                    Terpene Guides
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 text-[11px] font-semibold text-zinc-300 border border-zinc-700/50">
                    Dispensary Tours
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-bold text-red-400 group-hover:text-red-300">
                <span>Watch on YouTube</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Subscribe &amp; Watch <ArrowRight size={13} />
                </span>
              </div>
            </a>

            {/* TikTok Card */}
            <a
              href="https://www.tiktok.com/@global.herbs6?_r=1&_t=ZS-99wVEhJX5DJ"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-cyan-500/70 transition-all duration-200 hover:shadow-2xl hover:shadow-cyan-950/30"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-black border border-cyan-500/60 flex items-center justify-center text-cyan-400 shadow-lg group-hover:scale-105 transition-transform">
                      <Music2 size={24} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                        Official TikTok Channel
                      </span>
                      <h3 className="font-heading font-bold text-lg sm:text-xl text-white group-hover:text-cyan-300 transition-colors">
                        Global Herbs
                      </h3>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 group-hover:bg-cyan-950/50 transition-colors">
                    <ExternalLink size={16} />
                  </div>
                </div>

                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                  Fast daily clips showcasing fresh top-shelf flower harvests, solventless squish reactions, discreet vacuum-sealing protocols, and drop announcements.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 text-[11px] font-semibold text-zinc-300 border border-zinc-700/50">
                    Fresh Harvest Drops
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 text-[11px] font-semibold text-zinc-300 border border-zinc-700/50">
                    Stealth Packing
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 text-[11px] font-semibold text-zinc-300 border border-zinc-700/50">
                    Quick Potency Tips
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
                <span>Follow on TikTok</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View Latest Drops <ArrowRight size={13} />
                </span>
              </div>
            </a>

            {/* Official Reddit Card */}
            <a
              href="https://www.reddit.com/u/globalherbsinc/s/4G5I46fLMM"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-orange-500/70 transition-all duration-200 hover:shadow-2xl hover:shadow-orange-950/30 md:col-span-2 lg:col-span-1"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#FF4500] flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                      <RedditIcon size={26} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider block">
                        Official Reddit Channel
                      </span>
                      <h3 className="font-heading font-bold text-lg sm:text-xl text-white group-hover:text-orange-300 transition-colors">
                        u/globalherbsinc
                      </h3>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-orange-400 group-hover:bg-orange-950/50 transition-colors">
                    <ExternalLink size={16} />
                  </div>
                </div>

                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                  Join our official Reddit profile for community strain reviews, batch discussions, drop announcements, direct support, and community Q&amp;A.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 text-[11px] font-semibold text-zinc-300 border border-zinc-700/50">
                    Direct Community
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 text-[11px] font-semibold text-zinc-300 border border-zinc-700/50">
                    Drop Q&amp;A
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 text-[11px] font-semibold text-zinc-300 border border-zinc-700/50">
                    Reviews &amp; Feedback
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-bold text-orange-400 group-hover:text-orange-300">
                <span>Connect on Reddit</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View Profile &amp; Posts <ArrowRight size={13} />
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION) */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-24 bg-white border-b border-gray-100 text-left">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block mb-2">
              Common Questions
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-4xl text-gray-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 text-sm mt-3 font-normal">
              Everything you need to know about our federal compliance, stealth postal delivery, and lab standards.
            </p>
          </div>

          <div className="space-y-3">
            {HOME_FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-2xl overflow-hidden bg-white transition duration-200"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/70 transition"
                    aria-expanded={isOpen}
                  >
                    <span className="font-heading font-bold text-sm sm:text-base text-gray-900 leading-snug">
                      {faq.question}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-gray-500 flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-emerald-800' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-gray-600 leading-relaxed font-normal border-t border-gray-100 bg-gray-50/40">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center text-xs text-gray-500 font-medium">
            Have a question not answered here? Visit our{' '}
            <Link to="/contact" className="text-emerald-800 font-bold hover:underline">
              Dispatch Inquiries Desk
            </Link>{' '}
            or call{' '}
            <a href="tel:+12132801161" className="text-emerald-800 font-bold hover:underline">
              +1 (213) 280-1161
            </a>
            .
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 8. STRONG FINAL CALL TO ACTION */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={12} />
            <span>Pure Botanical Purity</span>
          </div>

          <h2 className="font-heading font-extrabold text-2xl sm:text-4xl lg:text-5xl tracking-tight leading-tight text-white">
            Experience the Global Herbs Standard
          </h2>

          <p className="text-gray-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-normal">
            Join thousands of satisfied connoisseurs nationwide who rely on Global Herbs for legal, lab-verified THCa flowers, solventless rosin, and discreet home delivery.
          </p>

          <div className="pt-3 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/products"
              className="px-8 py-3.5 bg-brand-green hover:bg-brand-green-hover text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg hover:shadow-brand-green/30 transition-all transform active:scale-95 duration-100 cursor-pointer"
            >
              Shop Current Harvest
            </Link>
            <Link
              to="/order-tracking"
              className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-sm rounded-xl transition cursor-pointer"
            >
              Track Existing Order
            </Link>
          </div>
        </div>
      </section>

      {/* COA Modal preview */}
      {coaProduct && (
        <COAModal
          isOpen={!!coaProduct}
          onClose={() => setCoaProduct(null)}
          product={coaProduct}
        />
      )}
    </div>
  );
}

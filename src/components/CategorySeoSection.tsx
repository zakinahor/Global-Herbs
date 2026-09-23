import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Dna, ShieldCheck, HelpCircle, CheckCircle2 } from 'lucide-react';
import { getCategorySeoData } from '../data/categorySeoData';

interface CategorySeoSectionProps {
  categorySlug: string | null;
}

export default function CategorySeoSection({ categorySlug }: CategorySeoSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const guide = getCategorySeoData(categorySlug);
  if (!guide) return null;

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <section className="mt-12 bg-gradient-to-b from-gray-50 to-white border border-gray-200/80 rounded-2xl p-6 sm:p-8 shadow-xs text-left overflow-hidden relative">
      {/* Top Banner Tag */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-gray-200">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-full">
          <Sparkles size={14} className="text-emerald-700" />
          <span>Category Buyer's Guide &amp; Genetics</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Lab Verified ISO COAs • Farm Bill Compliant</span>
        </div>
      </div>

      {/* Main H1 Heading & Overview */}
      <div className="space-y-4">
        <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-gray-900 tracking-tight leading-snug">
          {guide.h1Heading}
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed font-normal">
          {guide.overview}
        </p>
      </div>

      {/* Genetics & Terpene Specs Box */}
      <div className="my-6 bg-white border border-emerald-100 rounded-xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
          <Dna size={18} className="text-emerald-700" />
          <h3>{guide.geneticsAndTerpenes.title}</h3>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          {guide.geneticsAndTerpenes.content}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="bg-emerald-50/70 border border-emerald-200/50 p-3 rounded-lg">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
              Potency Range
            </span>
            <span className="text-xs font-extrabold text-gray-900">
              {guide.geneticsAndTerpenes.potencyRange}
            </span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/50 p-3 rounded-lg">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
              Dominant Terpenes
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {guide.geneticsAndTerpenes.keyTerpenes.map((terp, i) => (
                <span
                  key={i}
                  className="bg-white text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200"
                >
                  {terp}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Content Section for 300+ word depth */}
      <div className={`space-y-4 text-xs text-gray-700 leading-relaxed transition-all duration-300 ${!isExpanded ? 'max-h-36 overflow-hidden relative' : 'max-h-none'}`}>
        {!isExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
        )}

        <h3 className="font-heading font-bold text-base text-gray-900 pt-2">
          {guide.buyerGuide.title}
        </h3>
        {guide.buyerGuide.paragraphs.map((p, idx) => (
          <p key={idx}>{p}</p>
        ))}

        <div className="bg-gray-100/70 p-4 rounded-xl border border-gray-200/60 my-4 text-gray-800 text-xs">
          <span className="font-bold text-emerald-900 block mb-1">Compliance &amp; Quality Standard:</span>
          {guide.complianceAndQuality}
        </div>

        {/* Category FAQ Accordion for Search Schema */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="font-heading font-bold text-sm text-gray-900 mb-3 flex items-center gap-1.5">
            <HelpCircle size={16} className="text-emerald-700" />
            <span>Frequently Asked Questions — {guide.categoryName}</span>
          </h4>
          <div className="space-y-2">
            {guide.faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-lg overflow-hidden bg-white transition"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full text-left px-4 py-3 flex justify-between items-center text-xs font-bold text-gray-900 hover:bg-gray-50 transition cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp size={14} className="text-emerald-700" /> : <ChevronDown size={14} className="text-gray-400" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 pt-1 text-xs text-gray-600 border-t border-gray-100 bg-gray-50/50 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <div className="mt-4 text-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white border border-gray-300 hover:border-emerald-700 text-emerald-800 hover:text-emerald-900 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          <span>{isExpanded ? "Show Less" : "Read Full Category Buyer's Guide & Genetics"}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
    </section>
  );
}

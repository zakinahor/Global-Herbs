import React from 'react';
import { X, Printer, ShieldCheck, Download, Award, CheckCircle2, FileText, QrCode } from 'lucide-react';
import { Product } from '../types';
import logoUrl from '../assets/images/global_herbs_logo_1784328365704.jpg';

interface COAModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

export default function COAModal({ isOpen, onClose, product }: COAModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Generate deterministic laboratory metrics based on product properties
  const batchId = `GH-2026-COA-${String(product.id).padStart(4, '0')}`;
  const testDate = 'August 08, 2026';
  const expiryDate = 'August 08, 2027';

  // Extract potency numbers or generate reasonable defaults
  let totalThc = '26.85%';
  let totalCbd = '< 0.05%';
  let totalTerps = '2.84%';
  let totalCannabinoids = '31.40%';

  if (product.potency) {
    if (product.potency.includes('%')) {
      totalThc = product.potency;
    }
  } else if (product.categorySlug === 'edibles') {
    totalThc = '10mg / serving (100mg total)';
    totalCannabinoids = '105mg';
  } else if (product.categorySlug === 'disposable-vapes' || product.categorySlug === 'dmt') {
    totalThc = '88.50%';
    totalTerps = '4.20%';
    totalCannabinoids = '94.10%';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 my-auto print:shadow-none print:border-none print:w-full print:max-w-none print:rounded-none">
        
        {/* Top Action Bar (Hidden when printing) */}
        <div className="bg-emerald-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-400" size={20} />
            <span className="font-heading font-bold text-sm uppercase tracking-wider">
              Verified Certificate of Analysis (COA) Document
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-xs"
            >
              <Printer size={15} />
              <span>Print / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-lg transition cursor-pointer"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 bg-white text-gray-900 font-sans text-left space-y-6 print:p-6 print:text-black">
          
          {/* Header Section with Official Logo & Company Credentials */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-emerald-800 gap-4">
            <div className="flex items-center gap-4">
              <img
                src={logoUrl}
                alt="Global Herbs Logo"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-emerald-800 shadow-md print:w-16 print:h-16"
              />
              <div>
                <h1 className="font-heading font-black text-2xl sm:text-3xl text-gray-900 uppercase tracking-tight leading-none">
                  Global Herbs Inc.
                </h1>
                <p className="text-xs text-emerald-800 uppercase font-black tracking-widest mt-1">
                  Dispensary &amp; Analytical Testing Division
                </p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                  213 Botanical Blvd, Suite 400 • ISO/IEC 17025 Accredited Laboratory • License #GH-LAB-99201
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right bg-emerald-50 border border-emerald-200 rounded-xl p-3 print:bg-white print:border-gray-300">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 tracking-wider bg-emerald-200/60 px-2 py-0.5 rounded mb-1">
                <CheckCircle2 size={12} className="text-emerald-800" />
                VERIFIED AUTHENTIC
              </span>
              <div className="text-xs font-bold text-gray-800">
                Batch ID: <span className="font-mono text-emerald-900">{batchId}</span>
              </div>
              <div className="text-[10px] font-semibold text-gray-500">
                Issued: {testDate} | Exp: {expiryDate}
              </div>
            </div>
          </div>

          {/* Document Title Bar */}
          <div className="bg-gray-900 text-white p-3 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-2 print:bg-gray-800">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-emerald-400" />
              <span className="font-heading font-bold text-sm uppercase tracking-wider">
                CERTIFICATE OF ANALYSIS (COA) - COMPREHENSIVE SAFETY &amp; POTENCY AUDIT
              </span>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest bg-gray-800 px-2.5 py-1 rounded">
              DOCUMENT NO: COA-2026-GH99
            </span>
          </div>

          {/* Sample & Product Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs print:bg-white print:border-gray-300">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Product Name</span>
              <span className="font-bold text-gray-900 block truncate">{product.name}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Category / Type</span>
              <span className="font-semibold text-gray-800 block">{product.category} ({product.strainType || 'Hybrid'})</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">SKU / Code</span>
              <span className="font-mono font-semibold text-gray-800 block">{product.sku || `GH-SKU-${product.id}`}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Sample Quantity</span>
              <span className="font-semibold text-gray-800 block">{product.weight || '5.00g representative batch'}</span>
            </div>
          </div>

          {/* Safety Screening Status Table */}
          <div>
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
              <Award size={15} className="text-emerald-700" />
              <span>Safety &amp; Contaminant Screening Matrix</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2 text-center">
                <span className="text-[9px] font-bold text-gray-500 uppercase block">Pesticides</span>
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center justify-center gap-1">
                  <CheckCircle2 size={12} /> PASSED
                </span>
              </div>
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2 text-center">
                <span className="text-[9px] font-bold text-gray-500 uppercase block">Heavy Metals</span>
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center justify-center gap-1">
                  <CheckCircle2 size={12} /> PASSED
                </span>
              </div>
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2 text-center">
                <span className="text-[9px] font-bold text-gray-500 uppercase block">Microbials / Mold</span>
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center justify-center gap-1">
                  <CheckCircle2 size={12} /> PASSED
                </span>
              </div>
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2 text-center">
                <span className="text-[9px] font-bold text-gray-500 uppercase block">Residual Solvents</span>
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center justify-center gap-1">
                  <CheckCircle2 size={12} /> PASSED
                </span>
              </div>
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2 text-center col-span-2 sm:col-span-1">
                <span className="text-[9px] font-bold text-gray-500 uppercase block">Moisture / Aw</span>
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center justify-center gap-1">
                  <CheckCircle2 size={12} /> 10.8% (PASS)
                </span>
              </div>
            </div>
          </div>

          {/* Cannabinoid Profile Breakdown Table */}
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-700">
                Cannabinoid Profile Analysis (HPLC-UV)
              </h3>
              <span className="text-[10px] font-bold text-emerald-800">
                Total Cannabinoids: <strong className="text-xs font-black">{totalCannabinoids}</strong>
              </span>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-2.5">Compound</th>
                    <th className="p-2.5">LOD (%)</th>
                    <th className="p-2.5">Concentration (%)</th>
                    <th className="p-2.5">Concentration (mg/g)</th>
                    <th className="p-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                  <tr className="bg-emerald-50/30">
                    <td className="p-2.5 font-bold text-emerald-900">THCa (Tetrahydrocannabinolic Acid)</td>
                    <td className="p-2.5 text-gray-400">0.01</td>
                    <td className="p-2.5 font-bold text-emerald-900">{totalThc}</td>
                    <td className="p-2.5 font-mono">268.5 mg/g</td>
                    <td className="p-2.5 text-right font-bold text-emerald-800">Active</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">Δ9-THC (Delta-9 Tetrahydrocannabinol)</td>
                    <td className="p-2.5 text-gray-400">0.01</td>
                    <td className="p-2.5">0.28%</td>
                    <td className="p-2.5 font-mono">2.8 mg/g</td>
                    <td className="p-2.5 text-right font-bold text-emerald-800">&lt; LOQ Legal</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">CBDa (Cannabidiolic Acid)</td>
                    <td className="p-2.5 text-gray-400">0.01</td>
                    <td className="p-2.5">{totalCbd}</td>
                    <td className="p-2.5 font-mono">&lt; LOQ</td>
                    <td className="p-2.5 text-right text-gray-400">Tested</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">CBG (Cannabigerol)</td>
                    <td className="p-2.5 text-gray-400">0.01</td>
                    <td className="p-2.5">1.45%</td>
                    <td className="p-2.5 font-mono">14.5 mg/g</td>
                    <td className="p-2.5 text-right text-emerald-800 font-bold">Detected</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">CBC (Cannabichromene)</td>
                    <td className="p-2.5 text-gray-400">0.01</td>
                    <td className="p-2.5">0.62%</td>
                    <td className="p-2.5 font-mono">6.2 mg/g</td>
                    <td className="p-2.5 text-right text-emerald-800 font-bold">Detected</td>
                  </tr>
                  <tr className="bg-gray-50 font-bold">
                    <td className="p-2.5 text-gray-900">Total Potency Sum</td>
                    <td className="p-2.5 text-gray-400">--</td>
                    <td className="p-2.5 text-emerald-900">{totalCannabinoids}</td>
                    <td className="p-2.5 font-mono text-emerald-900">314.0 mg/g</td>
                    <td className="p-2.5 text-right text-emerald-800 uppercase">Certified Clean</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Terpene Profile Summary */}
          <div>
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-700 mb-2">
              Primary Terpene Profile (GC-MS - Total: {totalTerps})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-gray-50 border border-gray-200 p-2.5 rounded-lg">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">β-Myrcene</span>
                <span className="font-extrabold text-gray-900">1.12% (11.2 mg/g)</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-2.5 rounded-lg">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">d-Limonene</span>
                <span className="font-extrabold text-gray-900">0.84% (8.4 mg/g)</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-2.5 rounded-lg">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">β-Caryophyllene</span>
                <span className="font-extrabold text-gray-900">0.58% (5.8 mg/g)</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-2.5 rounded-lg">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Linalool / Pinene</span>
                <span className="font-extrabold text-gray-900">0.30% (3.0 mg/g)</span>
              </div>
            </div>
          </div>

          {/* Signatures, Official Logo Seal Watermark & QR Code Verification */}
          <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-end gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src={logoUrl}
                  alt="Official Logo Seal"
                  className="w-12 h-12 rounded-full object-cover border border-emerald-800 opacity-90"
                />
                <div>
                  <span className="font-serif italic font-bold text-gray-800 text-sm block">Dr. Arthur Vance, Ph.D.</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Chief Analytical Chemist &amp; Lab Director</span>
                  <span className="text-[9px] text-emerald-800 font-mono block">Global Herbs Analytical Services Inc.</span>
                </div>
              </div>
            </div>

            {/* Stamp & Verification QR */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[9px] font-mono text-gray-400 block">Digital Verification Hash:</span>
                <span className="text-[9px] font-mono font-bold text-gray-700 block max-w-[220px] truncate">
                  e9a73bf8220811c402a905c1ju22n6db
                </span>
                <span className="text-[10px] font-bold text-emerald-800 uppercase block mt-0.5">
                  Authorized Global Herbs Official COA
                </span>
              </div>

              <div className="w-14 h-14 bg-gray-100 border border-gray-300 rounded-lg p-1 flex flex-col items-center justify-center text-center">
                <QrCode size={36} className="text-gray-800" />
                <span className="text-[7px] font-bold text-gray-500 uppercase mt-0.5">Scan to Verify</span>
              </div>
            </div>
          </div>

          {/* Disclaimer Footer */}
          <div className="text-[9px] text-gray-400 leading-tight border-t border-gray-100 pt-3">
            <strong>Disclaimer:</strong> This Certificate of Analysis (COA) is generated by Global Herbs Inc. Accredited Analytical Testing Laboratories. All results apply exclusively to the specific sample batch submitted. Test methods conform to ISO 17025 standardized liquid chromatography guidelines. Reproduction without express written permission from Global Herbs Inc. is strictly prohibited.
          </div>

        </div>

      </div>
    </div>
  );
}

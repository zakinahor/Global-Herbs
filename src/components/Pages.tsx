import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, Truck, RotateCcw, Lock, Leaf, Award, Eye, Clock, Phone, Mail, Download } from 'lucide-react';
import logoUrl from '../assets/images/global_herbs_logo_1784328365704.jpg';
import { DEFAULT_FALLBACK_IMAGE } from '../utils/imageUtils';
import ContactForm from './ContactForm';

interface PageWrapperProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function PageWrapper({ title, subtitle, children }: PageWrapperProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-left">
      <div className="border-b border-gray-100 pb-8 mb-10">
        <h1 className="font-heading font-bold text-3xl sm:text-4xl text-gray-900 uppercase tracking-tight mb-3">
          {title}
        </h1>
        <p className="text-sm text-emerald-800 font-bold uppercase tracking-wider">
          {subtitle}
        </p>
      </div>
      <div className="prose prose-emerald max-w-none space-y-8 text-gray-600 text-sm leading-relaxed font-semibold">
        {children}
      </div>
    </div>
  );
}

export function AboutPage({ onSelectPage }: { onSelectPage?: (p: string) => void }) {
  return (
    <PageWrapper
      title="About Our Shop"
      subtitle="The Global Herbs Dispensary Legacy of Excellence Since 2023"
    >
      <div className="grid md:grid-cols-2 gap-8 items-center bg-emerald-50/50 p-6 sm:p-8 rounded-2xl border border-emerald-100/60 mb-8">
        <div className="space-y-4">
          <div className="w-12 h-12 bg-emerald-800 text-white rounded-xl flex items-center justify-center shadow-md">
            <Leaf size={24} />
          </div>
          <h3 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-tight">
            Our Pure Sourcing Philosophy
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Founded in Cave Junction, Oregon in 2023, Global Herbs has grown from a local organic advocate 
            collective into the premier online mail-order dispensary nationwide and globally. We strictly source from 
            licensed craft cultivators who avoid chemical growth enhancers, heavy pesticides, or sub-par curing.
          </p>
        </div>
        <div className="space-y-4 border-t md:border-t-0 md:border-l border-emerald-200/50 pt-6 md:pt-0 md:pl-8">
          <div className="w-12 h-12 bg-emerald-800 text-white rounded-xl flex items-center justify-center shadow-md">
            <Award size={24} />
          </div>
          <h3 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-tight">
            Guaranteed Quality & Delivery
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Every flower block, DMT cartridge, mushroom capsule, and concentrate package is hand-selected and 
            undergoes dual-tier third-party laboratory verification. If our premium products do not meet your exact 
            standards, we stand by our robust refunds and guarantee structure to ensure perfect client satisfaction.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          Who We Serve
        </h2>
        <p>
          At Global Herbs Dispensary, we serve medical patients seeking consistent therapeutic dosing, wellness enthusiasts 
          focusing on natural alternative healing modalities, and adult recreational connoisseurs seeking top-shelf quality. 
          We offer convenient home delivery pathways for individuals living in areas without physical access to high-standard dispensaries.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          Absolute Privacy & Absolute Integrity
        </h2>
        <p>
          We know that privacy is paramount when shopping for alternative therapeutics. That's why every transaction 
          on our platform is fully encrypted and all delivery parcels are vacuum-sealed in generic containers. 
          We never maintain commercial tracking history beyond your immediate delivery window to ensure total peace of mind.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          Corporate Standards
        </h2>
        <p>
          Our warehouse dispatch centers operate continuous shifts from Cave Junction, OR to make sure order routing 
          remains constant and tracking information is issued within 24 business hours of successful validation. 
          Our professional support and dispatch lines remain at your complete disposal for custom or bulk bulk requests.
        </p>
      </div>

      <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-6 sm:p-8 my-8">
        <h3 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-tight mb-3 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          Official Brand Logo Download
        </h3>
        <p className="text-xs text-gray-600 mb-6 leading-relaxed">
          Need our official high-resolution logo for media publications, verification registries, or digital partner sites? You can view and download the official high-resolution Global Herbs circular brand emblem directly below.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <img
              src={logoUrl}
              alt="Global Herbs Official Circular Logo"
              className="w-16 h-16 rounded-full object-cover border-2 border-emerald-800 shadow-md transform hover:rotate-12 transition duration-300"
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.src = DEFAULT_FALLBACK_IMAGE; }}
            />
            <div className="text-left">
              <h4 className="font-heading font-bold text-xs text-gray-950 uppercase tracking-wider">
                Global Herbs Logo Emblem
              </h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                JPG Format • High Resolution
              </p>
            </div>
          </div>
          <a
            href={logoUrl}
            download="global-herbs-logo.jpg"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-xs cursor-pointer select-none"
          >
            <Download size={14} />
            <span>Download Brand Logo</span>
          </a>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-4 justify-between items-center">
        <div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Ready to explore?</p>
          <p className="text-[10px] text-gray-500 font-medium">Browse our full menu of certified therapeutic items.</p>
        </div>
        <Link
          to="/products"
          className="inline-block px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-xs cursor-pointer"
        >
          Go to Dispensary Catalog
        </Link>
      </div>
    </PageWrapper>
  );
}

export function ShippingPage({ onSelectPage }: { onSelectPage?: (p: string) => void }) {
  return (
    <PageWrapper
      title="Secure Shipping Policy"
      subtitle="Industry-Leading Double Vacuum Sealed Odourless Stealth Shipping"
    >
      <div className="grid sm:grid-cols-3 gap-6 mb-8 text-center sm:text-left">
        <div className="p-5 bg-gray-50 border border-gray-100 rounded-xl">
          <Truck className="text-emerald-800 mb-2 mx-auto sm:mx-0 animate-bounce" size={24} />
          <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-900 mb-1">Flat Rate Courier</h4>
          <p className="text-[11px] text-gray-500">Express trackable dispatch for $19.99 flat rate globally.</p>
        </div>
        <div className="p-5 bg-gray-50 border border-gray-100 rounded-xl">
          <ShieldCheck className="text-emerald-800 mb-2 mx-auto sm:mx-0" size={24} />
          <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-900 mb-1">Free Over $249.99</h4>
          <p className="text-[11px] text-gray-500">Any order exceeding $249.99 triggers automated free shipping.</p>
        </div>
        <div className="p-5 bg-gray-50 border border-gray-100 rounded-xl">
          <Clock className="text-emerald-800 mb-2 mx-auto sm:mx-0" size={24} />
          <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-900 mb-1">Fast 2-3 Day Transit</h4>
          <p className="text-[11px] text-gray-500">Standard domestic transit time takes 2 to 3 business days.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          The Double Vacuum Seal Protocol
        </h2>
        <p>
          All flower products, hashes, extracts, and gummies are meticulously sealed inside clinical-grade, moisture-proof barrier bags 
          using high-performance chamber vacuum sealers. Following validation, the primary bag is sanitized and passed into a secondary, 
          thick medical-grade protective seal. This prevents any scent molecular emissions and safeguards your package against 
          unexpected temperature shifts during dispatch.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          Discrete Stealth Packaging
        </h2>
        <p>
          We use completely unmarked, generic cardboard boxes or heavy poly-mailers. Senders' coordinates refer to our generalized distribution 
          corporations with no mention of "Global Herbs", "dispensary", "cannabis", "DMT", or alternative botanicals. 
          Your parcel will appear identical to everyday commerce shipments (e.g., electronic accessories or generic apparel).
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          Tracking & Validation
        </h2>
        <p>
          Once your package is accepted by the carrier (USPS, Canada Post, FedEx, or specialized discreet couriers), 
          an automated email tracking key will be sent to the email provided during invoice checkout. 
          Tracking systems might require up to 12 hours after physical collection to reflect update coordinates.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          Delays & Seizures
        </h2>
        <p>
          While 99.8% of our orders clear transit without friction, occasional delays can happen due to adverse weather or logistics. 
          Please review our <strong>Refund and Returns Guarantee</strong>. We offer free, prompt reshipping if a parcel becomes stuck in transit for 
          over 14 business days.
        </p>
      </div>

      <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-4 justify-between items-center">
        <Link
          to="/products"
          className="inline-block px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-xs cursor-pointer"
        >
          Return to Catalog
        </Link>
      </div>
    </PageWrapper>
  );
}

export function RefundPage({ onSelectPage }: { onSelectPage?: (p: string) => void }) {
  return (
    <PageWrapper
      title="Refund & Returns Guarantee"
      subtitle="100% Secure Delivery Insurance or Money-Back Protection"
    >
      <div className="bg-emerald-950 text-white p-6 rounded-2xl border border-emerald-900 mb-8 flex flex-col sm:flex-row gap-6 items-center">
        <RotateCcw size={40} className="text-brand-green flex-shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
        <div className="text-center sm:text-left">
          <h4 className="font-heading font-bold text-sm uppercase tracking-wider">Our Commitment to Your Trust</h4>
          <p className="text-xs text-emerald-100 mt-1">
            We understand purchasing botanicals online requires absolute confidence. Global Herbs offers 100% protection 
            guarantees. If your package doesn't arrive as confirmed by logistics, we refund or reship with no extra charges.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          Package Lost in Transit
        </h2>
        <p>
          If your tracking coordinates show no update for more than 14 business days, or if the package is flagged by customs 
          or logistics, please contact our dispatch lines immediately. We will initiate an inquiry and, if confirmed missing, 
          issue a 100% free reshipment or refund your full payment.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          Defective, Damaged, or Wrong Items
        </h2>
        <p>
          In the rare event that you receive a defective cartridge (such as a leaky coil), or if we mistakenly packed the wrong 
          product tier, please capture a clear photograph or video showing the defect or item label and submit it to 
          <a href="mailto:globalherbsinc@gmail.com" className="text-emerald-700 hover:underline mx-1">globalherbsinc@gmail.com</a> 
          within 48 hours of delivery. We will dispatch replacements immediately at our expense.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          Address Errors
        </h2>
        <p>
          Please double-check your shipping coordinates when filling out checkout details. We cannot issue refunds or reshipments 
          if a parcel is delivered to the wrong address because of an incorrect address input. If you realize an error 
          has occurred, please contact us immediately so we can update the shipping label before dispatch.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          How to Initiate a Claim
        </h2>
        <p>
          To make a claim, simply contact our Support Dispatch team through our integrated 
          <Link to="/products#contact-section" className="text-emerald-700 hover:underline font-bold cursor-pointer mx-1">Inquiry Form</Link> 
          or directly via email. Please specify your Order ID, name, email, and description of your issue.
        </p>
      </div>

      <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-4 justify-between items-center">
        <Link
          to="/products"
          className="inline-block px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-xs cursor-pointer"
        >
          Return to Catalog
        </Link>
      </div>
    </PageWrapper>
  );
}

export function PrivacyPage({ onSelectPage }: { onSelectPage?: (p: string) => void }) {
  return (
    <PageWrapper
      title="Privacy Policy Terms"
      subtitle="Absolute Confidentiality, 256-Bit SSL Encryption, & Purged Dispatch History"
    >
      <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-4 mb-8 text-emerald-800">
        <Lock size={24} className="flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-heading font-bold text-xs uppercase tracking-wider">Zero Permenant Log Policy</h4>
          <p className="text-xs text-gray-600 font-semibold leading-relaxed">
            We believe your therapy choices are your business. Global Herbs never logs details of what you order 
            or your location permanently. All order histories, addresses, and transaction details are completely purged 
            14 business days following delivery validation.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          Data Security Encryption
        </h2>
        <p>
          Our web servers employ end-to-end 256-bit Secure Socket Layer (SSL) encryption protocol. 
          All credit card references (if any) or validation keys are completely tokenized and never pass through or remain 
          recorded on our servers.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          Information We Collect & Why
        </h2>
        <p>
          We only collect standard information necessary to fulfill your orders and keep you updated on progress:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-gray-600 font-semibold">
          <li><strong>Email Address:</strong> Used for checkout receipts, courier tracking keys, and optional secret sales coupons.</li>
          <li><strong>Shipping Coordinates:</strong> Required for physical carrier routing. Purged after delivery confirmation.</li>
          <li><strong>Contact Phone:</strong> Used solely in case our dispatchers require urgent verification before shipping.</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          Third Party Disclosures
        </h2>
        <p>
          Global Herbs never shares, sells, rents, or discloses any personal customer data to third-party commercial databases, 
          marketing agencies, or auxiliary business networks. Your privacy remains perfectly secured.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          Cookies
        </h2>
        <p>
          We employ small functional browser cookies to remember items in your cart, category selections, and 
          sort selections. These are completely transient and expire once your browsing session terminates.
        </p>
      </div>

      <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-4 justify-between items-center">
        <Link
          to="/products"
          className="inline-block px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-xs cursor-pointer"
        >
          Return to Catalog
        </Link>
      </div>
    </PageWrapper>
  );
}

export function ContactPage() {
  return (
    <div className="w-full flex-grow py-6">
      <ContactForm />
    </div>
  );
}

export function TermsPage({ onSelectPage }: { onSelectPage?: (p: string) => void }) {
  return (
    <PageWrapper
      title="Terms & Discreet Shipping Conditions"
      subtitle="Official Dispensary Ordering Terms, Age Verification, Odourless Stealth Packaging & Delivery Protocol"
    >
      {/* Overview Highlights Banner */}
      <div className="grid sm:grid-cols-3 gap-6 mb-8 text-center sm:text-left">
        <div className="p-5 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
          <ShieldCheck className="text-emerald-800 mb-2.5 mx-auto sm:mx-0" size={26} />
          <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-900 mb-1">
            21+ Age Mandate
          </h4>
          <p className="text-[11px] text-gray-600">
            Strict age verification enforced for all botanical orders and therapeutic dispensations.
          </p>
        </div>
        <div className="p-5 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
          <Truck className="text-emerald-800 mb-2.5 mx-auto sm:mx-0" size={26} />
          <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-900 mb-1">
            Stealth Double-Sealed
          </h4>
          <p className="text-[11px] text-gray-600">
            Dual medical-grade vacuum barrier sealing guarantees 100% odourless & discrete transit.
          </p>
        </div>
        <div className="p-5 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
          <Lock className="text-emerald-800 mb-2.5 mx-auto sm:mx-0" size={26} />
          <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-900 mb-1">
            Zero-Log Privacy
          </h4>
          <p className="text-[11px] text-gray-600">
            End-to-end 256-bit SSL encryption. Shipping coordinates purged 14 days after delivery.
          </p>
        </div>
      </div>

      {/* Section 1: Acceptance & Eligibility */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          1. Agreement to Terms &amp; Legal Age Eligibility (21+)
        </h2>
        <p>
          By accessing Global Herbs Dispensary, placing an order, or checking the terms agreement box during checkout, you legally acknowledge, represent, and warrant that you are at least <strong>twenty-one (21) years of age</strong> (or the legal age of majority in your jurisdiction) and possess full legal capacity to enter into these binding terms.
        </p>
        <p>
          All botanical goods, lab-tested herbal formulations, therapeutic mushrooms, THCa flower, concentrates, and wellness tinctures offered on this platform are intended strictly for lawful adult personal use or therapeutic alternative medicine regimens. Global Herbs reserves the right to cancel any transaction suspected of underage solicitation.
        </p>
      </div>

      {/* Section 2: Discreet Stealth Packaging Conditions */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          2. Discreet Stealth Packaging &amp; Odourless Dispatch Conditions
        </h2>
        <p>
          We hold your discretion and peace of mind as our highest operational priority. All orders processed through Global Herbs are fulfilled under our strict <strong>Stealth Double-Seal Packaging Protocol</strong>:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-gray-600 font-semibold">
          <li>
            <strong>Dual-Tier Clinical Vacuum Sealing:</strong> Products are first sealed inside an airtight, moisture-barrier mylar pouch, thoroughly sanitized, and then encased within a secondary heavy-gauge commercial vacuum seal. This blocks 100% of aromatic terpenes and volatile scents.
          </li>
          <li>
            <strong>Completely Generic Outer Packaging:</strong> Orders are dispatched in standard, unmarked cardboard mailers or heavy poly-envelopes. There is zero external branding, logos, or botanical references.
          </li>
          <li>
            <strong>Neutral Return Address:</strong> The shipping label features an authorized neutral corporate logistics identifier with no mention of "Global Herbs", "Dispensary", "Cannabis", "DMT", "Mushrooms", or botanical terms.
          </li>
          <li>
            <strong>Damage &amp; Tamper-Evident Enclosures:</strong> Inner boxes are reinforced with shock-absorbing fill to ensure fragile cartridges, tinctures, and glass jars remain pristine throughout carrier sorting.
          </li>
        </ul>
      </div>

      {/* Section 3: Shipping Rates, Delivery Windows & Free Shipping */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          3. Shipping Options, Tracking &amp; Delivery Windows
        </h2>
        <p>
          Global Herbs processes and ships orders Monday through Saturday from our secure fulfillment center in Cave Junction, Oregon.
        </p>
        <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-4 text-xs space-y-2">
          <div className="flex justify-between font-bold border-b border-gray-200 pb-1.5">
            <span className="text-gray-900">Delivery Tier</span>
            <span className="text-gray-900">Estimated Transit &amp; Pricing</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Standard Discreet Express Dispatch:</span>
            <span className="font-bold text-gray-900">2 – 4 Business Days ($19.99 Flat Rate)</span>
          </div>
          <div className="flex justify-between text-emerald-800 font-bold">
            <span>Orders Over $249.99:</span>
            <span>FREE Automatic Stealth Express Upgrade</span>
          </div>
        </div>
        <p>
          Live carrier tracking numbers are generated and emailed within 12 to 24 hours of payment validation. Please note that courier scans may take up to 12 hours after physical induction to populate carrier tracking portals.
        </p>
      </div>

      {/* Section 4: Guaranteed Delivery, Loss Protection & Reshipment */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          4. Guaranteed Delivery Insurance &amp; Reshipment Policy
        </h2>
        <p>
          We maintain an industry-leading 99.8% successful delivery clearance rate. In the rare event that an order encounters logistics friction:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-gray-600 font-semibold">
          <li>
            <strong>Stall in Transit:</strong> If a package shows no active scanning update for 14 consecutive business days, Global Herbs will provide a <strong>100% free stealth reshipment</strong> or a full refund without hassle.
          </li>
          <li>
            <strong>Damaged or Missing Items:</strong> If any item arrives damaged or missing from your parcel, notify our support desk at <a href="mailto:globalherbsinc@gmail.com" className="text-emerald-700 underline">globalherbsinc@gmail.com</a> within 48 hours of confirmed delivery with photo documentation for immediate priority replacement.
          </li>
          <li>
            <strong>Accuracy of Shipping Address:</strong> Clients are solely responsible for ensuring shipping details entered at checkout are accurate. We cannot offer refunds or free replacements for parcels misdelivered due to incorrect customer-submitted coordinates.
          </li>
        </ul>
      </div>

      {/* Section 5: Payment Terms & Confidentiality */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          5. Payment Gateways, Discrete Billing &amp; Privacy Protections
        </h2>
        <p>
          To maintain utmost client confidentiality, Global Herbs supports verified discrete payment methods including Cryptocurrency (Bitcoin, Ethereum, USDT with 5% checkout savings), P2P transfers (Zelle, Cash App, Venmo), Interac e-Transfer / Bank Wire, and Express Wallets (Apple Pay / Google Pay).
        </p>
        <p>
          Payment records will appear under neutral commercial billing descriptors. Furthermore, under our <strong>Zero-Permanent Log Policy</strong>, personal coordinates and order invoices are automatically encrypted and systematically purged from active server registries 14 days after verified receipt.
        </p>
      </div>

      {/* Section 6: Compliance & Legal Disclaimers */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-800 rounded-full"></span>
          6. Farm Bill Compliance &amp; Health Disclaimer
        </h2>
        <p>
          Hemp-derived cannabinoid products sold by Global Herbs comply with the 2018 United States Farm Bill, containing less than 0.3% Delta-9 THC on a dry-weight basis. Statements regarding dietary supplements or botanical extracts have not been evaluated by the Food and Drug Administration (FDA). Products are not intended to diagnose, treat, cure, or prevent any medical condition. Always consult your physician before beginning any new wellness regimen.
        </p>
      </div>

      {/* Quick Action Navigation Footer */}
      <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-4 justify-between items-center">
        <div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Have specific questions?</p>
          <p className="text-[11px] text-gray-600 font-medium">Our dispatch help desk is available 24/6 to assist with custom requests.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/contact"
            className="inline-block px-5 py-2.5 border border-gray-300 hover:border-gray-400 bg-white text-gray-800 font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-xs cursor-pointer"
          >
            Contact Dispatch
          </Link>
          <Link
            to="/checkout"
            className="inline-block px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-xs cursor-pointer"
          >
            Return to Checkout
          </Link>
        </div>
      </div>
    </PageWrapper>
  );
}

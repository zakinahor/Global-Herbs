export interface CategorySeoGuide {
  slug: string;
  categoryName: string;
  targetKeywords: string[];
  metaTitle: string;
  metaDescription: string;
  h1Heading: string;
  wordCount: number;
  overview: string;
  geneticsAndTerpenes: {
    title: string;
    content: string;
    keyTerpenes: string[];
    potencyRange: string;
  };
  buyerGuide: {
    title: string;
    paragraphs: string[];
  };
  complianceAndQuality: string;
  faqs: {
    question: string;
    answer: string;
  }[];
}

export const categorySeoMap: Record<string, CategorySeoGuide> = {
  flowers: {
    slug: 'flowers',
    categoryName: 'Cannabis Flowers & THCa',
    targetKeywords: [
      'Buy THCa flower online',
      'High THCa strains online dispensary',
      'Premium AAA exotic flower',
      'Farm Bill compliant THCa weed',
      'Indica Sativa Hybrid flower shipping',
    ],
    metaTitle: 'Buy High THCa Flower Online | Premium Exotic Cannabis | Global Herbs',
    metaDescription: 'Shop high THCa flower online at Global Herbs. 100% legal under the 2018 Farm Bill, lab-tested, vacuum-sealed stealth delivery. Top exotic Indica, Sativa & Hybrid genetics.',
    h1Heading: 'Buy High THCa Flower Online — AAA+ Organic Genetics & Exotic Strains',
    wordCount: 420,
    overview: `Welcome to Global Herbs, your #1 trusted online dispensary to buy high THCa flower online with guaranteed lab testing and 100% discrete vacuum-sealed delivery. Our flower collection features top-shelf craft cultivars grown by master horticulturists in climate-controlled indoor organic living soil facilities. Under the federal 2018 Farm Bill, THCa (tetrahydrocannabinolic acid) flower containing less than 0.3% Delta-9 THC by dry weight is legally compliant while delivering the exact same potency, rich terpene aroma, dense trichome coating, and elevated experience when heated or smoked.`,
    geneticsAndTerpenes: {
      title: 'Genetics, Terpene Profiles & Cannabinoid Content',
      content: `Each harvested strain batch undergoes rigorous third-party ISO-accredited lab testing. Our top-shelf THCa cultivars range from 24% to 38% total potential THCa. Our flower selection spans pure Indica relaxation powerhouses like Godfather OG and Granddaddy Purple, energetic Sativa landraces like Green Crack and Super Lemon Haze, and balanced Hybrid powerhouses like Gelato 33 and Runtz. High terpene retention (2.8% to 4.5% total terpenes) preserves rich aroma notes of diesel, sweet berries, earthy pine, and citrus gas thanks to slow cold-cure drying protocols.`,
      keyTerpenes: ['Beta-Myrcene (Sedative)', 'Limonene (Uplifting)', 'Beta-Caryophyllene (Anti-inflammatory)', 'Linalool (Calming)'],
      potencyRange: '24% - 38% THCa | <0.3% Delta-9 THC',
    },
    buyerGuide: {
      title: 'How to Choose the Right THCa Strain for Your Needs',
      paragraphs: [
        `When selecting THCa flower online, matching the cannabinoid and terpene profile to your desired effect is key. If you seek deep physical relaxation, nighttime muscle ease, or help falling asleep, opt for our Heavy Indica cultivars rich in Myrcene and Linalool.`,
        `For daytime creativity, social engagement, or daytime focus, choose Sativa-dominant THCa strains high in Limonene and Terpinolene. If you desire a versatile all-day smoke that balances mental clarity with comfortable body ease, Hybrid strains deliver the ideal equilibrium.`,
        `Every jar and bag of flower is double vacuum-sealed in food-grade, odor-proof barrier bags with Boveda 62% humidity control packs included to preserve sticky trichomes and prevent drying out during transit.`,
      ],
    },
    complianceAndQuality: 'All THCa flower products sold by Global Herbs are derived from compliant industrial hemp cultivars, tested by ISO-17025 accredited third-party laboratories, and accompanied by verifiable QR-code COAs.',
    faqs: [
      {
        question: 'Is it legal to buy THCa flower online in the United States?',
        answer: 'Yes! Under the 2018 Federal Farm Bill, hemp derivatives containing no more than 0.3% Delta-9 THC on a dry weight basis are federally legal. THCa is the raw, non-psychoactive precursor to Delta-9 THC that converts when heated during smoking or vaping.',
      },
      {
        question: 'How is THCa flower shipped discretely?',
        answer: 'Orders are shipped in plain brown boxes or bubble mailers with no dispensary branding on the exterior. Inside, flower is sealed in double-layer heat-sealed Mylar bags with a scent-proof barrier, complete with Notice to Law Enforcement and Lab COA documentation.',
      },
      {
        question: 'How does THCa compare to traditional Delta-9 THC dispensary weed?',
        answer: 'Chemically and atmospherically, THCa flower is identical to traditional dispensary flower. When you apply heat (via a lighter, vaporizer, or oven), THCa undergoes decarboxylation and converts into active Delta-9 THC at a ~87.7% conversion rate.',
      },
    ],
  },

  concentrates: {
    slug: 'concentrates',
    categoryName: 'Live Hash Rosin & Concentrates',
    targetKeywords: [
      'Live Hash Rosin online store',
      'Buy solventless rosin online',
      'THC dabs shatter wax badder delivery',
      'Ice water hash rosin 90u',
      'High terpene extract online dispensary',
    ],
    metaTitle: 'Buy Live Hash Rosin & Concentrates Online | Global Herbs',
    metaDescription: 'Shop solventless Live Hash Rosin, Shatter, Badder, and Diamonds online at Global Herbs. 100% solvent-free 90u ice water hash rosin with ultra-pure terpenes and fast shipping.',
    h1Heading: 'Live Hash Rosin & Extract Online Store — Solventless Concentrates & Dabs',
    wordCount: 380,
    overview: `Elevate your dabbing experience with Global Herbs, the premiere Live Hash Rosin online store for solventless extracts, THCa diamonds, cold-cure badders, and artisan shatters. Our solventless rosin is crafted using fresh-frozen whole plant flower washed in ice water to isolate pure 73u-120u trichome heads, then gently pressed under low temperature and hydraulic pressure. The result is an unadulterated, terpene-rich extract free of hydrocarbons, ethanol, or residual solvents.`,
    geneticsAndTerpenes: {
      title: 'Purity, Terpene Retention & Cold-Cure Process',
      content: `Our live hash rosin boasts total cannabinoid purities ranging from 75% to 92% with terpene profiles reaching up to 8% to 12% total terpenes. By harvesting fresh frozen plants at peak trichome maturity, volatile monoterpenes like Beta-Pinene, Ocimene, and Terpinolene are preserved. Our cold-cure badder is whipped in cold rooms for 21 days to achieve a creamy, cake-batter texture that vaporizes cleanly on low-temp quartz bangers.`,
      keyTerpenes: ['Caryophyllene Oxide', 'Alpha-Pinene', 'Humulene', 'Myrcene'],
      potencyRange: '75% - 94% Cannabinoids | 8%+ Terpenes',
    },
    buyerGuide: {
      title: 'Concentrate Varieties: Rosin vs Badder vs Live Resin Shatter',
      paragraphs: [
        `If pure flavor and chemical-free consumption are your top priorities, choose 1st Tier Live Hash Rosin. For dabbing enthusiasts seeking intense potency and crystal clarity, our Liquid Diamonds and Sauce provide concentrated crystalline THCa bathed in terpene sauce.`,
        `For traditional dabbers looking for easy handling on hot nails, our Budder and Wax varieties provide a pliable, smooth consistency that mixes easily with flower or melts cleanly in electronic dab rigs.`,
      ],
    },
    complianceAndQuality: 'Every batch of rosin and concentrate comes with full panel lab testing verifying 0.00% heavy metals, pesticides, or residual solvents.',
    faqs: [
      {
        question: 'What is the difference between Live Rosin and Live Resin?',
        answer: 'Live Rosin is 100% solventless, made using only ice water, heat, and pressure. Live Resin uses hydrocarbon solvents like butane or propane to extract cannabinoids from frozen plants. Rosin delivers a cleaner, more authentic flower flavor.',
      },
      {
        question: 'How should I store my Live Hash Rosin?',
        answer: 'To preserve volatile terpenes and prevent drying out, store your rosin in a sealed airtight glass container inside a refrigerator or wine cooler between 35°F and 45°F. Bring to room temperature 10 minutes before dabbing.',
      },
    ],
  },

  edibles: {
    slug: 'edibles',
    categoryName: 'THC & CBD Edibles',
    targetKeywords: [
      'Full Spectrum CBD drops for sleep',
      'Buy THC gummies online',
      'High potency weed edibles online dispensary',
      'Nano emulsified THC gummies',
      'Microdose CBD THC gummies delivery',
    ],
    metaTitle: 'Buy THC & Full Spectrum CBD Edibles Online | Global Herbs',
    metaDescription: 'Shop high-potency THC gummies, chocolates, and Full Spectrum CBD drops for sleep online. Fast acting nano-emulsified formulas with lab-tested precise dosing.',
    h1Heading: 'Full Spectrum CBD Drops & THC Edibles — Gummies, Chocolates & Tinctures',
    wordCount: 360,
    overview: `Explore our premium collection of gourmet THC edibles and Full Spectrum CBD drops for sleep and daily wellness at Global Herbs. We craft our edibles using organic tapioca syrup, real fruit juices, and premium full-spectrum nano-emulsified hemp extract. Whether you want 10mg microdose gummies for daytime focus or 50mg full-spectrum sleep tinctures infused with CBN and melatonin, our lab-calibrated edibles guarantee consistent, delicious dosing every single time.`,
    geneticsAndTerpenes: {
      title: 'Bioavailability & Fast-Acting Nano Technology',
      content: `Standard edibles take 60 to 90 minutes to take effect through gastrointestinal digestion. Our fast-acting nano-emulsified gummies utilize ultrasonic soundwaves to break cannabinoid oil into water-soluble micro-particles (under 100nm), allowing sublingual absorption starting in as little as 15 to 20 minutes with up to 4x higher bioavailability.`,
      keyTerpenes: ['CBN (Sleep Terpene Compound)', 'CBG (Focus & Gut Health)', 'Full Spectrum Terpenes'],
      potencyRange: '5mg - 100mg per piece | 500mg - 3000mg per bottle',
    },
    buyerGuide: {
      title: 'Edible Dosing Guide for Beginners to Veterans',
      paragraphs: [
        `Beginners should always start low and go slow: 2.5mg to 5mg is ideal for new users. Intermediate consumers usually prefer 10mg to 25mg for balanced stress relief and body euphoria. Experienced users with high tolerance can explore our 50mg to 100mg mega-dose gummies.`,
        `For sleep enhancement, look for tinctures and drops combining Full Spectrum CBD with minor cannabinoids CBN and Myrcene, taken 30 minutes before bed under the tongue.`,
      ],
    },
    complianceAndQuality: 'Made in GMP-certified food facilities with 100% natural organic ingredients, vegan pectin, and lab-verified cannabinoid potency.',
    faqs: [
      {
        question: 'How long do THC edibles and CBD drops take to kick in?',
        answer: 'Standard gummies take 45-70 minutes. Nano-emulsified gummies and sublingual CBD drops take 15-25 minutes as they enter the bloodstream faster through sublingual mucosal tissues.',
      },
      {
        question: 'Are Full Spectrum CBD drops effective for insomnia and sleep?',
        answer: 'Yes! Full Spectrum CBD drops retain natural terpenes and minor cannabinoids like CBN and CBC that interact synergistically with endocannabinoid receptors to promote deep REM sleep and muscle relaxation.',
      },
    ],
  },

  'disposable-vapes': {
    slug: 'disposable-vapes',
    categoryName: 'Disposable Vapes & Carts',
    targetKeywords: [
      'Live Resin disposable vapes online',
      'Buy THCa vape cartridges online',
      'Rechargeable ceramic coil disposable pens',
      'Liquid diamonds vape pen delivery',
      'Stealth weed vape pen online shop',
    ],
    metaTitle: 'Buy Live Resin & THCa Disposable Vapes Online | Global Herbs',
    metaDescription: 'Order premium Live Resin & Liquid Diamond Disposable Vapes online at Global Herbs. Postless ceramic technology, zero clogged hardware, 100% pure cannabis terpenes.',
    h1Heading: 'Live Resin & Liquid Diamond Disposable Vapes — Discrete & Potent',
    wordCount: 350,
    overview: `Shop high-tech, discrete, and potent Disposable Vapes and Cartridges online at Global Herbs. Our vape hardware features medical-grade stainless steel, postless medical ceramic heating elements, and variable-draw technology to eliminate burnt taste and oil clogging. Filled with 100% pure unadulterated Live Resin, Liquid Diamonds, or High-THCa distillate infused with cannabis-derived terpenes (CDTs), our disposable pens offer smooth clouds and rich flavor on the go.`,
    geneticsAndTerpenes: {
      title: 'Ceramic Heating Core & Cannabis-Derived Terpenes',
      content: `Unlike cheap metal coil carts that leach heavy metals, our all-ceramic atomizers heat oil evenly at low temperatures (2.2V - 2.8V) to protect delicate strain terpenes. Free of Vitamin E acetate, PG, VG, or artificial flavorings.`,
      keyTerpenes: ['100% Strain Specific CDTs', 'Beta-Caryophyllene', 'Limonene', 'Myrcene'],
      potencyRange: '82% - 96% Total Cannabinoids | 1g & 2g Capacities',
    },
    buyerGuide: {
      title: 'Selecting Your Vape: Distillate vs Live Resin vs Liquid Diamonds',
      paragraphs: [
        `If you need maximum potency with minimal cannabis odor in public settings, select High-Purity Distillate vapes. If you want the full-spectrum entourage effect that mirrors smoking fresh flower, choose Live Resin or Live Rosin disposables.`,
        `All disposable hardware includes USB-C rechargeable ports to ensure you get every last drop of oil without dead battery issues.`,
      ],
    },
    complianceAndQuality: 'Heavy metal free, lab tested for purity, equipped with anti-clogging dual air channels.',
    faqs: [
      {
        question: 'Are Global Herbs vape pens rechargeable?',
        answer: 'Yes! All 1g and 2g disposable vape devices feature a USB-C fast charging port at the base so battery charge never expires before oil runs out.',
      },
      {
        question: 'Do disposable vapes smell like flower smoke?',
        answer: 'Vape mist dissipates within 60 seconds and leaves no lingering smoke odor in clothes or rooms, making dissposables the ultimate stealth option.',
      },
    ],
  },

  'magic-mushroom': {
    slug: 'magic-mushroom',
    categoryName: 'Magic Mushrooms & Botanicals',
    targetKeywords: [
      'Buy magic mushrooms online',
      'Microdose psilocybin capsules dispensary',
      'Golden Teacher dried mushrooms shipping',
      'Psilocybin chocolates & gummies online',
      'Microdosing guide for focus & mood',
    ],
    metaTitle: 'Buy Magic Mushrooms & Microdose Capsules Online | Global Herbs',
    metaDescription: 'Shop premium dried magic mushrooms, Golden Teacher, Penis Envy, microdose capsules, and psilocybin chocolates online at Global Herbs. Discreet stealth delivery guaranteed.',
    h1Heading: 'Dried Magic Mushrooms, Microdose Capsules & Chocolates Online Store',
    wordCount: 370,
    overview: `Global Herbs offers premium dried botanical magic mushrooms, microdose capsules, and gourmet psilocybin chocolates grown in clean, sterile lab environments. Featuring legendary strains like Golden Teacher, Penis Envy, Blue Meanie, and Albino A+, our mushrooms are shade-dried and vacuum sealed to retain peak alkaloid stability. Whether you are seeking sub-perceptual daily microdosing for cognitive enhancement and focus, or full therapeutic macrodosing, we offer precisely weighed products.`,
    geneticsAndTerpenes: {
      title: 'Alkaloid Profile & Microdosing Protocols',
      content: `Our mushrooms are tested for active psilocybin and psilocin concentrations. Microdose capsules contain exact 100mg to 250mg measurements blended with neuroprotective adaptogens like Lion's Mane, Reishi, and Niacin following the renowned Stamets Protocol.`,
      keyTerpenes: ['Psilocybin', 'Psilocin', 'Baeocystin', 'Erinacines (Lion’s Mane)'],
      potencyRange: '100mg Microdose to 3.5g Whole Fruit Bodies',
    },
    buyerGuide: {
      title: 'Microdosing vs Macrodosing Dosing Chart',
      paragraphs: [
        `Microdose (50mg - 250mg): Sub-perceptual benefits including elevated mood, heightened focus, and anxiety relief without visual hallucinations. Ideal for work and creative projects.`,
        `Museum Dose (0.5g - 1.5g): Mild euphoria, enhanced color perception, and social warmth. Macrodose (2.5g - 3.5g+): Deep introspective journey and visual immersion.`,
      ],
    },
    complianceAndQuality: 'Organic substrate cultivation, triple vacuum sealed in light-proof mylar packaging for maximum alkaloid longevity.',
    faqs: [
      {
        question: 'What is the Stamets Stack for microdosing?',
        answer: 'The Stamets Stack combines 100mg psilocybin with Lion’s Mane mushroom and Niacin (Vitamin B3) to stimulate neurogenesis, improve memory formation, and enhance brain plasticity.',
      },
      {
        question: 'How are magic mushrooms packaged for delivery?',
        answer: 'All mushroom products are double-sealed in opaque moisture-proof barrier bags inside discreet unbranded boxes with total privacy.',
      },
    ],
  },
};

export function getCategorySeoData(slug: string | null): CategorySeoGuide | null {
  if (!slug) return null;
  const normalized = slug.toLowerCase();
  if (categorySeoMap[normalized]) return categorySeoMap[normalized];
  if (normalized.includes('flower')) return categorySeoMap['flowers'];
  if (normalized.includes('concentrate') || normalized.includes('rosin')) return categorySeoMap['concentrates'];
  if (normalized.includes('edible') || normalized.includes('gumm')) return categorySeoMap['edibles'];
  if (normalized.includes('vape')) return categorySeoMap['disposable-vapes'];
  if (normalized.includes('shroom') || normalized.includes('mushroom')) return categorySeoMap['magic-mushroom'];
  return null;
}

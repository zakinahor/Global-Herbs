import { Product, WeightVariant } from '../types';

// Standard Flower Weight Variants (Strictly Grams: 3.5g, 7g, 14g, 28g, 112g, 224g, 448g)
export const FLOWER_WEIGHT_VARIANTS: WeightVariant[] = [
  {
    id: '3.5g',
    label: '3.5 Grams',
    shortLabel: '3.5g',
    weight: '3.5g',
    priceMultiplier: 1.0,
  },
  {
    id: '7g',
    label: '7 Grams',
    shortLabel: '7g',
    weight: '7g',
    priceMultiplier: 1.9,
    savings: '5% OFF',
  },
  {
    id: '14g',
    label: '14 Grams',
    shortLabel: '14g',
    weight: '14g',
    priceMultiplier: 3.6,
    savings: '10% OFF',
  },
  {
    id: '28g',
    label: '28 Grams',
    shortLabel: '28g',
    weight: '28g',
    priceMultiplier: 6.8,
    isPopular: true,
    savings: '15% OFF',
  },
  {
    id: '112g',
    label: '112 Grams',
    shortLabel: '112g',
    weight: '112g',
    priceMultiplier: 24.0,
    savings: '25% OFF',
  },
  {
    id: '224g',
    label: '224 Grams',
    shortLabel: '224g',
    weight: '224g',
    priceMultiplier: 44.0,
    savings: '35% OFF',
  },
  {
    id: '448g',
    label: '448 Grams',
    shortLabel: '448g',
    weight: '448g',
    priceMultiplier: 80.0,
    savings: '45% OFF',
  },
];

// Concentrates Weight Variants (Strictly Grams: 1g, 2g, 3.5g, 7g, 14g, 28g, 112g)
export const CONCENTRATE_WEIGHT_VARIANTS: WeightVariant[] = [
  {
    id: '1g',
    label: '1 Gram',
    shortLabel: '1g',
    weight: '1g',
    priceMultiplier: 1.0,
  },
  {
    id: '2g',
    label: '2 Grams',
    shortLabel: '2g',
    weight: '2g',
    priceMultiplier: 1.9,
    savings: '5% OFF',
  },
  {
    id: '3.5g',
    label: '3.5 Grams',
    shortLabel: '3.5g',
    weight: '3.5g',
    priceMultiplier: 3.2,
    savings: '10% OFF',
  },
  {
    id: '7g',
    label: '7 Grams',
    shortLabel: '7g',
    weight: '7g',
    priceMultiplier: 6.0,
    isPopular: true,
    savings: '15% OFF',
  },
  {
    id: '14g',
    label: '14 Grams',
    shortLabel: '14g',
    weight: '14g',
    priceMultiplier: 11.0,
    savings: '22% OFF',
  },
  {
    id: '28g',
    label: '28 Grams',
    shortLabel: '28g',
    weight: '28g',
    priceMultiplier: 20.0,
    savings: '30% OFF',
  },
  {
    id: '112g',
    label: '112 Grams',
    shortLabel: '112g',
    weight: '112g',
    priceMultiplier: 70.0,
    savings: '40% OFF',
  },
];

// Pre-Roll Weight / Pack Variants
export const PREROLL_VARIANTS: WeightVariant[] = [
  {
    id: '1-pack',
    label: '1 Single Pre-Roll (1g)',
    shortLabel: '1 Pre-Roll (1g)',
    weight: '1 Pre-Roll (1g)',
    priceMultiplier: 1.0,
  },
  {
    id: '3-pack',
    label: '3-Pack Pre-Rolls (3g)',
    shortLabel: '3-Pack (3g)',
    weight: '3-Pack (3g)',
    priceMultiplier: 2.8,
    savings: '7% OFF',
  },
  {
    id: '5-pack',
    label: '5-Pack Tin Pre-Rolls (5g)',
    shortLabel: '5-Pack (5g)',
    weight: '5-Pack (5g)',
    priceMultiplier: 4.5,
    isPopular: true,
    savings: '10% OFF',
  },
  {
    id: '10-pack',
    label: '10-Pack Box Pre-Rolls (10g)',
    shortLabel: '10-Pack (10g)',
    weight: '10-Pack (10g)',
    priceMultiplier: 8.5,
    savings: '15% OFF',
  },
  {
    id: '28-pack',
    label: '28-Pack Pre-Rolls (28g)',
    shortLabel: '28-Pack (28g)',
    weight: '28-Pack (28g)',
    priceMultiplier: 22.0,
    savings: '25% OFF',
  },
];

// Edibles Potency / Packaging Variants
export const EDIBLE_VARIANTS: WeightVariant[] = [
  {
    id: '100mg',
    label: '100mg Pack (10 Pieces x 10mg)',
    shortLabel: '100mg (10pk)',
    weight: '100mg',
    priceMultiplier: 1.0,
  },
  {
    id: '250mg',
    label: '250mg Pack (Extra Strength)',
    shortLabel: '250mg',
    weight: '250mg',
    priceMultiplier: 2.2,
    savings: '10% OFF',
  },
  {
    id: '500mg',
    label: '500mg Tin (High Potency)',
    shortLabel: '500mg',
    weight: '500mg',
    priceMultiplier: 3.8,
    isPopular: true,
    savings: '15% OFF',
  },
  {
    id: '1000mg',
    label: '1000mg Bag (Party Pack)',
    shortLabel: '1000mg',
    weight: '1000mg',
    priceMultiplier: 6.8,
    savings: '25% OFF',
  },
];

// Vapes / Carts / Disposable Variants
export const VAPE_VARIANTS: WeightVariant[] = [
  {
    id: '1.0g',
    label: '1.0g Cartridge / Disposable Pen',
    shortLabel: '1.0g (Standard)',
    weight: '1.0g',
    priceMultiplier: 1.0,
  },
  {
    id: '2.0g',
    label: '2.0g Dual Chamber / XL Disposable',
    shortLabel: '2.0g (XL)',
    weight: '2.0g',
    priceMultiplier: 1.75,
    isPopular: true,
    savings: '12% OFF',
  },
  {
    id: '3-pack',
    label: '3-Pack Bundle (3 x 1.0g)',
    shortLabel: '3-Pack (3.0g)',
    weight: '3-Pack',
    priceMultiplier: 2.6,
    savings: '15% OFF',
  },
  {
    id: '5-pack',
    label: '5-Pack Multi-Flavor Box (5 x 1.0g)',
    shortLabel: '5-Pack (5.0g)',
    weight: '5-Pack',
    priceMultiplier: 4.2,
    savings: '20% OFF',
  },
];

// CBD & Tinctures
export const CBD_VARIANTS: WeightVariant[] = [
  {
    id: '500mg',
    label: '500mg / 30ml Dropper Bottle',
    shortLabel: '500mg (30ml)',
    weight: '500mg',
    priceMultiplier: 1.0,
  },
  {
    id: '1000mg',
    label: '1000mg / 30ml Full Spectrum',
    shortLabel: '1000mg (30ml)',
    weight: '1000mg',
    priceMultiplier: 1.7,
    isPopular: true,
    savings: '15% OFF',
  },
  {
    id: '2500mg',
    label: '2500mg / 60ml High Potency',
    shortLabel: '2500mg (60ml)',
    weight: '2500mg',
    priceMultiplier: 3.5,
    savings: '20% OFF',
  },
  {
    id: '5000mg',
    label: '5000mg / 120ml Extra Strength Bulk',
    shortLabel: '5000mg (120ml)',
    weight: '5000mg',
    priceMultiplier: 6.2,
    savings: '30% OFF',
  },
];

// Pharmaceuticals & Tablets
export const PHARMA_VARIANTS: WeightVariant[] = [
  {
    id: '30-pills',
    label: '30 Pills Bottle',
    shortLabel: '30 Pills',
    weight: '30 Pills',
    priceMultiplier: 1.0,
  },
  {
    id: '60-pills',
    label: '60 Pills Bottle',
    shortLabel: '60 Pills',
    weight: '60 Pills',
    priceMultiplier: 1.8,
    savings: '10% OFF',
  },
  {
    id: '100-pills',
    label: '100 Pills Sealed Bottle',
    shortLabel: '100 Pills',
    weight: '100 Pills',
    priceMultiplier: 2.8,
    isPopular: true,
    savings: '15% OFF',
  },
  {
    id: '500-pills',
    label: '500 Pills Bulk Pack',
    shortLabel: '500 Pills',
    weight: '500 Pills',
    priceMultiplier: 12.0,
    savings: '25% OFF',
  },
];

// Accessories & Merch
export const ACCESSORY_VARIANTS: WeightVariant[] = [
  {
    id: '1-unit',
    label: '1 Single Unit',
    shortLabel: '1 Unit',
    weight: '1 Unit',
    priceMultiplier: 1.0,
  },
  {
    id: '3-pack',
    label: '3-Pack Bundle',
    shortLabel: '3-Pack',
    weight: '3-Pack',
    priceMultiplier: 2.7,
    savings: '10% OFF',
  },
  {
    id: '5-pack',
    label: '5-Pack Box Set',
    shortLabel: '5-Pack',
    weight: '5-Pack',
    priceMultiplier: 4.2,
    savings: '16% OFF',
  },
];

/**
 * Returns the relevant weight/size variants for any product based on its category and traits.
 */
export function getProductWeightVariants(product: Product): WeightVariant[] {
  if (product.weightVariants && product.weightVariants.length > 0) {
    return product.weightVariants;
  }

  const categorySlug = (product.categorySlug || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  const name = (product.name || '').toLowerCase();

  // 1. Flowers / Bud / Wholesale Flower / THCA Flower
  if (
    categorySlug.includes('flower') ||
    category.includes('flower') ||
    category.includes('indica') ||
    category.includes('sativa') ||
    category.includes('hybrid') ||
    name.includes('flower') ||
    name.includes('bud')
  ) {
    return FLOWER_WEIGHT_VARIANTS;
  }

  // 2. Concentrates / Wax / Shatter / Rosin / Resin / Diamonds / Hash
  if (
    categorySlug.includes('concentrate') ||
    category.includes('concentrate') ||
    category.includes('shatter') ||
    category.includes('rosin') ||
    category.includes('resin') ||
    category.includes('budder') ||
    category.includes('diamonds') ||
    category.includes('hash') ||
    name.includes('rosin') ||
    name.includes('resin') ||
    name.includes('shatter') ||
    name.includes('diamonds') ||
    name.includes('hash') ||
    name.includes('wax')
  ) {
    return CONCENTRATE_WEIGHT_VARIANTS;
  }

  // 3. Pre-Rolls / Joints / Blunts
  if (
    categorySlug.includes('preroll') ||
    categorySlug.includes('pre-roll') ||
    category.includes('preroll') ||
    category.includes('pre-roll') ||
    name.includes('pre-roll') ||
    name.includes('preroll') ||
    name.includes('joint') ||
    name.includes('blunt')
  ) {
    return PREROLL_VARIANTS;
  }

  // 4. Edibles / Gummies / Chocolates
  if (
    categorySlug.includes('edible') ||
    category.includes('edible') ||
    category.includes('gumm') ||
    category.includes('chocolate') ||
    name.includes('gummy') ||
    name.includes('gummies') ||
    name.includes('edible') ||
    name.includes('chocolate')
  ) {
    return EDIBLE_VARIANTS;
  }

  // 5. Vapes / Cartridges / Disposables
  if (
    categorySlug.includes('vape') ||
    category.includes('vape') ||
    category.includes('cart') ||
    name.includes('vape') ||
    name.includes('cart') ||
    name.includes('disposable') ||
    name.includes('pod')
  ) {
    return VAPE_VARIANTS;
  }

  // 6. CBD & Tinctures
  if (
    categorySlug.includes('cbd') ||
    category.includes('cbd') ||
    category.includes('tincture') ||
    category.includes('oil') ||
    name.includes('cbd') ||
    name.includes('tincture') ||
    name.includes('drops')
  ) {
    return CBD_VARIANTS;
  }

  // 7. Pharmaceuticals & Pills
  if (
    categorySlug.includes('pharmaceutical') ||
    category.includes('pharmaceutical') ||
    category.includes('benzo') ||
    category.includes('painkiller') ||
    name.includes('tablet') ||
    name.includes('pill') ||
    name.includes('capsule')
  ) {
    return PHARMA_VARIANTS;
  }

  // 8. Default / Accessories
  return ACCESSORY_VARIANTS;
}

/**
 * Calculates price for a selected variant based on base price
 */
export function calculateVariantPrice(basePrice: number, variant: WeightVariant): number {
  return Math.max(1, Math.round(basePrice * variant.priceMultiplier));
}

/**
 * Finds a matching variant from string (e.g. "3.5g", "28g (1 oz)", "112g (1/4 lb)")
 */
export function findVariantByLabel(variants: WeightVariant[], labelOrWeight?: string): WeightVariant {
  if (!labelOrWeight) return variants[0];
  const clean = labelOrWeight.toLowerCase().trim();

  const exactMatch = variants.find(
    (v) =>
      v.id.toLowerCase() === clean ||
      v.weight.toLowerCase() === clean ||
      v.label.toLowerCase() === clean ||
      v.shortLabel.toLowerCase() === clean
  );
  if (exactMatch) return exactMatch;

  const partialMatch = variants.find(
    (v) =>
      clean.includes(v.id.toLowerCase()) ||
      clean.includes(v.weight.toLowerCase()) ||
      v.label.toLowerCase().includes(clean)
  );
  if (partialMatch) return partialMatch;

  return variants[0];
}

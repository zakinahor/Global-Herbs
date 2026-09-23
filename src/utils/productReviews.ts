import { Product } from '../types';

export interface ProductReview {
  id: string;
  author: string;
  location?: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verified: boolean;
  helpfulCount: number;
}

// First name + last initial pool
const REVIEWER_PROFILES = [
  { name: 'David K.', location: 'Denver, CO' },
  { name: 'Sarah M.', location: 'Portland, OR' },
  { name: 'Marcus J.', location: 'Austin, TX' },
  { name: 'Elena R.', location: 'Chicago, IL' },
  { name: 'Tyler B.', location: 'Seattle, WA' },
  { name: 'Chloe N.', location: 'Miami, FL' },
  { name: 'Brandon H.', location: 'Phoenix, AZ' },
  { name: 'Jessica L.', location: 'San Diego, CA' },
  { name: 'Michael P.', location: 'Boston, MA' },
  { name: 'Rachel T.', location: 'Atlanta, GA' },
  { name: 'Derek W.', location: 'Las Vegas, NV' },
  { name: 'Samantha C.', location: 'Minneapolis, MN' },
  { name: 'Jordan S.', location: 'Nashville, TN' },
  { name: 'Amanda F.', location: 'Philadelphia, PA' },
  { name: 'Nathan G.', location: 'Columbus, OH' },
  { name: 'Kevin V.', location: 'Detroit, MI' },
  { name: 'Stephanie O.', location: 'Charlotte, NC' },
  { name: 'Alex M.', location: 'Salt Lake City, UT' },
  { name: 'Hannah D.', location: 'Kansas City, MO' },
  { name: 'Jason B.', location: 'Tampa, FL' },
];

const RELATIVE_DATES = [
  '3 days ago',
  '5 days ago',
  '1 week ago',
  '10 days ago',
  '2 weeks ago',
  '3 weeks ago',
  '1 month ago',
  '5 weeks ago',
  '2 months ago',
  '3 months ago',
];

/**
 * Deterministic pseudo-random number generator seeded by product ID and offset
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Generates 3 to 5 realistic, distinct, product-tailored reviews for any given product
 */
export function generateProductReviews(product: Product): ProductReview[] {
  const pId = Number(product.id) || 1;
  const cat = (product.category || '').toLowerCase();
  const catSlug = (product.categorySlug || '').toLowerCase();
  const pName = product.name;
  const strain = product.strainType || 'balanced';

  const reviewsCount = 3 + Math.floor(seededRandom(pId * 17) * 3); // 3 to 5 reviews
  const generated: ProductReview[] = [];

  for (let i = 0; i < reviewsCount; i++) {
    const seed = pId * 100 + i * 31 + 7;
    const profileIndex = (pId * 3 + i * 7) % REVIEWER_PROFILES.length;
    const dateIndex = (pId * 2 + i * 3) % RELATIVE_DATES.length;
    const reviewer = REVIEWER_PROFILES[profileIndex];
    const dateStr = RELATIVE_DATES[dateIndex];
    
    // Rating: Mostly 5 stars, occasional 4 stars
    const isFiveStar = seededRandom(seed + 1) > 0.18;
    const rating = isFiveStar ? 5 : 4;
    const helpful = 3 + Math.floor(seededRandom(seed + 2) * 22);

    let title = '';
    let comment = '';

    // Category-specific bespoke review generator
    if (catSlug.includes('flower') || cat.includes('flower') || cat.includes('indica') || cat.includes('sativa') || cat.includes('hybrid')) {
      const flowerTitles = [
        `Incredible cure and aroma on this ${pName}`,
        `Top-shelf quality from Global Herbs`,
        `Fresh, frosty trichomes and smooth smoke`,
        `Exceeded all my expectations`,
        `Potent therapeutic relief and clean burn`,
      ];
      const flowerComments = [
        `The cure on this ${pName} is immaculate. Opened the seal and the whole room filled with fresh pungent terps. Beautiful dense nugs covered in trichomes. Burns to clean white ash. Global Herbs always delivers top-tier quality!`,
        `Ordered the 28g variant and it arrived in flawless double-sealed vacuum packaging. Extremely smooth on the throat with deep, long-lasting effects. Global Herbs has earned my lifetime loyalty.`,
        `Potency is right on the money. Perfect for evening relaxation and chronic tension relief. The stealth shipping was super fast and completely odorless. Highly recommend Global Herbs Dispensary!`,
        `You can tell Global Herbs takes pride in proper curing and handling. No harshness whatsoever, pure flavor from the first pull to the last. Will definitely be ordering more.`,
        `Top notch genetics and exceptional moisture level. Not dry or brittle at all. 10/10 experience with Global Herbs as usual!`,
      ];
      title = flowerTitles[(pId + i) % flowerTitles.length];
      comment = flowerComments[(pId * 2 + i) % flowerComments.length];
    } else if (catSlug.includes('concentrate') || cat.includes('concentrate') || cat.includes('wax') || cat.includes('shatter') || cat.includes('rosin') || cat.includes('resin') || cat.includes('diamonds')) {
      const concTitles = [
        `Unmatched purity and terpene profile`,
        `Clean melt with zero residue`,
        `Potent, flavorful, and pristine consistency`,
        `Best concentrate order I've placed online`,
        `Exceptional clarity and heavy punch`,
      ];
      const concComments = [
        `Melts completely clean in the banger at low temp. The flavor profile on this ${pName} is rich and authentic. Global Herbs never cuts corners on quality extraction.`,
        `Purity is undeniable. Heavy onset and great relief within minutes. Packaging kept it cool and perfectly preserved in transit. Thanks Global Herbs!`,
        `Incredible consistency and nose. A tiny dab goes a very long way. Definitely pharmacy-grade purity from Global Herbs Dispensary.`,
        `Super smooth vapor with rich, full-spectrum terpenes. Fast, discreet delivery straight to my mailbox. Global Herbs is the gold standard!`,
        `Clean color, perfect texture, and hits like a freight train. Five stars all day for Global Herbs.`,
      ];
      title = concTitles[(pId + i) % concTitles.length];
      comment = concComments[(pId * 2 + i) % concComments.length];
    } else if (catSlug.includes('preroll') || cat.includes('pre-roll') || cat.includes('preroll')) {
      const rollTitles = [
        `Even burn and premium flower inside`,
        `No shake or trim — pure whole bud`,
        `Super convenient and packed with punch`,
        `Burned slowly with a prominent oil ring`,
        `Perfect on-the-go smoke from Global Herbs`,
      ];
      const rollComments = [
        `So many dispensaries put leftover shake in pre-rolls, but Global Herbs actually uses whole frosty bud. Burns perfectly even without canoeing.`,
        `Ordered the multi-pack of ${pName}. Every single one was packed firmly, fresh, and potent. Global Herbs packaging keeps them completely intact and fresh.`,
        `Super convenient for outdoor trips. Very smooth smoke, potent effects, and zero harsh cough. Global Herbs continues to impress.`,
        `Nice slow burn and heavy resin ring right away. Clean white ash all the way down. Global Herbs has the best rolled options hands down.`,
      ];
      title = rollTitles[(pId + i) % rollTitles.length];
      comment = rollComments[(pId * 2 + i) % rollComments.length];
    } else if (catSlug.includes('vape') || cat.includes('vape') || cat.includes('cart') || cat.includes('disposable')) {
      const vapeTitles = [
        `Smooth airflow, pure oil, zero clogging`,
        `Pure flavor with no artificial additives`,
        `Discreet, reliable, and very potent`,
        `Hardware holds up all the way to the last drop`,
        `Cleanest vape experience on the market`,
      ];
      const vapeComments = [
        `Hardware on this ${pName} is top of the line. Zero clogging even in cooler temperatures, and the oil clarity is pristine. Global Herbs nailed this one.`,
        `Tastes like genuine plant terpenes rather than artificial flavoring. Potency hits instantly and discreetly. Global Herbs stealth shipping was on point.`,
        `Great vapor production with great battery life. Smooth on the lungs with a clean, uplifting high. Global Herbs is my trusted shop.`,
        `Long lasting and consistent performance throughout. Very satisfied with the customer service and product standards at Global Herbs.`,
      ];
      title = vapeTitles[(pId + i) % vapeTitles.length];
      comment = vapeComments[(pId * 2 + i) % vapeComments.length];
    } else if (catSlug.includes('edible') || cat.includes('edible') || cat.includes('gumm') || cat.includes('chocolate')) {
      const edibleTitles = [
        `Accurate dosing and delicious taste`,
        `Smooth gradual onset with lasting body relaxation`,
        `No bitter aftertaste, pure culinary perfection`,
        `Great for sleep and chronic discomfort`,
        `Consistently reliable potency from Global Herbs`,
      ];
      const edibleComments = [
        `Dosing is spot on! Took one serving of ${pName} and within 45 minutes I felt deep physical relaxation. No weird bitter taste at all. Global Herbs delivers quality every time.`,
        `Best sleep I've had in months. Smooth onset without any morning grogginess. Global Herbs vacuum sealing kept them completely fresh and intact.`,
        `Delicious natural flavor and super consistent potency piece by piece. Global Herbs Dispensary is now my sole source for wellness edibles.`,
        `Very clean effects that lasted several hours. Exactly as described in the lab test specs. Great job Global Herbs!`,
      ];
      title = edibleTitles[(pId + i) % edibleTitles.length];
      comment = edibleComments[(pId * 2 + i) % edibleComments.length];
    } else if (catSlug.includes('cbd') || cat.includes('tincture') || cat.includes('oil')) {
      const cbdTitles = [
        `Tremendous relief for joint aches and anxiety`,
        `Clean dropper, fast sublingual absorption`,
        `Calming clarity without any brain fog`,
        `Highest quality botanical oil I've used`,
      ];
      const cbdComments = [
        `This ${pName} has been a gamechanger for my daily routine. Calms tension within 20 minutes with zero fogginess. Global Herbs always maintains verified lab purity.`,
        `Third-party lab COA checked out 100%. Very clean natural aroma, easy to measure dosing, and gentle on the stomach. Thank you Global Herbs!`,
        `Consistent relief for daily stress and post-workout recovery. Shipped quickly and arrived safely. Global Herbs is top tier.`,
      ];
      title = cbdTitles[(pId + i) % cbdTitles.length];
      comment = cbdComments[(pId * 2 + i) % cbdComments.length];
    } else {
      const genTitles = [
        `High quality build and fast shipping`,
        `Authentic, durable, and works as expected`,
        `Great addition to my collection from Global Herbs`,
        `Solid craftsmanship and reliable performance`,
      ];
      const genComments = [
        `Very sturdy and works seamlessly. Global Herbs packaged it with thick protective wrap so it arrived in perfect mint condition.`,
        `Solid build quality and great attention to detail. Global Herbs continues to provide top notch service and genuine products.`,
        `Fast discreet delivery and helpful support. 100% satisfied with my order from Global Herbs.`,
      ];
      title = genTitles[(pId + i) % genTitles.length];
      comment = genComments[(pId * 2 + i) % genComments.length];
    }

    generated.push({
      id: `rev-${pId}-${i + 1}`,
      author: reviewer.name,
      location: reviewer.location,
      rating,
      date: dateStr,
      title,
      comment,
      verified: true,
      helpfulCount: helpful,
    });
  }

  return generated;
}

/**
 * Loads stored local reviews for a product or initializes them
 */
export function getProductReviews(product: Product): ProductReview[] {
  const storageKey = `gh_reviews_product_${product.id}`;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // fallback
  }

  const initial = generateProductReviews(product);
  try {
    localStorage.setItem(storageKey, JSON.stringify(initial));
  } catch (e) {
    // fallback
  }
  return initial;
}

/**
 * Saves a new review for a product into local storage
 */
export function saveProductReview(productId: number | string, newReview: ProductReview): ProductReview[] {
  const storageKey = `gh_reviews_product_${productId}`;
  let current: ProductReview[] = [];
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      current = JSON.parse(saved);
    }
  } catch (e) {
    current = [];
  }

  const updated = [newReview, ...current];
  try {
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (e) {
    // localStorage full or unavailable
  }
  return updated;
}

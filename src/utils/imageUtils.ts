import React from 'react';

export const DEFAULT_FALLBACK_IMAGE = '/images/indoor_flower_buds.jpg';

// Pools of high-resolution, instant-loading assets and CDN images categorized for dispensary items
const FLOWER_IMAGES = [
  'https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1536846862558-b80d25f0dbae?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=800',
  '/images/indoor_flower_buds.jpg',
];

const PREROLL_IMAGES = [
  'https://images.unsplash.com/photo-1556928045-16f7f50be0f3?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1528821128474-27f963b062bf?auto=format&fit=crop&q=80&w=800',
];

const VAPE_IMAGES = [
  '/images/vape_cartridge.jpg',
  'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&q=80&w=800',
];

const EDIBLE_GUMMY_IMAGES = [
  'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1575224300306-1b8da36134ec?auto=format&fit=crop&q=80&w=800',
];

const EDIBLE_CHOCOLATE_IMAGES = [
  'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=800',
];

const CONCENTRATE_IMAGES = [
  'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=800',
];

const TINCTURE_IMAGES = [
  'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=800',
];

const TABLET_IMAGES = [
  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=800',
];

const MUSHROOM_IMAGES = [
  'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
];

function selectFromPool(pool: string[], nameSeed?: string): string {
  if (!nameSeed) return pool[0];
  let hash = 0;
  for (let i = 0; i < nameSeed.length; i++) {
    hash = (hash << 5) - hash + nameSeed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
}

export function getCategoryFallbackImage(category?: string, productName?: string): string {
  const text = `${category || ''} ${productName || ''}`.toLowerCase();

  // Specific Accessories
  if (text.includes('rolling machine') || text.includes('roller') || text.includes('machine')) {
    return '/images/rolling_machine.jpg';
  }
  if (text.includes('grinder')) {
    return '/images/herb_grinder.jpg';
  }
  if (text.includes('rolling tray') || text.includes('tray')) {
    return '/images/rolling_tray.jpg';
  }
  if (text.includes('paper') || text.includes('juicy jay') || text.includes('raw')) {
    return 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=800';
  }
  if (text.includes('cigar') || text.includes('backwoods') || text.includes('blunt wrap') || text.includes('wrap')) {
    return 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&q=80&w=800';
  }

  // Edibles
  if (text.includes('chocolate') || text.includes('brownie') || text.includes('fudge') || text.includes('bar')) {
    return selectFromPool(EDIBLE_CHOCOLATE_IMAGES, productName);
  }
  if (text.includes('edible') || text.includes('gumm') || text.includes('candy') || text.includes('chew') || text.includes('gummies')) {
    return selectFromPool(EDIBLE_GUMMY_IMAGES, productName);
  }

  // Pre-rolls
  if (text.includes('preroll') || text.includes('pre-roll') || text.includes('joint') || text.includes('blunt') || text.includes('curejoint')) {
    return selectFromPool(PREROLL_IMAGES, productName);
  }

  // Vapes
  if (text.includes('vape') || text.includes('cartridge') || text.includes('pen') || text.includes('pod') || text.includes('disposable') || text.includes('stiiizy') || text.includes('distillate')) {
    return selectFromPool(VAPE_IMAGES, productName);
  }

  // Concentrates & Extracts
  if (text.includes('concentrate') || text.includes('rosin') || text.includes('hash') || text.includes('shatter') || text.includes('badder') || text.includes('wax') || text.includes('dab') || text.includes('budder') || text.includes('resin')) {
    return selectFromPool(CONCENTRATE_IMAGES, productName);
  }

  // Tinctures & Drops
  if (text.includes('tincture') || text.includes('oil') || text.includes('drop') || text.includes('pet relief')) {
    return selectFromPool(TINCTURE_IMAGES, productName);
  }

  // Pharmaceuticals & Tablets
  if (text.includes('tablet') || text.includes('pill') || text.includes('xanax') || text.includes('klonopin') || text.includes('alko') || text.includes('farmapram') || text.includes('benzodiazepine') || text.includes('pharmaceutical')) {
    return selectFromPool(TABLET_IMAGES, productName);
  }

  // Psychedelics & Shrooms
  if (text.includes('shroom') || text.includes('mushroom') || text.includes('psilocybin') || text.includes('dmt') || text.includes('lsd') || text.includes('psychedelic')) {
    return selectFromPool(MUSHROOM_IMAGES, productName);
  }

  // CBD
  if (text.includes('cbd') || text.includes('hemp')) {
    return selectFromPool(TINCTURE_IMAGES, productName);
  }

  return selectFromPool(FLOWER_IMAGES, productName);
}

export function getValidProductImage(rawImage?: string, category?: string, productName?: string): string {
  if (!rawImage || typeof rawImage !== 'string' || rawImage.trim() === '') {
    return getCategoryFallbackImage(category, productName);
  }
  
  const lowerUrl = rawImage.toLowerCase();
  // Filter out explicit placeholder or default avatar filenames, but keep authentic host URLs
  if (
    (lowerUrl.includes('placeholder') || lowerUrl.includes('default.png') || lowerUrl.includes('generic_single')) &&
    !lowerUrl.includes('weedmaps.com') && !lowerUrl.includes('amishgrown.com') && !lowerUrl.includes('globalmarijuanadispensary.com')
  ) {
    return getCategoryFallbackImage(category, productName);
  }

  return rawImage;
}

export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  category?: string,
  productName?: string
) {
  const imgElement = event.currentTarget;
  const fallback = getCategoryFallbackImage(category, productName);
  // Prevent infinite loop if the fallback fails
  if (imgElement.src !== fallback) {
    imgElement.src = fallback;
  } else if (imgElement.src !== DEFAULT_FALLBACK_IMAGE) {
    imgElement.src = DEFAULT_FALLBACK_IMAGE;
  }
}


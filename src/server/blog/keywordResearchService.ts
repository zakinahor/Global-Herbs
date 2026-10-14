import { GoogleGenAI } from '@google/genai';
import { KeywordIdea, KeywordCluster } from '../../types/blog';
import { blogStorage } from './blogStorage';
import { products, categories } from '../../data/products';

// Comprehensive dispensary search clusters and long-tail topics
const SEED_CLUSTERS: {
  name: string;
  description: string;
  primaryCategorySlug: string;
  seedKeywords: Omit<KeywordIdea, 'id' | 'isCovered' | 'existingArticleSlug' | 'cannibalizationWarning'>[];
}[] = [
  {
    name: 'THCa Science, Decarboxylation & Legality',
    description: 'High-intent search queries exploring 2018 Farm Bill compliance, heating/decarboxylation, and state delivery.',
    primaryCategorySlug: 'flowers',
    seedKeywords: [
      {
        keyword: 'what is thca vs delta 9 thc',
        cluster: 'THCa Science, Decarboxylation & Legality',
        searchIntent: 'Informational',
        difficultyTier: 'Medium (Targeted)',
        relativeVolume: 'High',
        businessValue: 'High',
        relevantProducts: ['THCa Diamonds & Sauce', 'Top-Shelf THCa Indoor Flower'],
        targetCategorySlug: 'flowers',
        suggestedH1: 'What is THCa vs Delta-9 THC? Pharmacological Potency & Legal Guide',
      },
      {
        keyword: 'does thca show up on drug tests',
        cluster: 'THCa Science, Decarboxylation & Legality',
        searchIntent: 'Informational',
        difficultyTier: 'Medium (Targeted)',
        relativeVolume: 'High',
        businessValue: 'Medium',
        relevantProducts: ['Full Spectrum CBD Tincture', 'Broad Spectrum Zero-THC Oil'],
        targetCategorySlug: 'cbd',
        suggestedH1: 'Does THCa Show Up on a Drug Screen? Metabolism, Half-Life & Detection Windows',
      },
      {
        keyword: 'can you travel with thca flower across state lines',
        cluster: 'THCa Science, Decarboxylation & Legality',
        searchIntent: 'Commercial',
        difficultyTier: 'Low (Long-Tail)',
        relativeVolume: 'Medium',
        businessValue: 'High',
        relevantProducts: ['Premium Indoor THCa Exotic Flower'],
        targetCategorySlug: 'flowers',
        suggestedH1: 'Traveling with THCa Flower in 2026: TSA Regulations & State Border Guidelines',
      },
      {
        keyword: 'how to decarboxylate thca flower at home oven temp',
        cluster: 'THCa Science, Decarboxylation & Legality',
        searchIntent: 'Informational',
        difficultyTier: 'Low (Long-Tail)',
        relativeVolume: 'Medium',
        businessValue: 'High',
        relevantProducts: ['Craft Hemp Flower', 'Rolling Accessories'],
        targetCategorySlug: 'accessories',
        suggestedH1: 'How to Decarboxylate THCa Flower: Exact Oven Temperatures & Timing Guide',
      },
    ],
  },
  {
    name: 'Solventless Live Hash Rosin & Concentrates',
    description: 'Connoisseur extraction queries focusing on ice water washing, mechanical pressing, and terpene preservation.',
    primaryCategorySlug: 'concentrates',
    seedKeywords: [
      {
        keyword: 'guide to solventless live hash rosin',
        cluster: 'Solventless Live Hash Rosin & Concentrates',
        searchIntent: 'Informational',
        difficultyTier: 'Medium (Targeted)',
        relativeVolume: 'High',
        businessValue: 'High',
        relevantProducts: ['Tier 1 90u Live Hash Rosin', 'Cold Cure Rosin Badder'],
        targetCategorySlug: 'concentrates',
        suggestedH1: 'The Connoisseur’s Guide to Solventless Live Hash Rosin: 90u Ice Water Extraction',
      },
      {
        keyword: 'best temperature to dab live rosin without burning terpenes',
        cluster: 'Solventless Live Hash Rosin & Concentrates',
        searchIntent: 'Commercial',
        difficultyTier: 'Low (Long-Tail)',
        relativeVolume: 'Medium',
        businessValue: 'High',
        relevantProducts: ['Solventless Rosin Badder', 'Electronic Quartz Nail Accessories'],
        targetCategorySlug: 'concentrates',
        suggestedH1: 'Low-Temp Rosin Dabbing: Optimal Temperatures for Monoterpene Flavor & Smooth Vapor',
      },
      {
        keyword: 'cold cure vs fresh press rosin difference',
        cluster: 'Solventless Live Hash Rosin & Concentrates',
        searchIntent: 'Informational',
        difficultyTier: 'Low (Long-Tail)',
        relativeVolume: 'Medium',
        businessValue: 'High',
        relevantProducts: ['Cold Cured Live Rosin', 'Fresh Press Rosin Sap'],
        targetCategorySlug: 'concentrates',
        suggestedH1: 'Cold Cure vs. Fresh Press Rosin: Texture, Terpene Separation & Shelf Life',
      },
      {
        keyword: 'how to store live rosin jars in fridge',
        cluster: 'Solventless Live Hash Rosin & Concentrates',
        searchIntent: 'Informational',
        difficultyTier: 'Low (Long-Tail)',
        relativeVolume: 'Medium',
        businessValue: 'Medium',
        relevantProducts: ['Mylar Vacuum Jars', 'Glass Concentrate Containers'],
        targetCategorySlug: 'accessories',
        suggestedH1: 'How to Store Live Hash Rosin: Avoiding Terpene Evaporation & Condensation',
      },
    ],
  },
  {
    name: 'CBD Dosing, Bioavailability & Restful Sleep',
    description: 'Customer-driven wellness questions on tincture titration, sleep cycles, and sublingual absorption.',
    primaryCategorySlug: 'cbd',
    seedKeywords: [
      {
        keyword: 'how to dose cbd drops for sleep',
        cluster: 'CBD Dosing, Bioavailability & Restful Sleep',
        searchIntent: 'Commercial',
        difficultyTier: 'Medium (Targeted)',
        relativeVolume: 'High',
        businessValue: 'High',
        relevantProducts: ['Full Spectrum CBN + CBD Night Tincture', 'Deep Rest Sleep Drops'],
        targetCategorySlug: 'cbd',
        suggestedH1: 'How to Dose CBD Drops & Tinctures for Optimal Sleep: Milligram Titration Guide',
      },
      {
        keyword: 'cbn vs cbd for insomnia and sleep stages',
        cluster: 'CBD Dosing, Bioavailability & Restful Sleep',
        searchIntent: 'Informational',
        difficultyTier: 'Low (Long-Tail)',
        relativeVolume: 'Medium',
        businessValue: 'High',
        relevantProducts: ['CBN Nighttime Sleep Elixir', 'Full Spectrum Organic Tincture'],
        targetCategorySlug: 'cbd',
        suggestedH1: 'CBN vs. CBD for Sleep: Synergistic Cannabinoid Ratios for Restorative Rest',
      },
      {
        keyword: 'sublingual cbd absorption time under tongue',
        cluster: 'CBD Dosing, Bioavailability & Restful Sleep',
        searchIntent: 'Informational',
        difficultyTier: 'Low (Long-Tail)',
        relativeVolume: 'Medium',
        businessValue: 'Medium',
        relevantProducts: ['Sublingual Organic Hemp Dropper'],
        targetCategorySlug: 'cbd',
        suggestedH1: 'Sublingual CBD Bioavailability: Why Holding Drops Under the Tongue Matters',
      },
    ],
  },
  {
    name: 'Safe Online Dispensary Purchasing & Lab COAs',
    description: 'Consumer safety queries evaluating third-party lab testing, discreet shipping, and reputable hemp purchasing.',
    primaryCategorySlug: 'edibles',
    seedKeywords: [
      {
        keyword: 'how to buy hemp products online safely',
        cluster: 'Safe Online Dispensary Purchasing & Lab COAs',
        searchIntent: 'Commercial',
        difficultyTier: 'Medium (Targeted)',
        relativeVolume: 'High',
        businessValue: 'High',
        relevantProducts: ['Lab-Tested Artisan Gummies', 'Verified Organic Hemp Flower'],
        targetCategorySlug: 'edibles',
        suggestedH1: 'How to Buy Hemp & Herbal Products Online Safely: Lab COAs & Discreet Shipping Guide',
      },
      {
        keyword: 'how to read certificate of analysis cannabis coa',
        cluster: 'Safe Online Dispensary Purchasing & Lab COAs',
        searchIntent: 'Informational',
        difficultyTier: 'Low (Long-Tail)',
        relativeVolume: 'High',
        businessValue: 'High',
        relevantProducts: ['Third-Party Tested Artisan Concentrates', 'Full Spectrum Oils'],
        targetCategorySlug: 'cbd',
        suggestedH1: 'How to Read a Cannabis Certificate of Analysis (COA): Heavy Metals, Potency & Pesticides',
      },
      {
        keyword: 'how strong are thc edibles dosing guide',
        cluster: 'Safe Online Dispensary Purchasing & Lab COAs',
        searchIntent: 'Informational',
        difficultyTier: 'High (Head Term)',
        relativeVolume: 'High',
        businessValue: 'High',
        relevantProducts: ['Craft Live Resin Gummies', '10mg Microdose Edibles'],
        targetCategorySlug: 'edibles',
        suggestedH1: 'How Strong Are THC Edibles? Pharmacological Dosing & Onset Timeline Guide',
      },
    ],
  },
  {
    name: 'Terpenes, Minor Cannabinoids & Entourage Effect',
    description: 'Aroma-driven botanical science queries about specific terpene boiling points and pharmacological synergies.',
    primaryCategorySlug: 'concentrates',
    seedKeywords: [
      {
        keyword: 'terpenes guide myrcene limonene caryophyllene flavor effects',
        cluster: 'Terpenes, Minor Cannabinoids & Entourage Effect',
        searchIntent: 'Informational',
        difficultyTier: 'Medium (Targeted)',
        relativeVolume: 'High',
        businessValue: 'High',
        relevantProducts: ['Live Terpene Cartridges', 'Solventless Rosin Badder'],
        targetCategorySlug: 'concentrates',
        suggestedH1: 'The Essential Terpenes Guide: Myrcene, Limonene & Caryophyllene Flavor Profiles',
      },
      {
        keyword: 'caryophyllene terpene benefits cb2 receptor binding',
        cluster: 'Terpenes, Minor Cannabinoids & Entourage Effect',
        searchIntent: 'Informational',
        difficultyTier: 'Low (Long-Tail)',
        relativeVolume: 'Medium',
        businessValue: 'High',
        relevantProducts: ['Spicy Terpene Rich Rosin', 'Full Spectrum Herbal Drops'],
        targetCategorySlug: 'cbd',
        suggestedH1: 'Beta-Caryophyllene: The Dietary Cannabinoid That Directly Binds CB2 Receptors',
      },
      {
        keyword: 'linalool terpene calming aroma boiling point',
        cluster: 'Terpenes, Minor Cannabinoids & Entourage Effect',
        searchIntent: 'Informational',
        difficultyTier: 'Low (Long-Tail)',
        relativeVolume: 'Medium',
        businessValue: 'Medium',
        relevantProducts: ['Aromatic Craft Lavender & Hemp Infusion'],
        targetCategorySlug: 'cbd',
        suggestedH1: 'Linalool in Cannabis: Floral Lavender Aromas, Synergies & Ideal Vapor Temperatures',
      },
    ],
  },
];

/**
 * Normalizes keyword text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Checks for keyword cannibalization against existing published & scheduled articles
 */
function detectCannibalization(keyword: string): {
  isCovered: boolean;
  existingArticleSlug?: string;
  cannibalizationWarning?: string;
} {
  const normKw = normalizeText(keyword);
  const allArticles = blogStorage.getAllArticles();

  for (const art of allArticles) {
    const artTitleNorm = normalizeText(art.title);
    const artSlugNorm = normalizeText(art.slug.replace(/-/g, ' '));
    const artKeywords = (art.targetKeywords || []).map(normalizeText);

    // Exact or direct keyword match
    if (artKeywords.includes(normKw) || artKeywords.some((k) => k.includes(normKw) || normKw.includes(k))) {
      return {
        isCovered: true,
        existingArticleSlug: art.slug,
        cannibalizationWarning: `Targeted by existing ${art.status} article: "${art.title}" (/blog/${art.slug})`,
      };
    }

    // Heavy overlap in title words
    const kwWords = normKw.split(/\s+/).filter((w) => w.length > 3);
    const matchedWords = kwWords.filter((w) => artTitleNorm.includes(w) || artSlugNorm.includes(w));
    if (kwWords.length >= 3 && matchedWords.length / kwWords.length >= 0.75) {
      return {
        isCovered: true,
        existingArticleSlug: art.slug,
        cannibalizationWarning: `High topical overlap with "${art.title}". Consider updating that article or targeting a distinct long-tail angle.`,
      };
    }
  }

  return { isCovered: false };
}

export class KeywordResearchService {
  /**
   * Retrieves organized keyword clusters with cannibalization status
   */
  public getKeywordClusters(): KeywordCluster[] {
    return SEED_CLUSTERS.map((cluster) => {
      const keywords: KeywordIdea[] = cluster.seedKeywords.map((seed, idx) => {
        const cannibalization = detectCannibalization(seed.keyword);
        return {
          ...seed,
          id: `kw-${normalizeText(seed.keyword).replace(/\s+/g, '-')}`,
          isCovered: cannibalization.isCovered,
          existingArticleSlug: cannibalization.existingArticleSlug,
          cannibalizationWarning: cannibalization.cannibalizationWarning,
        };
      });

      return {
        name: cluster.name,
        description: cluster.description,
        primaryCategorySlug: cluster.primaryCategorySlug,
        keywords,
      };
    });
  }

  /**
   * AI-powered research generator: expands a seed query into long-tail ideas, intent, and cluster grouping
   */
  public async researchTopic(seedTopic: string): Promise<{
    dataSource: string;
    clusters: KeywordCluster[];
    generatedIdeas: KeywordIdea[];
  }> {
    const cleanTopic = seedTopic.trim();
    if (!cleanTopic) {
      return {
        dataSource: 'Global Herbs Dispensary Search Intent & Customer Knowledge Model',
        clusters: this.getKeywordClusters(),
        generatedIdeas: [],
      };
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are a senior SEO keyword research specialist for Global Herbs (globalherbs.site), a premier compliant botanical dispensary.
Analyze the seed topic: "${cleanTopic}".
Generate 4-6 specific, high-intent, long-tail cannabis dispensary keywords based on real customer questions and search intent.
Ensure zero keyword cannibalization and strict 2018 Farm Bill compliance (no medical cure claims).
Target these catalog product categories where relevant: THCa flower, solventless live rosin, CBD tinctures, edibles, herbal accessories.

Output strict JSON array with this structure:
[
  {
    "keyword": "string (lowercase long-tail query)",
    "cluster": "string (one of: 'THCa Science, Decarboxylation & Legality' | 'Solventless Live Hash Rosin & Concentrates' | 'CBD Dosing, Bioavailability & Restful Sleep' | 'Safe Online Dispensary Purchasing & Lab COAs' | 'Terpenes, Minor Cannabinoids & Entourage Effect')",
    "searchIntent": "Informational" | "Commercial" | "Transactional" | "Navigational",
    "difficultyTier": "Low (Long-Tail)" | "Medium (Targeted)" | "High (Head Term)",
    "relativeVolume": "High" | "Medium" | "Emerging Long-Tail",
    "businessValue": "High" | "Medium" | "Low",
    "relevantProducts": ["string"],
    "targetCategorySlug": "string (e.g. 'thca', 'concentrates-wax', 'cbd-oils', 'edibles')",
    "suggestedH1": "string"
  }
]`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '[]';
        const parsed: any[] = JSON.parse(text);

        const generatedIdeas: KeywordIdea[] = parsed.map((item) => {
          const cannibalization = detectCannibalization(item.keyword);
          return {
            id: `kw-gen-${Date.now()}-${normalizeText(item.keyword).slice(0, 20).replace(/\s+/g, '-')}`,
            keyword: item.keyword,
            cluster: item.cluster || 'THCa Science, Decarboxylation & Legality',
            searchIntent: item.searchIntent || 'Informational',
            difficultyTier: item.difficultyTier || 'Low (Long-Tail)',
            relativeVolume: item.relativeVolume || 'Medium',
            businessValue: item.businessValue || 'High',
            relevantProducts: Array.isArray(item.relevantProducts) ? item.relevantProducts : ['Lab-Tested Craft Extracts'],
            targetCategorySlug: item.targetCategorySlug || 'thca',
            suggestedH1: item.suggestedH1 || `Comprehensive Guide to ${item.keyword}`,
            isCovered: cannibalization.isCovered,
            existingArticleSlug: cannibalization.existingArticleSlug,
            cannibalizationWarning: cannibalization.cannibalizationWarning,
          };
        });

        return {
          dataSource: 'Google Gemini 3.8 Flash + Global Herbs Dispensary Intent Engine',
          clusters: this.getKeywordClusters(),
          generatedIdeas,
        };
      } catch (err) {
        console.warn('[KeywordResearch] Gemini API call fallback to heuristic model:', err);
      }
    }

    // Heuristic fallback if Gemini API is not configured or fails
    const cannibalization = detectCannibalization(cleanTopic);
    const fallbackIdea: KeywordIdea = {
      id: `kw-heur-${Date.now()}`,
      keyword: cleanTopic.toLowerCase(),
      cluster: 'THCa Science, Decarboxylation & Legality',
      searchIntent: cleanTopic.toLowerCase().includes('buy') || cleanTopic.toLowerCase().includes('order') ? 'Transactional' : 'Informational',
      difficultyTier: cleanTopic.split(/\s+/).length >= 4 ? 'Low (Long-Tail)' : 'Medium (Targeted)',
      relativeVolume: 'Medium',
      businessValue: 'High',
      relevantProducts: ['Lab-Tested Connoisseur Extracts', 'Top-Shelf Indoor Flower'],
      targetCategorySlug: 'thca',
      suggestedH1: `Comprehensive Guide to ${cleanTopic}: Botanical Science, Dosing & Compliance`,
      isCovered: cannibalization.isCovered,
      existingArticleSlug: cannibalization.existingArticleSlug,
      cannibalizationWarning: cannibalization.cannibalizationWarning,
    };

    return {
      dataSource: 'Global Herbs Dispensary Search Intent & Customer Knowledge Model',
      clusters: this.getKeywordClusters(),
      generatedIdeas: [fallbackIdea],
    };
  }
}

export const keywordResearchService = new KeywordResearchService();

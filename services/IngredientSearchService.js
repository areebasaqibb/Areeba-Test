const { getRetailersForCountry } = require('./RetailSourceService');
const { researchIngredientPrices } = require('./MarketPriceService');
const { normalizePrice } = require('./PriceNormalizationService');

/**
 * Orchestrates the entire AI ingredient price lookup flow.
 */
async function searchIngredientPriceFlow(ingredientName, brand, business) {
  const locationStr = [business.city, business.state, business.country].filter(Boolean).join(', ') || 'Global';
  const currency = business.currency || 'USD';
  
  // 1. Get retailers for the country
  const retailers = getRetailersForCountry(business.country);

  // 2. Fetch extracted options from Web + AI
  const aiResult = await researchIngredientPrices(ingredientName, brand, locationStr, currency, retailers);
  
  // aiResult format: { exactMatchFound, productName, confidenceScore, options: [...] }
  if (!aiResult || !aiResult.options || aiResult.options.length === 0) {
    throw new Error('Could not find pricing data for this product.');
  }

  // 3. Normalize all options to standard unit
  const normalizedOptions = aiResult.options.map(opt => {
    const norm = normalizePrice(opt.price, opt.amount, opt.unit);
    return {
      source: opt.source,
      sourcePrice: opt.price,
      sourceAmount: opt.amount,
      sourceUnit: opt.unit,
      normalizedPrice: norm.normalizedPrice,
      unit: norm.standardUnit,
      url: opt.url || ''
    };
  });

  return {
    exactMatchFound: aiResult.exactMatchFound,
    productName: aiResult.productName,
    confidenceScore: aiResult.confidenceScore,
    substitutedBrand: !aiResult.exactMatchFound,
    options: normalizedOptions
  };
}

module.exports = {
  searchIngredientPriceFlow
};

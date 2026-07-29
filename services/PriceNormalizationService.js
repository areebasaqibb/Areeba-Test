/**
 * Utility to normalize prices to standard units (1kg, 1L, or 1 piece).
 */
function normalizePrice(price, amount, unitFrom) {
  const u = unitFrom.toLowerCase();
  let normalizedPrice = price;
  let standardUnit = u;

  // Convert weights to 1 kg
  if (['g', 'gram', 'grams'].includes(u)) {
    normalizedPrice = (price / amount) * 1000;
    standardUnit = 'kg';
  } else if (['mg', 'milligram'].includes(u)) {
    normalizedPrice = (price / amount) * 1000000;
    standardUnit = 'kg';
  } else if (['oz', 'ounce', 'ounces'].includes(u)) {
    // 1 oz = 28.3495 g -> 1kg = 35.274 oz
    normalizedPrice = (price / amount) * 35.274;
    standardUnit = 'kg';
  } else if (['lb', 'lbs', 'pound', 'pounds'].includes(u)) {
    // 1 lb = 0.453592 kg -> 1kg = 2.20462 lbs
    normalizedPrice = (price / amount) * 2.20462;
    standardUnit = 'kg';
  } 
  
  // Convert volumes to 1 L
  else if (['ml', 'milliliter', 'milliliters'].includes(u)) {
    normalizedPrice = (price / amount) * 1000;
    standardUnit = 'L';
  } else if (['cup', 'cups'].includes(u)) {
    // Approx 1 cup = 240ml
    normalizedPrice = (price / (amount * 240)) * 1000;
    standardUnit = 'L';
  } else if (['tbsp', 'tablespoon'].includes(u)) {
    // 1 tbsp = 15ml
    normalizedPrice = (price / (amount * 15)) * 1000;
    standardUnit = 'L';
  } else if (['tsp', 'teaspoon'].includes(u)) {
    // 1 tsp = 5ml
    normalizedPrice = (price / (amount * 5)) * 1000;
    standardUnit = 'L';
  }

  // Countable items (Eggs)
  else if (['dozen'].includes(u)) {
    normalizedPrice = price / (amount * 12);
    standardUnit = 'piece';
  } else if (['piece', 'pieces', 'egg', 'eggs', 'each'].includes(u)) {
    normalizedPrice = price / amount;
    standardUnit = 'piece';
  }
  
  // Already standard
  else if (['kg', 'kilogram', 'kilograms'].includes(u)) {
    normalizedPrice = price / amount;
    standardUnit = 'kg';
  } else if (['l', 'liter', 'litre', 'liters', 'litres'].includes(u)) {
    normalizedPrice = price / amount;
    standardUnit = 'L';
  }

  return {
    normalizedPrice: Math.round(normalizedPrice * 100) / 100, // round to 2 decimals
    standardUnit
  };
}

/**
 * Given an array of raw price results from AI, normalizes them and calculates stats.
 */
function processMarketPrices(rawResults) {
  if (!rawResults || rawResults.length === 0) {
    return null;
  }

  const normalizedResults = rawResults.map(r => {
    const norm = normalizePrice(r.price, r.amount, r.unit);
    return {
      source: r.source,
      originalPrice: r.price,
      originalAmount: r.amount,
      originalUnit: r.unit,
      normalizedPrice: norm.normalizedPrice,
      standardUnit: norm.standardUnit
    };
  });

  // Filter out any invalid numbers
  const validPrices = normalizedResults.filter(r => !isNaN(r.normalizedPrice) && r.normalizedPrice > 0);
  
  if (validPrices.length === 0) return null;

  const prices = validPrices.map(p => p.normalizedPrice);
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  const sources = validPrices.map(p => p.source);

  // We assume all valid prices share the same standard unit
  const standardUnit = validPrices[0].standardUnit;

  return {
    averagePrice: Math.round(averagePrice * 100) / 100,
    lowestPrice,
    highestPrice,
    unit: standardUnit,
    sources: [...new Set(sources)] // unique sources
  };
}

module.exports = {
  normalizePrice,
  processMarketPrices
};

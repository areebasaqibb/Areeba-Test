const axios = require('axios');
const cheerio = require('cheerio');

function isValidMatch(query, title) {
  const queryWords = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  if (queryWords.length === 0) return true;
  const titleLower = title.toLowerCase();
  let matchCount = 0;
  for (const word of queryWords) {
    if (titleLower.includes(word)) matchCount++;
  }
  return (matchCount / queryWords.length) >= 0.5;
}

async function scrapeAlfatah(query) {
  try {
    const url = `https://www.alfatah.pk/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product`;
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const product = data?.resources?.results?.products?.[0];
    if (product && isValidMatch(query, product.title)) {
      let amount = 1, unit = 'piece';
      const titleLower = product.title.toLowerCase();
      const weightMatch = titleLower.match(/(\d+(?:\.\d+)?)\s*(g|gm|kg|ml|l|pcs|pc|pieces|pack)\b/);
      const eggMatch = titleLower.match(/(\d+)\s*(eggs?)/);
      if (weightMatch) {
        amount = parseFloat(weightMatch[1]);
        unit = weightMatch[2].replace('gm', 'g');
        if (['pcs', 'pc', 'pieces', 'pack'].includes(unit)) unit = 'piece';
      } else if (eggMatch) {
        amount = parseFloat(eggMatch[1]);
        unit = 'piece';
      } else if (titleLower.includes('egg')) {
        const numMatch = titleLower.match(/\b(\d+)\b/);
        if (numMatch) amount = parseFloat(numMatch[1]);
        unit = 'piece';
      }
      return {
        source: 'Al Fatah',
        price: parseFloat(product.price),
        amount,
        unit,
        url: 'https://www.alfatah.pk' + product.url,
        title: product.title
      };
    }
  } catch (e) {
    console.error('Alfatah scrape error', e.message);
  }
  return null;
}

async function scrapeChefiality(query) {
  try {
    const url = `https://chefiality.pk/?s=${encodeURIComponent(query)}&post_type=product`;
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    
    let firstProduct = null;
    $('.product').first().each((i, el) => {
      const title = $(el).find('.woocommerce-loop-product__title, .product-title').text().trim();
      const priceText = $(el).find('.woocommerce-Price-amount').first().text().trim();
      const link = $(el).find('a').attr('href');
      
      if (title && priceText && isValidMatch(query, title)) {
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
        let amount = 1, unit = 'piece';
        const titleLower = title.toLowerCase();
        const weightMatch = titleLower.match(/(\d+(?:\.\d+)?)\s*(g|gm|kg|ml|l|pcs|pc|pieces|pack)\b/);
        const eggMatch = titleLower.match(/(\d+)\s*(eggs?)/);
        if (weightMatch) {
          amount = parseFloat(weightMatch[1]);
          unit = weightMatch[2].replace('gm', 'g');
          if (['pcs', 'pc', 'pieces', 'pack'].includes(unit)) unit = 'piece';
        } else if (eggMatch) {
          amount = parseFloat(eggMatch[1]);
          unit = 'piece';
        } else if (titleLower.includes('egg')) {
          const numMatch = titleLower.match(/\b(\d+)\b/);
          if (numMatch) amount = parseFloat(numMatch[1]);
          unit = 'piece';
        }
        firstProduct = {
          source: 'Chefiality',
          price, amount, unit, url: link, title
        };
      }
    });
    return firstProduct;
  } catch (e) {
    console.error('Chefiality scrape error', e.message);
  }
  return null;
}

async function researchIngredientPrices(ingredientName, brand, location, currency, retailers) {
  try {
    const query = brand ? `${brand} ${ingredientName}` : ingredientName;
    
    // Fetch concurrently
    const [alfatahProduct, chefialityProduct] = await Promise.all([
      scrapeAlfatah(query),
      scrapeChefiality(query)
    ]);
    
    let options = [];
    if (alfatahProduct) options.push(alfatahProduct);
    if (chefialityProduct) options.push(chefialityProduct);

    return {
      exactMatchFound: options.length > 0,
      productName: options.length > 0 ? options[0].title : query,
      confidenceScore: brand ? 98 : 85,
      options: options
    };
  } catch (err) {
    console.error("AI Lookup Error:", err.message);
    return { exactMatchFound: false, productName: ingredientName, confidenceScore: 0, options: [] };
  }
}

function calculateConfidence(rawResults, brand) {
  return 95;
}

module.exports = {
  researchIngredientPrices,
  calculateConfidence
};

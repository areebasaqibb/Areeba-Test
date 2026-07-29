const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeAlfatah(query) {
  try {
    const url = `https://www.alfatah.pk/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product`;
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const product = data?.resources?.results?.products?.[0];
    if (product) {
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
      }
      return {
        source: 'Al Fatah',
        price: parseFloat(product.price),
        amount, unit, title: product.title
      };
    }
  } catch (e) {}
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
      if (title && priceText) {
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
        firstProduct = { source: 'Chefiality', price, title };
      }
    });
    return firstProduct;
  } catch (e) {}
  return null;
}

async function test() {
  const query = "Youngs Crave Dark Chocolate";
  console.log("Alfatah:", await scrapeAlfatah(query));
  console.log("Chefiality:", await scrapeChefiality(query));
}
test();

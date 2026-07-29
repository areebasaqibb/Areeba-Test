const axios = require('axios');
const cheerio = require('cheerio');

async function searchAlfatah(query) {
  try {
    const url = `https://alfatah.pk/search?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    
    // Attempt to find product elements
    const products = [];
    $('.product-item, .grid-product, .product-card').each((i, el) => {
      const title = $(el).find('.product-title, .grid-product__title, .card-information__text').text().trim();
      const price = $(el).find('.price, .grid-product__price, .price-item').text().trim();
      const link = $(el).find('a').attr('href');
      if (title && price) {
        products.push({ title, price, link: link.startsWith('http') ? link : 'https://alfatah.pk' + link });
      }
    });
    console.log('Alfatah:', products.slice(0, 3));
  } catch (e) {
    console.error('Alfatah error:', e.message);
  }
}

async function searchChefiality(query) {
  try {
    const url = `https://chefiality.pk/?s=${encodeURIComponent(query)}&post_type=product`;
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    
    const products = [];
    $('.product').each((i, el) => {
      const title = $(el).find('.woocommerce-loop-product__title, .product-title').text().trim();
      const price = $(el).find('.woocommerce-Price-amount').first().text().trim();
      const link = $(el).find('a').attr('href');
      if (title && price) {
        products.push({ title, price, link });
      }
    });
    console.log('Chefiality:', products.slice(0, 3));
  } catch (e) {
    console.error('Chefiality error:', e.message);
  }
}

searchAlfatah('butter');
searchChefiality('chocolate');

const axios = require('axios');
const cheerio = require('cheerio');

async function searchWebForPrice(query) {
  try {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.b_algo').each((i, el) => {
      if (i >= 5) return false; 
      
      const title = $(el).find('h2').text().trim();
      const snippet = $(el).find('.b_caption p').text().trim();
      const link = $(el).find('a').attr('href');

      if (title && snippet) {
        results.push(`Source: ${link}\nTitle: ${title}\nSnippet: ${snippet}`);
      }
    });

    return results.join('\n\n');
  } catch (err) {
    console.error("Web Scraper Error:", err.message);
    return ""; // Return empty string if search fails
  }
}

module.exports = { searchWebForPrice };

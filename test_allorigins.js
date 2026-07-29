const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent('Crave Dark Chocolate price in Pakistan')}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
    
    const response = await axios.get(proxyUrl);
    const html = response.data.contents;
    
    const $ = cheerio.load(html);
    const results = [];

    $('.result').each((i, el) => {
      if (i >= 5) return false;
      
      const title = $(el).find('.result__title').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      if (title) results.push(`Title: ${title}\nSnippet: ${snippet}`);
    });

    console.log("=== RESULTS ===");
    console.log(results.join('\n\n'));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();

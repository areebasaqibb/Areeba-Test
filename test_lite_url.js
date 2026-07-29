const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  try {
    const url = `https://lite.duckduckgo.com/lite/`;
    const response = await axios.post(url, 'q=crave+dark+chocolate+price+pakistan', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    $('tr').each((i, el) => {
      const titleEl = $(el).find('.result-title');
      if (titleEl.length > 0) {
        const title = titleEl.text().trim();
        const url = titleEl.attr('href');
        const snippet = $(el).next('tr').find('.result-snippet').text().trim();
        if (snippet) {
           results.push({ title, url, snippet });
        }
      }
    });
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();

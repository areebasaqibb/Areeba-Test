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
    $('.result-snippet').each((i, el) => {
      results.push($(el).text().trim());
    });
    console.log(results);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();

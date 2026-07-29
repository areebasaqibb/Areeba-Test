const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
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
    // The snippet is inside a td, which is inside a tr. The previous tr contains the title and link.
    const trSnippet = $(el).closest('tr');
    const trTitle = trSnippet.prev('tr');
    const a = trTitle.find('.result-title');
    const title = a.text().trim();
    let url = a.attr('href');
    if (url && url.startsWith('//')) url = 'https:' + url;
    
    // DDG Lite often uses redirect URLs like //duckduckgo.com/l/?uddg=...
    if (url && url.includes('uddg=')) {
        const urlParams = new URL(url);
        url = decodeURIComponent(urlParams.searchParams.get('uddg'));
    }
    
    results.push({ title, url, snippet: $(el).text().trim() });
  });
  console.log(JSON.stringify(results, null, 2));
}
test();

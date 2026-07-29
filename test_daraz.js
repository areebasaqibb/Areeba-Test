const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  try {
    const url = 'https://www.daraz.pk/catalog/?q=almonds';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    console.log(response.data.substring(0, 500));
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();

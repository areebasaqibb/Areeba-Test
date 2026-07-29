const axios = require('axios');

async function testAlfatah() {
  try {
    const url = 'https://www.alfatah.pk/search/suggest.json?q=butter&resources[type]=product';
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });
    console.log("Success! Products:", data.resources.results.products.slice(0,2));
  } catch (err) {
    console.error("Alfatah Suggest Error:", err.response ? err.response.status : err.message);
  }
}
testAlfatah();

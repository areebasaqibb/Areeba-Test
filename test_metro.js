const axios = require('axios');

async function test() {
  try {
    const response = await axios.get('https://backend.metro-online.pk/api/v1/products/search?q=butter&per_page=5', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    console.log(response.data);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();

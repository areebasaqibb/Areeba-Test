const googleIt = require('google-it');

async function test() {
  try {
    const results = await googleIt({ query: 'Crave Dark Chocolate price in Pakistan' });
    console.log("=== GOOGLE RESULTS ===");
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();

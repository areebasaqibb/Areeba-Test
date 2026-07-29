const { OpenAI } = require('openai');
const googleIt = require('google-it');

const openai = new OpenAI({ 
  apiKey: process.env.openrouter_apikey,
  baseURL: 'https://openrouter.ai/api/v1'
});

async function generatePricingStrategy(payload, business) {
  const { 
    productName, category, servingSize,
    ingredients, packagingCost, laborTime, 
    utilitiesEstimate, deliveryCost, targetMargin
  } = payload;

  const totalIngredientCost = ingredients.reduce((sum, ing) => sum + (parseFloat(ing.cost) || 0), 0);
  const laborMins = parseFloat(laborTime) || 120;
  const laborCostCalc = (laborMins / 60) * 250; // Approx 250/hr
  const parsedPackaging = parseFloat(packagingCost || 0);
  const parsedUtilities = parseFloat(utilitiesEstimate || 0);
  
  const totalMaterialCost = totalIngredientCost + parsedPackaging + parsedUtilities + parseFloat(deliveryCost || 0);
  const totalProductionCost = totalMaterialCost + laborCostCalc;
  
  const yieldCount = parseInt(servingSize.replace(/\\D/g, '')) || 1;
  const costPerPiece = totalProductionCost / yieldCount;

  const marginNum = parseFloat(targetMargin) || 50;
  const recommendedPriceMath = totalProductionCost / (1 - (marginNum / 100));

  const fallbackResponse = {
    costs: {
      totalProduction: parseFloat(totalProductionCost.toFixed(2)),
      costPerPiece: parseFloat(costPerPiece.toFixed(2)),
      packaging: parsedPackaging,
      labor: parseFloat(laborCostCalc.toFixed(2)),
      utilities: parsedUtilities
    },
    marketStats: {
      lowestPrice: 0,
      averagePrice: 0,
      highestPrice: 0,
      totalListings: 0
    },
    recommendation: {
      suggestedPrice: parseFloat(recommendedPriceMath.toFixed(2)),
      reasons: [
        `Your production cost is ${business.currency} ${totalProductionCost.toFixed(2)}.`,
        `Pricing at ${business.currency} ${recommendedPriceMath.toFixed(2)} achieves your target margin of ${marginNum}%.`,
        "Live competitor data is currently unavailable."
      ],
      confidence: "50%"
    },
    strategies: {
      budget: { price: parseFloat((recommendedPriceMath * 0.9).toFixed(2)), margin: parseFloat((marginNum - 10).toFixed(1)) },
      recommended: { price: parseFloat(recommendedPriceMath.toFixed(2)), margin: marginNum },
      premium: { price: parseFloat((recommendedPriceMath * 1.2).toFixed(2)), margin: parseFloat((marginNum + 15).toFixed(1)) }
    },
    tips: [
      "Review your ingredient costs regularly to maintain margins.",
      "Consider bundling products for higher average order value."
    ],
    competitors: []
  };

  if (!process.env.openrouter_apikey) {
    return fallbackResponse;
  }

  let searchData = [];
  try {
    const locationStr = [business.city, business.state, business.country].filter(Boolean).join(', ') || 'Global';
    const query = `${productName} ${locationStr} bakery price menu site:instagram.com OR site:facebook.com OR foodpanda`;
    const searchResults = await googleIt({ query, 'no-display': true });
    searchData = searchResults.slice(0, 10).map(r => ({ title: r.title, snippet: r.snippet, link: r.link }));
  } catch (err) {
    console.warn("Search failed:", err.message);
  }

  try {
    const locationStr = [business.city, business.state, business.country].filter(Boolean).join(', ') || 'Global';
    const prompt = `
      Act as an expert Bakery Business Consultant.
      Business: ${business.name} (Type: Home Bakery/Store)
      Location: ${locationStr}
      Currency: ${business.currency}
      
      Product: ${productName} (${category}) - Serves ${servingSize} (Yield: ${yieldCount} pieces)
      
      Costs Breakdown:
      - Total Production Cost: ${totalProductionCost}
      - Cost Per Piece: ${costPerPiece}
      - Packaging: ${parsedPackaging}
      - Labor: ${laborCostCalc}
      - Utilities: ${parsedUtilities}
      - Target Margin: ${targetMargin}%
      
      I have performed a web search for local competitors selling this in ${locationStr}.
      Search Results (JSON):
      ${JSON.stringify(searchData)}
      
      Tasks:
      1. Extract real local competitors from the search data. For each competitor, extract location, servingSize, and calculate pricePerServing.
      2. Calculate market stats (lowest, average, highest). If no competitors found, set these to 0.
      3. Recommend a selling price. Provide 3-4 bullet points of reasoning (e.g. "Your cost is X", "Most charge Y", "Pricing at Z keeps you competitive"), and a confidence percentage (e.g. "95%").
      4. Provide 3 strategies (budget, recommended, premium) with their calculated prices and the resulting profit margin percentage for each.
      5. Provide 2-4 actionable AI business advice tips specific to this product in this location.
      
      Return ONLY a raw JSON object (NO Markdown formatting, NO \`\`\`json) in this exact format:
      {
        "costs": {
          "totalProduction": ${totalProductionCost},
          "costPerPiece": ${costPerPiece},
          "packaging": ${parsedPackaging},
          "labor": ${laborCostCalc},
          "utilities": ${parsedUtilities}
        },
        "marketStats": {
          "lowestPrice": 0,
          "averagePrice": 0,
          "highestPrice": 0,
          "totalListings": 0
        },
        "recommendation": {
          "suggestedPrice": 0,
          "reasons": [ "string" ],
          "confidence": "95%"
        },
        "strategies": {
          "budget": { "price": 0, "margin": 0 },
          "recommended": { "price": 0, "margin": 0 },
          "premium": { "price": 0, "margin": 0 }
        },
        "tips": [ "string" ],
        "competitors": [
          {
            "name": "string",
            "location": "string",
            "price": 0,
            "platform": "Instagram / Foodpanda / Website",
            "link": "url",
            "product": "string (what they sell exactly)",
            "servingSize": "string (e.g. 1 Brownie)",
            "pricePerServing": 0
          }
        ]
      }
    `;

    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const resultText = response.choices[0].message.content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
    const parsed = JSON.parse(resultText);
    
    // Safety fallback
    if (!parsed.strategies) parsed.strategies = fallbackResponse.strategies;
    if (!parsed.costs) parsed.costs = fallbackResponse.costs;
    
    return parsed;
  } catch (err) {
    console.error("AI Pricing Failed, using fallback:", err.message);
    return fallbackResponse;
  }
}

module.exports = {
  generatePricingStrategy
};

const { OpenAI } = require('openai');

const openai = new OpenAI({ 
  apiKey: process.env.openrouter_apikey,
  baseURL: 'https://openrouter.ai/api/v1'
});

async function getMarketIntelligence(business, ingredients, products) {
  if (!process.env.openrouter_apikey) {
    throw new Error("OpenRouter API Key missing.");
  }

  const locationStr = [business.city, business.state, business.country].filter(Boolean).join(', ') || 'Global';

  const prompt = `
    Act as an AI Bakery Market Analyst for a bakery in ${locationStr}.
    Business Name: ${business.name}
    Currency: ${business.currency}
    
    Current Ingredients: ${JSON.stringify(ingredients.map(i => i.name))}
    Current Products: ${JSON.stringify(products.map(p => ({ name: p.name, price: p.sellingPrice })))}
    
    Analyze local ${locationStr} market trends.
    Return ONLY a raw JSON object (NO Markdown, NO \`\`\`json) with the following structure:
    {
      "marketAlerts": [
        "Example: Butter prices have increased globally by 5%.",
        "Example: Your Brownie is priced 10% below local competitors."
      ],
      "financialTargets": {
        "estimatedStartupCost": "e.g. ${business.currency} 5,000",
        "recommendedMonthlyTarget": "e.g. ${business.currency} 2,000",
        "averageProfitMargin": "e.g. 45%"
      },
      "growthOpportunities": [
        "Example: Mini cakes are trending. Add a bento cake.",
        "Example: Create a seasonal gift box."
      ]
    }
  `;

  const response = await openai.chat.completions.create({
    model: 'google/gemini-2.5-flash:free',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
  });

  const resultText = response.choices[0].message.content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
  return JSON.parse(resultText);
}

module.exports = {
  getMarketIntelligence
};

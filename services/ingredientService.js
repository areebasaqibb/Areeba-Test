const { OpenAI } = require('openai');

const openai = new OpenAI({ 
  apiKey: process.env.openrouter_apikey,
  baseURL: 'https://openrouter.ai/api/v1'
});

/**
 * Uses AI to look up the local market price of an ingredient.
 */
async function lookupIngredientPrice(ingredientName, business) {
  if (!process.env.openrouter_apikey) {
    throw new Error("OpenRouter API Key missing.");
  }

  const locationStr = [business.city, business.state, business.country].filter(Boolean).join(', ') || 'Global';

  const prompt = `
    Act as a bakery supply chain expert in ${locationStr}.
    Find the current average retail/wholesale grocery price for "${ingredientName}" in ${locationStr}.
    
    Currency: ${business.currency}
    Measurement System: ${business.measurementSystem} (Normalize to 1 kg if solid, 1 Litre if liquid, or 1 Dozen for eggs).

    Return ONLY a raw JSON object (NO Markdown, NO \`\`\`json) with this exact structure:
    {
      "sourcePrice": 0.00,
      "normalizedPrice": 0.00,
      "unit": "kg",
      "confidenceScore": 90,
      "sources": "Multiple local supermarkets"
    }
    
    If you cannot find exact data, provide a highly educated estimate for this region and lower the confidence score.
  `;

  const response = await openai.chat.completions.create({
    model: 'google/gemini-2.5-flash:free',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
  });

  const resultText = response.choices[0].message.content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
  return JSON.parse(resultText);
}

module.exports = {
  lookupIngredientPrice
};

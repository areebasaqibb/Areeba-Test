const { OpenAI } = require('openai');

const openai = new OpenAI({ 
  apiKey: process.env.openrouter_apikey,
  baseURL: 'https://openrouter.ai/api/v1'
});

async function estimateRecipeCosts(payload, business) {
  if (!process.env.openrouter_apikey) {
    throw new Error("OpenRouter API Key missing.");
  }

  const { productName, category, servingSize } = payload;
  const locationStr = [business.city, business.state, business.country].filter(Boolean).join(', ') || 'Global';

  const prompt = `
    Act as an expert Bakery Business Consultant.
    Location: ${locationStr}
    Currency: ${business.currency}
    
    A home baker is planning to make:
    Product: ${productName} (${category})
    Serving Size / Yield: ${servingSize}
    
    Please estimate the average costs for producing this recipe from home in ${locationStr}.
    
    Return ONLY a raw JSON object (NO Markdown, NO \`\`\`json) with the following structure:
    {
      "ingredientCost": 0.00,
      "packagingCost": 0.00,
      "laborTime": 0, // in minutes
      "utilitiesEstimate": 0.00,
      "deliveryCost": 0.00
    }
  `;

  const response = await openai.chat.completions.create({
    model: 'google/gemini-2.5-flash:free',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  });

  const resultText = response.choices[0].message.content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
  return JSON.parse(resultText);
}

module.exports = {
  estimateRecipeCosts
};

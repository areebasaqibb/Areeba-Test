const { OpenAI } = require('openai');

const openai = new OpenAI({ 
  apiKey: process.env.openrouter_apikey,
  baseURL: 'https://openrouter.ai/api/v1'
});

async function estimateRecipeCosts(recipeData, business) {
  if (!process.env.openrouter_apikey) return fallbackEstimates(recipeData);

  const prompt = `
    Act as a bakery business consultant in ${business.city || 'Global'}.
    The user is creating a recipe: "${recipeData.name}" (Category: ${recipeData.category || 'Baked Good'}, Yield: ${recipeData.yield || 1}).
    The total ingredient cost is ${business.currency} ${recipeData.ingredientCost}.

    Provide estimates for:
    1. Labor Cost (The user spent ${recipeData.laborTime || 'an unknown amount of time'} on this. Calculate exactly based on local baker's minimum wage for this time duration).
    2. Utilities Cost (The user used electricity/gas for ${recipeData.electricityTime || 'an unknown amount of time'}. Calculate cost based on local commercial electricity rates for this duration).
    3. Packaging Cost (boxes, cake boards, labels, etc. for ${recipeData.yield} items).
    4. Suggested Selling Price (Multiply ONLY the ingredient cost by exactly ${business.profitMargin || 3.0} to ensure the requested profit margin, and then add the raw labor, utilities, and packaging costs to it as they are).

    Return ONLY a raw JSON object (NO Markdown):
    {
      "laborCost": 0.00,
      "utilitiesCost": 0.00,
      "packagingCost": 0.00,
      "suggestedPrice": 0.00,
      "reasoning": "Short explanation of how you arrived at these numbers"
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    
    const resultText = response.choices[0].message.content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    return JSON.parse(resultText);
  } catch (err) {
    console.error("AI Recipe Estimate Error:", err);
    return fallbackEstimates(recipeData);
  }
}

function fallbackEstimates(recipeData) {
  // Simple heuristics if AI fails
  const ingredientCost = recipeData.ingredientCost || 10;
  return {
    laborCost: ingredientCost * 0.5,
    utilitiesCost: ingredientCost * 0.1,
    packagingCost: ingredientCost * 0.2,
    suggestedPrice: (ingredientCost * 3) + (ingredientCost * 0.5) + (ingredientCost * 0.1) + (ingredientCost * 0.2), // profit on ingredients only
    reasoning: "Based on standard 3x industry multipliers due to unavailable AI service."
  };
}

module.exports = { estimateRecipeCosts };

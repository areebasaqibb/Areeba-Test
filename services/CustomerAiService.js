const { OpenAI } = require('openai');

const openai = new OpenAI({ 
  apiKey: process.env.openrouter_apikey,
  baseURL: 'https://openrouter.ai/api/v1'
});

async function analyzeCustomers(customers, business) {
  if (!process.env.openrouter_apikey || !customers || customers.length === 0) return { campaignSuggestion: "Add more customers to get campaign ideas." };

  const topCustomers = [...customers].sort((a, b) => b.lifetimeSpending - a.lifetimeSpending).slice(0, 10).map(c => ({
    name: c.name,
    spent: c.lifetimeSpending,
    orders: c.totalOrders
  }));

  const prompt = `
    Act as a bakery marketing expert.
    Here are the bakery's top customers: ${JSON.stringify(topCustomers)}.
    
    Suggest ONE short, creative promotional campaign (max 2 sentences) to reward these loyal customers or encourage them to buy again.

    Return ONLY a raw JSON object:
    {
      "campaignSuggestion": "Your campaign idea here"
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    
    const resultText = response.choices[0].message.content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    return JSON.parse(resultText);
  } catch (err) {
    return { campaignSuggestion: "Consider offering a 10% discount code to your repeat customers." };
  }
}

module.exports = { analyzeCustomers };

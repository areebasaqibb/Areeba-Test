const { OpenAI } = require('openai');

const openai = new OpenAI({ 
  apiKey: process.env.openrouter_apikey,
  baseURL: 'https://openrouter.ai/api/v1'
});

async function analyzeOrders(orders, business) {
  if (!process.env.openrouter_apikey || !orders || orders.length === 0) return { insight: "Keep tracking orders to get AI insights." };

  // Summarize orders for the prompt without passing huge data
  const recentOrders = orders.slice(0, 50).map(o => ({
    date: o.deliveryDate,
    status: o.orderStatus,
    total: o.total
  }));

  const prompt = `
    Act as a bakery manager AI. 
    Review these recent orders: ${JSON.stringify(recentOrders)}.
    
    Provide ONE short, helpful, actionable insight (max 2 sentences) for the bakery owner. 
    Examples: "You have a busy weekend coming up, consider buying flour in bulk." or "Order volume is up 20% this week!"

    Return ONLY a raw JSON object:
    {
      "insight": "Your helpful tip here"
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });
    
    const resultText = response.choices[0].message.content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    return JSON.parse(resultText);
  } catch (err) {
    console.error("AI Order Insight Error:", err);
    return { insight: "You have upcoming orders. Stay prepared!" };
  }
}

module.exports = { analyzeOrders };

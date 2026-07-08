require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { OpenAI } = require('openai');

const app = express();
const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-beginners';

app.use(cors());
app.use(express.json());

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// --- API ROUTES ---

// 1. Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name }
    });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(400).json({ error: 'Registration failed or email already exists.' });
  }
});

// 2. Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// 3. Business: Get or Create Profile
app.get('/api/business', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  res.json({ business });
});

app.post('/api/business', authenticateToken, async (req, res) => {
  const { name } = req.body;
  try {
    const business = await prisma.business.create({
      data: { name, userId: req.user.id }
    });
    res.json(business);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create business or already exists.' });
  }
});

// 4. Ingredients: Get and Add
app.get('/api/ingredients', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });

  const ingredients = await prisma.ingredient.findMany({ where: { businessId: business.id } });
  res.json(ingredients);
});

app.post('/api/ingredients', authenticateToken, async (req, res) => {
  const { name, cost, unit } = req.body;
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  
  if (!business) return res.status(404).json({ error: 'Business not found' });

  const ingredient = await prisma.ingredient.create({
    data: { name, cost, unit, businessId: business.id }
  });
  res.json(ingredient);
});

// 5. Products: Get and Add
app.get('/api/products', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });

  const products = await prisma.product.findMany({ where: { businessId: business.id } });
  res.json(products);
});

app.post('/api/products', authenticateToken, async (req, res) => {
  const { name, description, sellingPrice } = req.body;
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  
  if (!business) return res.status(404).json({ error: 'Business not found' });

  const product = await prisma.product.create({
    data: { name, description, sellingPrice, businessId: business.id }
  });
  res.json(product);
});

// 6. AI Features
app.post('/api/ai/calculate-price', authenticateToken, async (req, res) => {
  const { totalCost, desiredMargin } = req.body;

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API Key is missing from .env file." });
    }

    const baseSellingPrice = totalCost * (1 + (desiredMargin / 100));

    const prompt = `
      I make a dessert with a total production cost of $${totalCost}.
      My desired profit margin is ${desiredMargin}%.
      The mathematical selling price is $${baseSellingPrice}.
      Act as a pricing expert and round this to the best consumer-friendly price (e.g. .99 or .50).
      Return ONLY a JSON object in this exact format:
      {
        "recommendedPrice": 0.00,
        "explanation": "Short sentence explaining why."
      }
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const resultText = response.choices[0].message.content;
    const parsedResult = JSON.parse(resultText);

    res.json(parsedResult);
  } catch (error) {
    res.status(500).json({ error: 'AI Calculation failed.', details: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Simplified Beginner Server is running on http://localhost:${PORT}`);
});

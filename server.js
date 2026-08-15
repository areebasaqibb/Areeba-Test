require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { OpenAI } = require('openai');
const { getDefaultBusinessSettings } = require('./services/currencyService');
const { generatePricingStrategy } = require('./services/pricingEngineService');
const { getMarketIntelligence } = require('./services/marketIntelligenceService');
const { searchIngredientPriceFlow } = require('./services/IngredientSearchService');
const { estimateRecipeCosts } = require('./services/costEstimatorService');
const { estimateRecipeCosts: aiEstimateRecipeCosts } = require('./services/RecipeAiService');
const { analyzeOrders } = require('./services/OrderAiService');
const { analyzeCustomers } = require('./services/CustomerAiService');
const Vibrant = require('node-vibrant/node').default || require('node-vibrant/node').Vibrant || require('node-vibrant/node');
const chroma = require('chroma-js');
const multer = require('multer');
const path = require('path');

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  process.env.DATABASE_URL = `file:${dbPath}`;
}

const app = express();
const prisma = new PrismaClient();
const openai = new OpenAI({ 
  apiKey: process.env.openrouter_apikey,
  baseURL: 'https://openrouter.ai/api/v1'
});

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-beginners';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

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

// 0. Image Upload
app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  res.json({ url: dataUrl });
});

// 1. Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, country, state, city, logo, instagram, whatsapp, productsSold, businessGoal } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { currency, symbol, system } = getDefaultBusinessSettings(country);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        business: {
          create: {
            name: `${name}'s Bakery`,
            country,
            state,
            city,
            currency,
            currencySymbol: symbol,
            measurementSystem: system,
            logo,
            instagram,
            whatsapp,
            productsSold,
            businessGoal
          }
        }
      },
      include: { business: true }
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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed: ' + (error.message || String(error)) });
  }
});


// 3. Business: Get or Create Profile
app.get('/api/business', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ 
    where: { userId: req.user.id },
    include: { activeTheme: true, themes: true }
  });
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
  const { 
    name, brand, cost, unit, 
    sourcePrice, normalizedPrice, lowestPrice, highestPrice, 
    confidenceScore, priceSources, isAutoPriced,
    stockQuantity, minStock
  } = req.body;
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  
  if (!business) return res.status(404).json({ error: 'Business not found' });

  const ingredient = await prisma.ingredient.create({
    data: { 
      name, 
      brand,
      cost, 
      unit,
      sourcePrice,
      normalizedPrice,
      lowestPrice,
      highestPrice,
      confidenceScore,
      priceSources: priceSources ? JSON.stringify(priceSources) : null,

      isAutoPriced,
      stockQuantity,
      minStock,
      lastUpdated: isAutoPriced ? new Date() : null,
      businessId: business.id 
    }
  });
  res.json(ingredient);
});

// 5. Products: Get and Add
app.get('/api/products', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });

  const products = await prisma.product.findMany({ 
    where: { businessId: business.id },
    include: {
      baseRecipe: true,
      flavors: {
        include: {
          ingredients: {
            include: {
              ingredient: true
            }
          }
        }
      }
    }
  });
  res.json(products);
});

app.post('/api/products', authenticateToken, async (req, res) => {
  const { name, description, baseRecipeId, flavors, imageUrl } = req.body;
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  
  if (!business) return res.status(404).json({ error: 'Business not found' });

  const product = await prisma.product.create({
    data: { 
      name, 
      description, 
      imageUrl,
      baseRecipeId,
      businessId: business.id,
      flavors: {
        create: flavors ? flavors.map(f => ({
          name: f.name,
          productionCost: f.productionCost || 0,
          suggestedPrice: f.suggestedPrice || 0,
          profitMargin: f.profitMargin || 0,
          ingredients: {
            create: f.ingredients ? f.ingredients.map(fi => ({
              ingredientId: fi.ingredientId,
              quantity: parseFloat(fi.quantity),
              unit: fi.unit
            })) : []
          }
        })) : []
      }
    },
    include: {
      baseRecipe: true,
      flavors: {
        include: {
          ingredients: {
            include: { ingredient: true }
          }
        }
      }
    }
  });
  res.json(product);
});

// --- Update & Delete Routes ---

// 6. Business: Update Profile
app.put('/api/business', authenticateToken, async (req, res) => {
  try {
    const { name, currency, country, state, city, language, logo, instagram, whatsapp, productsSold, businessGoal, websiteUrl, profitMargin } = req.body;
    
    // Auto-detect currency if location changed, otherwise keep the passed currency
    const { symbol, system } = getDefaultBusinessSettings(country);

    const business = await prisma.business.update({
      where: { userId: req.user.id },
      data: { 
        name, 
        currency, 
        currencySymbol: symbol,
        measurementSystem: system,
        country, 
        state, 
        city, 
        language,
        logo,
        instagram,
        whatsapp,
        productsSold,
        businessGoal,
        websiteUrl,
        profitMargin: profitMargin !== undefined ? parseFloat(profitMargin) : undefined
      }
    });
    res.json(business);
  } catch (error) {
    console.error('Update Business Error:', error);
    res.status(400).json({ error: 'Failed to update business.' });
  }
});

// 7. Ingredients: Update
app.put('/api/ingredients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { 
    name, brand, cost, unit, 
    sourcePrice, normalizedPrice, lowestPrice, highestPrice, 
    confidenceScore, priceSources, isAutoPriced,
    stockQuantity, minStock
  } = req.body;

  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });

  // Ownership check
  const ingredient = await prisma.ingredient.findFirst({ where: { id, businessId: business.id } });
  if (!ingredient) return res.status(404).json({ error: 'Ingredient not found or access denied' });

  const updated = await prisma.ingredient.update({
    where: { id },
    data: { 
      name, 
      brand,
      cost, 
      unit,
      sourcePrice,
      normalizedPrice,
      lowestPrice,
      highestPrice,
      confidenceScore,
      priceSources: priceSources ? JSON.stringify(priceSources) : null,

      isAutoPriced,
      stockQuantity,
      minStock,
      lastUpdated: isAutoPriced ? new Date() : ingredient.lastUpdated,
    },
  });
  res.json(updated);
});

// 8. Ingredients: Delete
app.delete('/api/ingredients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });

  // Ownership check
  const ingredient = await prisma.ingredient.findFirst({ where: { id, businessId: business.id } });
  if (!ingredient) return res.status(404).json({ error: 'Ingredient not found or access denied' });

  await prisma.ingredient.delete({ where: { id } });
  res.json({ message: 'Ingredient deleted successfully' });
});

// 9. Products: Update
app.put('/api/products/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, description, baseRecipeId, flavors, imageUrl } = req.body;

  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });

  // Ownership check
  const product = await prisma.product.findFirst({ where: { id, businessId: business.id } });
  if (!product) return res.status(404).json({ error: 'Product not found or access denied' });

  // Delete existing flavors to replace with the new list
  await prisma.productFlavor.deleteMany({ where: { productId: id } });

  const updated = await prisma.product.update({
    where: { id },
    data: { 
      name, 
      description, 
      imageUrl,
      baseRecipeId,
      flavors: {
        create: flavors ? flavors.map(f => ({
          name: f.name,
          productionCost: f.productionCost || 0,
          suggestedPrice: f.suggestedPrice || 0,
          profitMargin: f.profitMargin || 0,
          ingredients: {
            create: f.ingredients ? f.ingredients.map(fi => ({
              ingredientId: fi.ingredientId,
              quantity: parseFloat(fi.quantity),
              unit: fi.unit
            })) : []
          }
        })) : []
      }
    },
    include: {
      baseRecipe: true,
      flavors: {
        include: {
          ingredients: {
            include: { ingredient: true }
          }
        }
      }
    }
  });
  res.json(updated);
});

// 10. Products: Delete
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });

  // Ownership check
  const product = await prisma.product.findFirst({ where: { id, businessId: business.id } });
  if (!product) return res.status(404).json({ error: 'Product not found or access denied' });

  await prisma.product.delete({ where: { id } });
  res.json({ message: 'Product deleted successfully' });
});


// 11. AI Ingredient Lookup
app.post('/api/ai/lookup-ingredient', authenticateToken, async (req, res) => {
  try {
    const { ingredientName, brand } = req.body;
    const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const result = await searchIngredientPriceFlow(ingredientName, brand, business);
    res.json(result);
  } catch (error) {
    console.error('Ingredient Lookup Error:', error);
    res.status(500).json({ error: 'Failed to look up ingredient price via AI.' });
  }
});

// 12. AI Pricing Wizard
app.post('/api/ai/calculate-price', authenticateToken, async (req, res) => {
  const payload = req.body;
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });

  try {
    const parsedResult = await generatePricingStrategy(payload, business);
    res.json(parsedResult);
  } catch (error) {
    res.status(500).json({ error: 'AI Calculation failed.', details: error.message });
  }
});

// 13. AI Advisor Proactive Insights
app.get('/api/ai/advisor', authenticateToken, async (req, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'Business not found' });
    
    const ingredients = await prisma.ingredient.findMany({ where: { businessId: business.id } });
    const products = await prisma.product.findMany({ where: { businessId: business.id } });

    const parsedResult = await getMarketIntelligence(business, ingredients, products);
    res.json(parsedResult);
  } catch (error) {
    console.error("Advisor Error:", error);
    res.status(500).json({ error: 'Failed to generate AI insights.' });
  }
});

// 14. AI Estimate Costs
app.post('/api/ai/estimate-costs', authenticateToken, async (req, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const estimations = await estimateRecipeCosts(req.body, business);
    res.json(estimations);
  } catch (error) {
    console.error('AI Estimator Error:', error);
    res.status(500).json({ error: 'Failed to estimate costs.' });
  }
});

// Start Server
// --- NEW MODULES ---

// RECIPES
app.get('/api/recipes', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  const recipes = await prisma.recipe.findMany({ 
    where: { businessId: business.id },
    include: { ingredients: { include: { ingredient: true } } }
  });
  res.json(recipes);
});

app.post('/api/recipes', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  
  const { name, category, servingSize, yield: yieldCount, notes, laborCost, packagingCost, utilitiesCost, totalCost, suggestedPrice, ingredients } = req.body;
  
  const recipe = await prisma.recipe.create({
    data: {
      name, category, servingSize, yield: yieldCount, notes,
      laborCost, packagingCost, utilitiesCost, totalCost, suggestedPrice,
      businessId: business.id,
      ingredients: {
        create: ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: parseFloat(i.quantity) || 0,
          unit: i.unit
        }))
      }
    },
    include: { ingredients: true }
  });
  res.json(recipe);
});

app.put('/api/recipes/:id', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  
  const { id } = req.params;
  const { name, category, servingSize, yield: yieldCount, notes, laborCost, packagingCost, utilitiesCost, totalCost, suggestedPrice, ingredients } = req.body;
  
  await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });

  const recipe = await prisma.recipe.update({
    where: { id, businessId: business.id },
    data: {
      name, category, servingSize, yield: yieldCount, notes,
      laborCost, packagingCost, utilitiesCost, totalCost, suggestedPrice,
      ingredients: {
        create: ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: parseFloat(i.quantity) || 0,
          unit: i.unit
        }))
      }
    },
    include: { ingredients: true }
  });
  res.json(recipe);
});

app.patch('/api/recipes/:id/analysis', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  
  const { id } = req.params;
  const { marketAnalysis, pricingStrategy, suggestedPrice } = req.body;
  
  const recipe = await prisma.recipe.update({
    where: { id, businessId: business.id },
    data: { marketAnalysis, pricingStrategy, suggestedPrice }
  });
  res.json(recipe);
});

app.delete('/api/recipes/:id', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  
  const { id } = req.params;
  await prisma.recipe.delete({ where: { id, businessId: business.id } });
  res.json({ success: true });
});

app.post('/api/ai/recipe-estimate', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  const estimate = await aiEstimateRecipeCosts(req.body, business);
  res.json(estimate);
});

// ORDERS
app.get('/api/orders', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  const orders = await prisma.order.findMany({ 
    where: { businessId: business.id },
    include: { 
      customer: true, 
      items: {
        include: {
          recipe: true,
          product: true,
          flavors: {
            include: { flavor: true }
          }
        }
      } 
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(orders);
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  
  const { customerId, orderNumber, deliveryDate, type, address, notes, paymentStatus, orderStatus, subtotal, deliveryFee, total, profitEstimate, items } = req.body;
  
  const order = await prisma.order.create({
    data: {
      orderNumber, deliveryDate: deliveryDate ? new Date(deliveryDate) : null, type, address, notes, paymentStatus, orderStatus, subtotal, deliveryFee, total, profitEstimate,
      customerId, businessId: business.id,
      items: {
        create: items.map(i => ({
          recipeId: i.recipeId || null,
          productId: i.productId || null,
          quantity: i.quantity,
          priceAtTime: i.priceAtTime,
          notes: i.notes || null,
          flavors: {
            create: i.flavors?.map((f) => ({
              productFlavorId: f.productFlavorId,
              quantity: f.quantity
            })) || []
          }
        }))
      }
    }
  });

  // Update customer stats
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      totalOrders: { increment: 1 },
      lifetimeSpending: { increment: total }
    }
  });

  res.json(order);
});

app.put('/api/orders/:id', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  
  const { customerId, orderNumber, deliveryDate, type, address, notes, paymentStatus, orderStatus, subtotal, deliveryFee, total, profitEstimate, items } = req.body;
  const orderId = req.params.id;

  const existingOrder = await prisma.order.findFirst({ where: { id: orderId, businessId: business.id } });
  if (!existingOrder) return res.status(404).json({ error: 'Order not found' });

  if (items && Array.isArray(items)) {
    await prisma.orderItem.deleteMany({ where: { orderId } });
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      orderNumber, 
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null, 
      type, address, notes, paymentStatus, orderStatus, 
      subtotal, deliveryFee, total, profitEstimate,
      customerId,
      ...(items && Array.isArray(items) ? {
        items: {
          create: items.map(i => ({
            recipeId: i.recipeId || null,
            productId: i.productId || null,
            quantity: i.quantity,
            priceAtTime: i.priceAtTime || (i.price ? i.price : 0),
            notes: i.notes || null,
            flavors: {
              create: i.flavors?.map((f) => ({
                productFlavorId: f.productFlavorId,
                quantity: f.quantity
              })) || []
            }
          }))
        }
      } : {})
    },
    include: {
      customer: true,
      items: {
        include: {
          recipe: true,
          product: true
        }
      }
    }
  });

  res.json(order);
});

app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  const orderId = req.params.id;
  try {
    const order = await prisma.order.findFirst({ where: { id: orderId, businessId: business.id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    await prisma.order.delete({ where: { id: orderId } });
    res.json({ message: 'Order deleted' });
  } catch(err) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

app.get('/api/ai/orders-insight', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  const orders = await prisma.order.findMany({ where: { businessId: business.id }, take: 50, orderBy: { createdAt: 'desc' }});
  const insight = await analyzeOrders(orders, business);
  res.json(insight);
});

// CUSTOMERS
app.get('/api/customers', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  const customers = await prisma.customer.findMany({ where: { businessId: business.id } });
  res.json(customers);
});

app.post('/api/customers', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  
  const { name, phone, instagram, address, birthday, notes } = req.body;
  
  const customer = await prisma.customer.create({
    data: {
      name, phone, instagram, address, notes,
      birthday: birthday ? new Date(birthday) : null,
      businessId: business.id
    }
  });
  res.json(customer);
});

app.put('/api/customers/:id', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  
  const { name, phone, instagram, address, birthday, notes } = req.body;
  const customerId = req.params.id;

  const existing = await prisma.customer.findFirst({ where: { id: customerId, businessId: business.id } });
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      name, phone, instagram, address, notes,
      birthday: birthday ? new Date(birthday) : null
    }
  });
  res.json(customer);
});

app.delete('/api/customers/:id', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  const customerId = req.params.id;
  try {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, businessId: business.id } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    
    // Check if customer has orders
    const orders = await prisma.order.count({ where: { customerId } });
    if (orders > 0) {
      return res.status(400).json({ error: 'Cannot delete customer with existing orders' });
    }
    
    await prisma.customer.delete({ where: { id: customerId } });
    res.json({ message: 'Customer deleted' });
  } catch(err) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

app.get('/api/ai/customers-insight', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  const customers = await prisma.customer.findMany({ where: { businessId: business.id }});
  const insight = await analyzeCustomers(customers, business);
  res.json(insight);
});

// ==========================================
// THEMES API
// ==========================================

app.get('/api/themes', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  const themes = await prisma.theme.findMany({ where: { businessId: business.id } });
  res.json(themes);
});

app.post('/api/themes', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  
  const { name, lightMode, darkMode, setActive } = req.body;
  const theme = await prisma.theme.create({
    data: {
      name,
      lightMode: JSON.stringify(lightMode),
      darkMode: JSON.stringify(darkMode),
      businessId: business.id
    }
  });
  
  if (setActive) {
    await prisma.business.update({
      where: { id: business.id },
      data: { activeThemeId: theme.id }
    });
  }
  
  res.json(theme);
});

app.put('/api/themes/:id/activate', authenticateToken, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  
  await prisma.business.update({
    where: { id: business.id },
    data: { activeThemeId: req.params.id }
  });
  
  res.json({ success: true });
});

app.post('/api/ai/extract-theme', authenticateToken, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg|svg\\+xml);base64,/, "");
    const imgBuffer = Buffer.from(base64Data, 'base64');

    const palette = await Vibrant.from(imgBuffer).getPalette();
    const swatches = Object.values(palette).filter(Boolean);
    
    // Sort by a score that heavily favors saturation and penalizes dull backgrounds
    swatches.sort((a, b) => {
      const score = (swatch) => {
        const c = chroma(swatch.hex);
        const sat = c.hsl()[1] || 0;
        const lum = c.luminance();
        
        let penalty = 1;
        // Strongly penalize grays/beiges
        if (sat < 0.15) penalty *= 0.05;
        
        // Penalize near-white backgrounds, but KEEP pastels/creams if they have decent saturation
        if (lum > 0.85 && sat < 0.3) penalty *= 0.1;
        
        // Penalize near-black backgrounds, but KEEP deep brand colors (maroon, navy)
        if (lum < 0.15 && sat < 0.2) penalty *= 0.1;
        
        return swatch.population * (sat + 0.2) * penalty;
      };
      return score(b) - score(a);
    });
    
    console.log('--- AI EXTRACTION ENGINE: SWATCHES ---');
    swatches.forEach((s, i) => {
      const c = chroma(s.hex);
      console.log(`[${i+1}] ${s.hex} | Pop: ${s.population} | Sat: ${c.hsl()[1]?.toFixed(2)} | Lum: ${c.luminance().toFixed(2)}`);
    });
    
    // Filter out pure white and pure black (true background) but keep maroon/cream
    const brandSwatches = swatches.filter(s => {
      const l = chroma(s.hex).luminance();
      const sat = chroma(s.hex).hsl()[1] || 0;
      return (l > 0.02 || sat > 0.2) && (l < 0.98 || sat > 0.2); 
    });

    let primary, secondary, accent;

    if (brandSwatches.length > 0) {
      primary = chroma(brandSwatches[0].hex);
      secondary = brandSwatches.length > 1 ? chroma(brandSwatches[1].hex) : primary.set('hsl.h', '+30').brighten();
      accent = brandSwatches.length > 2 ? chroma(brandSwatches[2].hex) : primary.set('hsl.h', '-30');
    } else if (swatches.length > 0) {
      // fallback to whatever we found (maybe it's a completely black logo)
      primary = chroma(swatches[0].hex);
      secondary = swatches.length > 1 ? chroma(swatches[1].hex) : chroma(swatches[0].hex).set('hsl.l', 0.5);
      accent = chroma(swatches[0].hex).set('hsl.l', 0.8);
    } else {
      primary = chroma('#f472b6');
      secondary = chroma('#F9D5E5');
      accent = chroma('#D4A017');
    }

    // Accessibility / contrast adjustments
    // We want the primary color to be legible against white and black.
    // Let's generate a full cohesive palette using chroma-js

    const isPrimaryDark = primary.luminance() < 0.3;
    const isPrimaryBright = primary.luminance() > 0.7;
    const saturation = primary.hsl()[1] || 0;

    let personality = "Modern & Clean";
    let recommendedTheme = "Minimal White";
    let reason = "Your logo features balanced colors. A clean interface will let your products shine.";

    if (saturation < 0.2 && isPrimaryDark) {
      personality = "Luxury & Sophisticated";
      recommendedTheme = "Dark Mode Luxury";
      reason = "Your logo uses dark, muted tones. A dark, luxurious theme will emphasize a premium brand feel.";
    } else if (saturation < 0.3 && !isPrimaryDark) {
      personality = "Organic & Natural";
      recommendedTheme = "Pistachio & Cream";
      reason = "Your logo uses soft, earthy tones. A light, natural theme reinforces handmade quality.";
    } else if (saturation > 0.7 && isPrimaryBright) {
      personality = "Playful & Vibrant";
      recommendedTheme = "Strawberry Cream";
      reason = "Your logo is bright and energetic. A vibrant, colorful interface matches this playfulness.";
    } else if (primary.hsl()[0] > 330 || primary.hsl()[0] < 20) {
      personality = "Warm & Inviting";
      recommendedTheme = "Elegant Blush";
      reason = "Warm tones detected in your logo. Blush pinks and creams will create a welcoming atmosphere.";
    } else if (primary.hsl()[0] > 200 && primary.hsl()[0] < 260) {
      personality = "Professional & Bold";
      recommendedTheme = "Royal Blue & Gold";
      reason = "Blue tones often convey trust. This theme provides a strong, professional look.";
    }

    const lightBg = chroma('#ffffff');
    const darkBg = chroma('#0f172a');
    const lightSurface = chroma('#f8fafc');
    const darkSurface = chroma('#1e293b');

    // Text colors ensuring 4.5 contrast (WCAG AA)
    const getAccessibleText = (bg, baseColor) => {
      let current = chroma(baseColor);
      let step = bg.luminance() > 0.5 ? -0.1 : 0.1;
      while (chroma.contrast(current, bg) < 4.5 && current.luminance() > 0.01 && current.luminance() < 0.99) {
        current = step > 0 ? current.brighten(0.2) : current.darken(0.2);
      }
      return current;
    };

    const lightText = getAccessibleText(lightBg, '#0f172a');
    const lightTextMuted = getAccessibleText(lightBg, '#64748b');
    const darkText = getAccessibleText(darkBg, '#f8fafc');
    const darkTextMuted = getAccessibleText(darkBg, '#94a3b8');

    // Make sure primary is somewhat visible on both (at least 3.0 ratio if possible, otherwise we keep it as branding and use it carefully)
    let safePrimaryLight = primary;
    if (chroma.contrast(safePrimaryLight, lightBg) < 2) safePrimaryLight = safePrimaryLight.darken(1);
    
    let safePrimaryDark = primary;
    if (chroma.contrast(safePrimaryDark, darkBg) < 2) safePrimaryDark = safePrimaryDark.brighten(1);

    const response = {
      message: `Brand Personality: ${personality}\nPrimary Color: ${primary.hex()}\nRecommended Theme: ${recommendedTheme}\nReason: ${reason}`,
      lightMode: {
        "--primary": safePrimaryLight.hex(),
        "--primary-hover": safePrimaryLight.darken(0.4).hex(),
        "--primary-light": safePrimaryLight.alpha(0.1).css(),
        "--secondary": secondary.hex(),
        "--background": lightBg.hex(),
        "--surface": lightSurface.hex(),
        "--surface-hover": lightSurface.darken(0.05).hex(),
        "--text": lightText.hex(),
        "--text-muted": lightTextMuted.hex(),
        "--border": chroma('#e2e8f0').hex()
      },
      darkMode: {
        "--primary": safePrimaryDark.hex(),
        "--primary-hover": safePrimaryDark.brighten(0.4).hex(),
        "--primary-light": safePrimaryDark.alpha(0.2).css(),
        "--secondary": secondary.brighten(0.5).hex(),
        "--background": darkBg.hex(),
        "--surface": darkSurface.hex(),
        "--surface-hover": darkSurface.brighten(0.2).hex(),
        "--text": darkText.hex(),
        "--text-muted": darkTextMuted.hex(),
        "--border": chroma('#334155').hex()
      }
    };
    
    res.json(response);
  } catch (err) {
    console.error("Theme extraction error:", err);
    res.status(500).json({ error: 'Failed to extract theme from image' });
  }
});


// --- INSIGHTS ---
app.get('/api/insights', authenticateToken, async (req, res) => {
  try {
    const business = await prisma.business.findUnique({ where: { userId: req.user.id } });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const defaultMargin = business.profitMargin || 3.0;

    const orders = await prisma.order.findMany({
      where: { businessId: business.id },
      include: {
        items: {
          include: {
            recipe: true,
            product: { include: { flavors: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const customers = await prisma.customer.findMany({
      where: { businessId: business.id }
    });

    // 1. Trends
    const trendsMap = {};
    orders.forEach(o => {
      const date = new Date(o.createdAt);
      const year = date.getFullYear();
      const week = Math.ceil((((date - new Date(year,0,1))/86400000) + new Date(year,0,1).getDay()+1)/7);
      const key = `${year}-W${week}`;
      if (!trendsMap[key]) trendsMap[key] = { week: key, revenue: 0, orders: 0 };
      trendsMap[key].revenue += o.total;
      trendsMap[key].orders += 1;
    });
    const trends = Object.values(trendsMap);

    // 2. Best Sellers & Trending Flavors
    const itemCounts = {};
    const flavorCounts = {};

    orders.forEach(o => {
      o.items.forEach(item => {
        const name = item.recipe?.name || item.product?.name || 'Custom Item';
        if (!itemCounts[name]) itemCounts[name] = 0;
        itemCounts[name] += item.quantity;

        if (item.flavors && item.flavors.length > 0) {
          // New structured data
          item.flavors.forEach((f) => {
            const flavorName = f.flavor?.name || 'Unknown Flavor';
            if (!flavorCounts[flavorName]) flavorCounts[flavorName] = 0;
            flavorCounts[flavorName] += f.quantity;
          });
        } else if (item.notes) {
          // Fallback to legacy notes parsing
          const regex = /(\d+)x\s([^,)]+)/g;
          let match;
          while ((match = regex.exec(item.notes)) !== null) {
            const count = parseInt(match[1]);
            const flavorName = match[2].trim();
            if (!flavorCounts[flavorName]) flavorCounts[flavorName] = 0;
            flavorCounts[flavorName] += count;
          }
        }
      });
    });
    const bestSellers = Object.entries(itemCounts)
      .map(([name, units]) => ({ name, units }))
      .sort((a, b) => b.units - a.units);

    const trendingFlavors = Object.entries(flavorCounts)
      .map(([name, units]) => ({ name, units }))
      .sort((a, b) => b.units - a.units);

    // 3. Margin Health
    const marginHealth = [];
    orders.forEach(o => {
      o.items.forEach(item => {
        const name = item.recipe?.name || item.product?.name || 'Custom Item';
        
        let cost = 0;
        let targetMargin = defaultMargin;
        
        if (item.recipe) {
           cost = item.recipe.totalCost || 0;
        } else if (item.product && item.product.flavors && item.product.flavors.length > 0) {
           cost = item.product.flavors[0].productionCost || 0;
           targetMargin = item.product.flavors[0].profitMargin || defaultMargin;
        }

        if (item.priceAtTime > 0) {
          const marginPercent = ((item.priceAtTime - cost) / item.priceAtTime) * 100;
          marginHealth.push({
            name,
            actualMargin: marginPercent,
            targetMargin: targetMargin,
            cost: cost,
            price: item.priceAtTime
          });
        }
      });
    });

    const marginMap = {};
    marginHealth.forEach(m => {
      if (!marginMap[m.name]) marginMap[m.name] = { count: 0, actual: 0, target: m.targetMargin };
      marginMap[m.name].actual += m.actualMargin;
      marginMap[m.name].count += 1;
    });
    const marginHealthFinal = Object.keys(marginMap).map(name => ({
      name,
      actualMargin: marginMap[name].actual / marginMap[name].count,
      targetMargin: marginMap[name].target
    }));

    // 4. Customer Insights
    let repeatCustomers = 0;
    let topCustomer = null;
    let maxSpend = 0;

    customers.forEach(c => {
      if (c.totalOrders > 1) repeatCustomers++;
      if (c.lifetimeSpending > maxSpend) {
        maxSpend = c.lifetimeSpending;
        topCustomer = c;
      }
    });

    const repeatRate = customers.length > 0 ? (repeatCustomers / customers.length) * 100 : 0;

    // 5. AI Recommendation
    let aiRecommendation = null;
    if (orders.length < 3) {
      aiRecommendation = "Add a few more orders and I'll start surfacing insights here.";
    } else {
      let bestItem = null;
      let highest = -9999;
      marginHealthFinal.forEach(m => {
         if (m.actualMargin > highest) {
           highest = m.actualMargin;
           bestItem = m.name;
         }
      });
      if (bestItem) {
         aiRecommendation = `Your highest margin item is ${bestItem} at ${highest.toFixed(1)}%. Consider promoting it!`;
      } else {
         aiRecommendation = "You're on a roll! Keep processing orders to uncover more insights.";
      }
    }

    res.json({
      trends,
      bestSellers,
      trendingFlavors,
      marginHealth: marginHealthFinal,
      customerInsights: {
        repeatRate,
        topCustomer: topCustomer ? { name: topCustomer.name, spend: topCustomer.lifetimeSpending } : null
      },
      aiRecommendation
    });

  } catch (error) {
    console.error("Insights error:", error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Simplified Beginner Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;

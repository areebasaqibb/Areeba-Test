require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed...');
  
  // Create a dummy user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'dummy@example.com' },
    update: {},
    create: {
      email: 'dummy@example.com',
      password: hashedPassword,
      name: 'Dummy User',
    },
  });
  
  console.log('User created:', user.email);

  // Create a business
  let business = await prisma.business.findUnique({
    where: { userId: user.id }
  });

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: 'Dummy Bakery',
        userId: user.id
      }
    });
    console.log('Business created:', business.name);
  }

  // Create ingredients
  const ingredientCount = await prisma.ingredient.count({
    where: { businessId: business.id }
  });

  if (ingredientCount === 0) {
    await prisma.ingredient.createMany({
      data: [
        { name: 'Flour', cost: 1.5, unit: 'kg', businessId: business.id },
        { name: 'Sugar', cost: 0.8, unit: 'kg', businessId: business.id },
        { name: 'Butter', cost: 4.0, unit: 'kg', businessId: business.id },
      ]
    });
    console.log('Ingredients seeded!');
  } else {
    console.log('Ingredients already exist');
  }

  // Create products
  const productCount = await prisma.product.count({
    where: { businessId: business.id }
  });

  if (productCount === 0) {
    await prisma.product.createMany({
      data: [
        { name: 'Chocolate Cake', description: 'Delicious dark chocolate cake', sellingPrice: 15.99, businessId: business.id },
        { name: 'Vanilla Cupcake', description: 'Classic vanilla cupcake', sellingPrice: 3.50, businessId: business.id },
        { name: 'Croissant', description: 'Buttery flaky croissant', sellingPrice: 2.99, businessId: business.id },
      ]
    });
    console.log('Products seeded!');
  } else {
    console.log('Products already exist');
  }

  console.log('Seed completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

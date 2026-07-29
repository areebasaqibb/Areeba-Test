const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log('--- STARTING FLAVOR TEST ---');
  
  // 1. Get the first business and customer
  const business = await prisma.business.findFirst();
  if (!business) {
    console.log('No business found');
    return;
  }
  
  let customer = await prisma.customer.findFirst({ where: { businessId: business.id } });
  if (!customer) {
     customer = await prisma.customer.create({
       data: { name: 'Test Customer', email: 'test@example.com', businessId: business.id }
     });
  }
  
  // 2. Find "Ultimate Brownie Collection" or a bundled product
  let product = await prisma.product.findFirst({
    where: { businessId: business.id, name: { contains: 'Collection' } },
    include: { flavors: true }
  });
  
  if (!product) {
    product = await prisma.product.findFirst({
      where: { businessId: business.id },
      include: { flavors: true }
    });
  }
  
  if (!product || product.flavors.length < 2) {
    console.log('Could not find a product with at least 2 flavors. Aborting test.');
    return;
  }
  
  const flavor1 = product.flavors[0];
  const flavor2 = product.flavors[1];
  
  console.log(`Selected Product: ${product.name}`);
  console.log(`Flavor 1: ${flavor1.name} (Cost: $${flavor1.productionCost})`);
  console.log(`Flavor 2: ${flavor2.name} (Cost: $${flavor2.productionCost})`);
  
  // 3. Create a test order
  console.log('\n--- CREATING TEST ORDER ---');
  const order = await prisma.order.create({
    data: {
      orderNumber: 'TEST-' + Math.floor(Math.random() * 10000),
      businessId: business.id,
      customerId: customer.id,
      type: 'Pickup',
      paymentStatus: 'Paid',
      orderStatus: 'Confirmed',
      subtotal: product.price || 0,
      total: product.price || 0,
      items: {
        create: [{
          productId: product.id,
          quantity: 1,
          priceAtTime: product.price || 0,
          notes: 'Box of 4 (2x ' + flavor1.name + ', 2x ' + flavor2.name + ')',
          flavors: {
            create: [
              { productFlavorId: flavor1.id, quantity: 2 },
              { productFlavorId: flavor2.id, quantity: 2 }
            ]
          }
        }]
      }
    },
    include: { items: { include: { flavors: { include: { flavor: true } } } } }
  });
  
  console.log('Order created successfully:', order.orderNumber);
  
  // 4. Verify Total Profit Calculation (like app/dashboard/page.tsx does)
  console.log('\n--- VERIFYING TOTAL PROFIT ---');
  let cost = 0;
  order.items.forEach(item => {
    item.flavors.forEach(f => {
      const flavorCost = f.flavor?.productionCost || 0;
      cost += flavorCost * f.quantity;
      console.log(`Added cost for ${f.quantity}x ${f.flavor.name}: $${flavorCost * f.quantity}`);
    });
  });
  const profit = (order.subtotal || 0) - cost;
  console.log(`Subtotal: $${order.subtotal}`);
  console.log(`Total Cost (based on structured flavors): $${cost}`);
  console.log(`Calculated Profit: $${profit}`);
  
  // 5. Verify Trending Flavors (like /api/insights does)
  console.log('\n--- VERIFYING TRENDING FLAVORS ---');
  const allOrders = await prisma.order.findMany({
    where: { businessId: business.id, paymentStatus: { not: 'Pending' } },
    include: { items: { include: { flavors: { include: { flavor: true } } } } }
  });
  
  const flavorCounts = {};
  allOrders.forEach(o => {
    o.items.forEach(item => {
      if (item.flavors && item.flavors.length > 0) {
        item.flavors.forEach(f => {
          const name = f.flavor?.name || 'Unknown';
          if (!flavorCounts[name]) flavorCounts[name] = 0;
          flavorCounts[name] += f.quantity;
        });
      } else if (item.notes) {
        const regex = /(\d+)x\s([^,)]+)/g;
        let match;
        while ((match = regex.exec(item.notes)) !== null) {
          const count = parseInt(match[1]);
          const name = match[2].trim();
          if (!flavorCounts[name]) flavorCounts[name] = 0;
          flavorCounts[name] += count;
        }
      }
    });
  });
  
  console.log('Trending Flavors Aggregation:');
  console.log(flavorCounts);
  
  console.log('\n--- TEST COMPLETE ---');
}

runTest().catch(console.error).finally(() => prisma.$disconnect());

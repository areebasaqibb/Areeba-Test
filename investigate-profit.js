const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate() {
  const orders = await prisma.order.findMany({
    where: { paymentStatus: { not: 'Pending' } },
    include: {
      items: {
        include: {
          recipe: true,
          product: {
            include: { flavors: true }
          },
          flavors: {
            include: { flavor: true }
          }
        }
      }
    }
  });

  console.log(`Found ${orders.length} paid/confirmed orders.\n`);

  for (const order of orders) {
    console.log(`Order: ${order.orderNumber} | Revenue (Subtotal): ${order.subtotal} | Total: ${order.total}`);
    
    for (const item of order.items) {
      const name = item.recipe?.name || item.product?.name || 'Custom Item';
      console.log(`  - Item: ${name} (Qty: ${item.quantity}) | Notes: ${item.notes || 'None'}`);
      
      if (item.recipe) {
        console.log(`    -> Recipe totalCost: ${item.recipe.totalCost}`);
      } else if (item.product) {
        if (item.flavors && item.flavors.length > 0) {
          console.log(`    -> Structured Flavors present:`);
          for (const f of item.flavors) {
             console.log(`       - ${f.flavor.name} (Qty: ${f.quantity}): productionCost = ${f.flavor.productionCost}`);
          }
        } else if (item.product.flavors && item.product.flavors.length > 0) {
          console.log(`    -> Fallback Flavor (using 1st flavor): ${item.product.flavors[0].name} | productionCost = ${item.product.flavors[0].productionCost}`);
        } else {
          console.log(`    -> No flavors attached to this product!`);
        }
      } else {
         console.log(`    -> No recipe or product linked.`);
      }
    }
    console.log('');
  }
}

investigate().catch(console.error).finally(() => prisma.$disconnect());

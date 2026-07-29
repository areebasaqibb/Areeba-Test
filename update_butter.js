const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.ingredient.updateMany({
    where: {
      name: { contains: 'Butter', mode: 'insensitive' }
    },
    data: {
      cost: 3250,
      confidenceScore: 98
    }
  });
  console.log('Updated ingredients:', result.count);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('test', 10);
  const user = await prisma.user.upsert({
    where: { email: 'areebasaqib2004@gmail.com' },
    update: { password: hashedPassword },
    create: {
      email: 'areebasaqib2004@gmail.com',
      password: hashedPassword,
      name: 'Areeba Saqib',
    },
  });
  console.log('User created/updated:', user.email);

  // Also create a business for them so the dashboard works
  let business = await prisma.business.findUnique({
    where: { userId: user.id }
  });

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: 'Areeba Bakery',
        userId: user.id
      }
    });
    console.log('Business created:', business.name);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst();
  if (!user) return console.log('No user');
  
  try {
    const business = await prisma.business.update({
      where: { userId: user.id },
      data: {
        name: "Test Bakery",
        currency: "USD",
        currencySymbol: "$",
        measurementSystem: "Metric",
        country: "PK",
        state: "Punjab",
        city: "Lahore",
        language: "en",
        logo: "",
        instagram: "",
        whatsapp: "",
        productsSold: "",
        businessGoal: "Hobby"
      }
    });
    console.log('Success!', business);
  } catch (err) {
    console.error('Update Business Error:', err);
  }
}
test();

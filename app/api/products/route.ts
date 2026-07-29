import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return Response.json(products);
  } catch (error) {
    return Response.json({ error: 'Failed to fetch products.' }, { status: 500 });
  }
}

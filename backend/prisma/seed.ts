import { PrismaClient } from '@prisma/client';
import { seedDefaultProductCategories } from '../src/prisma/seed-default-product-categories';

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    await seedDefaultProductCategories(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to seed default product categories:', error);
    process.exit(1);
  });
}

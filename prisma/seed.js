const { PrismaClient } = require('@prisma/client');
const { seedCatalog } = require('./catalog-data');

const prisma = new PrismaClient();

async function main() {
  await seedCatalog(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

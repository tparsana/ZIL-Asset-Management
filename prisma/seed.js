const { PrismaClient, LocationKind } = require('@prisma/client');

const prisma = new PrismaClient();

const locations = [
  { name: 'Room 140', kind: LocationKind.ROOM, description: 'Large podcasting studio and green screen/backdrop shooting space' },
  { name: 'Room 135', kind: LocationKind.ROOM, description: 'Individual streaming/editing studio with high-end PC' },
  { name: 'Room 134', kind: LocationKind.ROOM, description: 'Individual streaming/editing studio with high-end PC' },
  { name: 'Room 133', kind: LocationKind.ROOM, description: 'Small podcasting studio' },
  { name: 'ZIL Store', kind: LocationKind.STORAGE, description: 'Main equipment storage' },
  { name: 'Upstairs Storage', kind: LocationKind.STORAGE, description: 'Secondary equipment storage' },
];

const assetTypes = [
  { name: 'Camera', prefix: 'CAM' },
  { name: 'Battery', prefix: 'BAT' },
  { name: 'SD Card', prefix: 'SDC' },
  { name: 'Tripod', prefix: 'TRP' },
  { name: 'Microphone', prefix: 'MIC' },
  { name: 'Cable', prefix: 'CBL' },
  { name: 'Light', prefix: 'LGT' },
  { name: 'Accessory', prefix: 'ACC' },
];

async function main() {
  for (const location of locations) {
    await prisma.location.upsert({
      where: { name: location.name },
      update: location,
      create: location,
    });
  }

  for (const assetType of assetTypes) {
    await prisma.assetType.upsert({
      where: { name: assetType.name },
      update: assetType,
      create: assetType,
    });
  }
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

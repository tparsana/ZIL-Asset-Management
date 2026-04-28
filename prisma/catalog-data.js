const { LocationKind } = require('@prisma/client');

const defaultLocations = [
  {
    name: 'Room 140',
    kind: LocationKind.ROOM,
    description: 'Large podcasting studio and green screen/backdrop shooting space',
  },
  {
    name: 'Room 135',
    kind: LocationKind.ROOM,
    description: 'Individual streaming/editing studio with high-end PC',
  },
  {
    name: 'Room 134',
    kind: LocationKind.ROOM,
    description: 'Individual streaming/editing studio with high-end PC',
  },
  {
    name: 'Room 133',
    kind: LocationKind.ROOM,
    description: 'Small podcasting studio',
  },
  {
    name: 'ZIL Store',
    kind: LocationKind.STORAGE,
    description: 'Main equipment storage',
  },
  {
    name: 'Upstairs Storage',
    kind: LocationKind.STORAGE,
    description: 'Secondary equipment storage',
  },
];

const defaultAssetTypes = [
  { name: 'Camera', prefix: 'CAM' },
  { name: 'Battery', prefix: 'BAT' },
  { name: 'SD Card', prefix: 'SDC' },
  { name: 'Tripod', prefix: 'TRP' },
  { name: 'Microphone', prefix: 'MIC' },
  { name: 'Cable', prefix: 'CBL' },
  { name: 'Light', prefix: 'LGT' },
  { name: 'Accessory', prefix: 'ACC' },
];

async function seedCatalog(prisma) {
  for (const location of defaultLocations) {
    await prisma.location.upsert({
      where: { name: location.name },
      update: location,
      create: location,
    });
  }

  for (const assetType of defaultAssetTypes) {
    await prisma.assetType.upsert({
      where: { name: assetType.name },
      update: assetType,
      create: assetType,
    });
  }
}

module.exports = {
  defaultLocations,
  defaultAssetTypes,
  seedCatalog,
};

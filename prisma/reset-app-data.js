const { PrismaClient } = require('@prisma/client');
const { seedCatalog } = require('./catalog-data');

const prisma = new PrismaClient();
const CONFIRM_RESET_VALUE = 'RESET_ZIL_ASSETS';

function hasResetConfirmation() {
  return process.argv.includes('--confirm') || process.env.CONFIRM_RESET === CONFIRM_RESET_VALUE;
}

async function main() {
  if (!hasResetConfirmation()) {
    console.error(
      `Reset blocked. Re-run with CONFIRM_RESET=${CONFIRM_RESET_VALUE} npm run prisma:reset-app-data`,
    );
    process.exit(1);
  }

  const summary = await prisma.$transaction(async (tx) => {
    const deletedAuditScans = await tx.auditScan.deleteMany();
    const deletedAssetEvents = await tx.assetEvent.deleteMany();
    const deletedAuditSessions = await tx.auditSession.deleteMany();
    const deletedAssets = await tx.asset.deleteMany();
    const deletedUsers = await tx.appUser.deleteMany();
    const deletedAssetTypes = await tx.assetType.deleteMany();
    const deletedLocations = await tx.location.deleteMany();

    await seedCatalog(tx);

    return {
      deletedAuditScans: deletedAuditScans.count,
      deletedAssetEvents: deletedAssetEvents.count,
      deletedAuditSessions: deletedAuditSessions.count,
      deletedAssets: deletedAssets.count,
      deletedUsers: deletedUsers.count,
      deletedAssetTypes: deletedAssetTypes.count,
      deletedLocations: deletedLocations.count,
      seededAssetTypes: await tx.assetType.count(),
      seededLocations: await tx.location.count(),
    };
  });

  console.log('Application data reset complete.');
  console.table(summary);
  console.log('The database is now back to launch state with only baseline locations and asset types seeded.');
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

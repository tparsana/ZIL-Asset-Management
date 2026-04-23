import { AssetStatus as DbAssetStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { eventInclude, toEvent } from '@/lib/services/mappers';
import { listLocationsWithCounts } from '@/lib/services/locations';

export async function getDashboardSummary() {
  const [totalAssets, available, inUse, missing, inRepair, recentActivity, locationSummary] = await Promise.all([
    prisma.asset.count({ where: { status: { not: DbAssetStatus.RETIRED } } }),
    prisma.asset.count({ where: { status: DbAssetStatus.AVAILABLE } }),
    prisma.asset.count({ where: { status: DbAssetStatus.IN_USE } }),
    prisma.asset.count({ where: { status: DbAssetStatus.MISSING } }),
    prisma.asset.count({ where: { status: DbAssetStatus.IN_REPAIR } }),
    prisma.assetEvent.findMany({
      include: eventInclude,
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    listLocationsWithCounts(),
  ]);

  return {
    totals: {
      totalAssets,
      available,
      inUse,
      missing,
      inRepair,
    },
    recentActivity: recentActivity.map(toEvent),
    locationSummary,
  };
}

import { AssetStatus as DbAssetStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { assetInclude, eventInclude, toAsset, toEvent, toLocation } from '@/lib/services/mappers';

export async function listLocationsWithCounts() {
  const locations = await prisma.location.findMany({
    orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    include: {
      currentAssets: {
        where: { status: { not: DbAssetStatus.RETIRED } },
        include: {
          assetType: true,
          homeLocation: true,
          currentLocation: true,
        },
        orderBy: { assetId: 'asc' },
      },
    },
  });

  return locations.map((location) => {
    const base = toLocation(location);
    return {
      ...base,
      assetCount: location.currentAssets.length,
      availableCount: location.currentAssets.filter((asset) => asset.status === DbAssetStatus.AVAILABLE).length,
      inUseCount: location.currentAssets.filter((asset) => asset.status === DbAssetStatus.IN_USE).length,
      missingCount: location.currentAssets.filter((asset) => asset.status === DbAssetStatus.MISSING).length,
      inRepairCount: location.currentAssets.filter((asset) => asset.status === DbAssetStatus.IN_REPAIR).length,
      awayFromHomeCount: location.currentAssets.filter((asset) => asset.currentLocationId !== asset.homeLocationId).length,
      currentAssets: location.currentAssets.map(toAsset).map((asset) => ({
        id: asset.id,
        assetId: asset.assetId,
        name: asset.name,
        status: asset.status,
        referenceImageUrl: asset.referenceImageUrl,
      })),
    };
  });
}

export async function getLocationDetails(id: string) {
  const location = await prisma.location.findFirst({
    where: { OR: [{ id }, { name: id }] },
    include: {
      currentAssets: {
        where: { status: { not: DbAssetStatus.RETIRED } },
        include: assetInclude,
        orderBy: { assetId: 'asc' },
      },
    },
  });

  if (!location) return null;

  const recentActivity = await prisma.assetEvent.findMany({
    where: {
      OR: [{ fromLocationId: location.id }, { toLocationId: location.id }],
    },
    include: eventInclude,
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const currentAssets = location.currentAssets.map(toAsset);

  return {
    location: toLocation(location),
    currentAssets,
    awayFromHomeAssets: currentAssets.filter((asset) => asset.currentLocationId !== asset.homeLocationId),
    recentActivity: recentActivity.map(toEvent),
  };
}

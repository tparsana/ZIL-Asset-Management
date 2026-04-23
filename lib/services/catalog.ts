import { LocationKind } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { toLocation } from '@/lib/services/mappers';

export class CatalogError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function listAssetTypes() {
  const assetTypes = await prisma.assetType.findMany({
    orderBy: { name: 'asc' },
  });

  return assetTypes.map((assetType) => ({
    id: assetType.id,
    name: assetType.name,
    prefix: assetType.prefix,
    description: assetType.description,
  }));
}

export async function listUsers() {
  return prisma.appUser.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function createAssetType(input: { name: string; prefix: string; description?: string }) {
  return prisma.assetType.create({
    data: {
      name: input.name.trim(),
      prefix: input.prefix.trim().toUpperCase(),
      description: input.description?.trim() || undefined,
    },
  });
}

export async function updateAssetType(id: string, input: { name: string; prefix: string; description?: string }) {
  const existing = await prisma.assetType.findUnique({ where: { id } });
  if (!existing) throw new CatalogError('Asset type not found', 404);

  return prisma.assetType.update({
    where: { id },
    data: {
      name: input.name.trim(),
      prefix: input.prefix.trim().toUpperCase(),
      description: input.description?.trim() || null,
    },
  });
}

export async function deleteAssetType(id: string) {
  const assetsUsingType = await prisma.asset.count({ where: { assetTypeId: id } });
  if (assetsUsingType > 0) {
    throw new CatalogError('Asset types used by assets cannot be deleted. Rename it instead.');
  }

  return prisma.assetType.delete({ where: { id } });
}

export async function createLocation(input: { name: string; kind: 'room' | 'storage'; description?: string }) {
  const location = await prisma.location.create({
    data: {
      name: input.name.trim(),
      kind: input.kind === 'room' ? LocationKind.ROOM : LocationKind.STORAGE,
      description: input.description?.trim() || undefined,
    },
  });
  return toLocation(location);
}

export async function updateLocation(input: { id: string; name: string; kind: 'room' | 'storage'; description?: string }) {
  const existing = await prisma.location.findUnique({ where: { id: input.id } });
  if (!existing) throw new CatalogError('Location not found', 404);

  const location = await prisma.location.update({
    where: { id: input.id },
    data: {
      name: input.name.trim(),
      kind: input.kind === 'room' ? LocationKind.ROOM : LocationKind.STORAGE,
      description: input.description?.trim() || null,
    },
  });

  return toLocation(location);
}

export async function deleteLocation(id: string) {
  const [homeAssets, currentAssets, eventsFrom, eventsTo, auditSessions] = await Promise.all([
    prisma.asset.count({ where: { homeLocationId: id } }),
    prisma.asset.count({ where: { currentLocationId: id } }),
    prisma.assetEvent.count({ where: { fromLocationId: id } }),
    prisma.assetEvent.count({ where: { toLocationId: id } }),
    prisma.auditSession.count({ where: { locationId: id } }),
  ]);

  if (homeAssets + currentAssets + eventsFrom + eventsTo + auditSessions > 0) {
    throw new CatalogError('Locations used by assets, events, or audits cannot be deleted. Rename it instead.');
  }

  const location = await prisma.location.delete({ where: { id } });
  return toLocation(location);
}

export async function createUser(input: { name: string; email?: string }) {
  return prisma.appUser.create({
    data: {
      name: input.name.trim(),
      email: input.email?.trim() || undefined,
    },
  });
}

export async function updateUser(id: string, input: { name: string; email?: string }) {
  const existing = await prisma.appUser.findUnique({ where: { id } });
  if (!existing) throw new CatalogError('User not found', 404);

  return prisma.appUser.update({
    where: { id },
    data: {
      name: input.name.trim(),
      email: input.email?.trim() || null,
    },
  });
}

export async function deleteUser(id: string) {
  const existing = await prisma.appUser.findUnique({ where: { id } });
  if (!existing) throw new CatalogError('User not found', 404);

  return prisma.appUser.update({
    where: { id },
    data: { isActive: false },
  });
}

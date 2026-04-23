import { AssetEventType, AssetStatus as DbAssetStatus, Prisma, type PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import type { AssetStatus } from '@/lib/types';
import {
  assetInclude,
  dbStatusByApi,
  toAsset,
  type AssetRecord,
} from '@/lib/services/mappers';
import type { z } from 'zod';
import type {
  assetActionSchema,
  createAssetSchema,
  listAssetsSchema,
  updateAssetSchema,
} from '@/lib/validators/assets';

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
const TEMP_USE_ROOM_NAMES = new Set(['Room 133', 'Room 134', 'Room 135', 'Room 140']);

function normalizeAssetId(assetId: string) {
  return assetId.trim().toUpperCase();
}

async function generateAssetId(tx: Tx, assetTypeId: string) {
  const assetType = await tx.assetType.findUniqueOrThrow({
    where: { id: assetTypeId },
    select: { prefix: true },
  });
  const prefix = assetType.prefix.toUpperCase();
  const existing = await tx.asset.findMany({
    where: { assetId: { startsWith: `${prefix}-` } },
    select: { assetId: true },
  });

  const nextNumber =
    existing.reduce((max, asset) => {
      const match = asset.assetId.match(new RegExp(`^${prefix}-(\\d+)$`));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

  return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
}

function dataFromCreateInput(input: z.infer<typeof createAssetSchema>, assetId: string) {
  return {
    assetId,
    name: input.name,
    assetTypeId: input.assetTypeId,
    serialNumber: input.serialNumber,
    purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : undefined,
    cost: input.cost === undefined ? undefined : new Prisma.Decimal(input.cost),
    consumable: input.consumable,
    homeLocationId: input.homeLocationId,
    currentLocationId: input.currentLocationId,
    status: dbStatusByApi[input.status],
    notes: input.notes,
    referenceImageUrl: input.referenceImageUrl,
  };
}

export async function listAssets(filters: z.infer<typeof listAssetsSchema>) {
  const where: Prisma.AssetWhereInput = filters.status ? {} : { status: { not: DbAssetStatus.RETIRED } };

  if (filters.assetTypeId) where.assetTypeId = filters.assetTypeId;
  if (filters.status) where.status = dbStatusByApi[filters.status];
  if (filters.currentLocationId) where.currentLocationId = filters.currentLocationId;
  if (filters.homeLocationId) where.homeLocationId = filters.homeLocationId;
  if (filters.consumable !== undefined) where.consumable = filters.consumable;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { assetId: { contains: filters.search, mode: 'insensitive' } },
      { serialNumber: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const assets = await prisma.asset.findMany({
    where,
    include: assetInclude,
    orderBy: [{ status: 'asc' }, { assetId: 'asc' }],
  });

  return assets.map(toAsset);
}

export async function getAssetById(id: string) {
  const asset = await prisma.asset.findFirst({
    where: {
      OR: [{ id }, { assetId: id.toUpperCase() }],
    },
    include: assetInclude,
  });
  return asset ? toAsset(asset) : null;
}

export async function getAssetByQrToken(qrCodeToken: string) {
  const asset = await prisma.asset.findUnique({
    where: { qrCodeToken },
    include: assetInclude,
  });
  return asset ? toAsset(asset) : null;
}

export async function getAssetRecordById(tx: Tx, id: string): Promise<AssetRecord | null> {
  return tx.asset.findFirst({
    where: {
      OR: [{ id }, { assetId: id.toUpperCase() }],
    },
    include: assetInclude,
  });
}

export async function createAsset(input: z.infer<typeof createAssetSchema>) {
  return prisma.$transaction(async (tx) => {
    const assetId = input.assetId ? normalizeAssetId(input.assetId) : await generateAssetId(tx, input.assetTypeId);
    const asset = await tx.asset.create({
      data: dataFromCreateInput(input, assetId),
      include: assetInclude,
    });

    await tx.assetEvent.create({
      data: {
        assetId: asset.id,
        eventType: AssetEventType.ASSET_CREATED,
        toLocationId: asset.currentLocationId,
        newStatus: asset.status,
        handledBy: input.handledBy,
        remarks: 'Asset created',
      },
    });

    return toAsset(asset);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updateAsset(id: string, input: z.infer<typeof updateAssetSchema>) {
  return prisma.$transaction(async (tx) => {
    const current = await getAssetRecordById(tx, id);
    if (!current) return null;

    const nextData: Prisma.AssetUpdateInput = {
      assetId: input.assetId ? normalizeAssetId(input.assetId) : undefined,
      name: input.name,
      serialNumber: input.serialNumber,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : undefined,
      cost: input.cost === undefined ? undefined : new Prisma.Decimal(input.cost),
      consumable: input.consumable,
      notes: input.notes,
      referenceImageUrl: input.referenceImageUrl,
    };

    if (input.assetTypeId) nextData.assetType = { connect: { id: input.assetTypeId } };
    if (input.homeLocationId) nextData.homeLocation = { connect: { id: input.homeLocationId } };
    if (input.currentLocationId) nextData.currentLocation = { connect: { id: input.currentLocationId } };
    if (input.status) nextData.status = dbStatusByApi[input.status];

    const asset = await tx.asset.update({
      where: { id: current.id },
      data: nextData,
      include: assetInclude,
    });

    await tx.assetEvent.create({
      data: {
        assetId: asset.id,
        eventType: AssetEventType.ASSET_UPDATED,
        fromLocationId: current.currentLocationId,
        toLocationId: asset.currentLocationId,
        previousStatus: current.status,
        newStatus: asset.status,
        handledBy: input.handledBy,
        remarks: 'Asset updated',
      },
    });

    return toAsset(asset);
  });
}

export async function regenerateAssetQrCode(id: string, handledBy?: string) {
  return prisma.$transaction(async (tx) => {
    const current = await getAssetRecordById(tx, id);
    if (!current) return null;

    const asset = await tx.asset.update({
      where: { id: current.id },
      data: {
        qrCodeToken: `qr_${randomUUID().replaceAll('-', '')}`,
        qrCodeGeneratedAt: new Date(),
      },
      include: assetInclude,
    });

    await tx.assetEvent.create({
      data: {
        assetId: asset.id,
        eventType: AssetEventType.ASSET_UPDATED,
        fromLocationId: current.currentLocationId,
        toLocationId: current.currentLocationId,
        previousStatus: current.status,
        newStatus: current.status,
        handledBy,
        remarks: 'QR code regenerated',
        metadata: { qrCodeRegenerated: true },
      },
    });

    return toAsset(asset);
  });
}

function actionToEventType(action: z.infer<typeof assetActionSchema>['action']) {
  if (action === 'checkout') return AssetEventType.CHECKED_OUT;
  if (action === 'return') return AssetEventType.RETURNED;
  if (action === 'move') return AssetEventType.MOVED;
  if (action === 'missing') return AssetEventType.MARKED_MISSING;
  if (action === 'in-repair') return AssetEventType.MARKED_IN_REPAIR;
  if (action === 'available') return AssetEventType.RESTORED_TO_AVAILABLE;
  return AssetEventType.RETIRED;
}

function nextStateForAction(
  action: z.infer<typeof assetActionSchema>['action'],
  asset: AssetRecord,
  toLocationId?: string,
): { status: DbAssetStatus; currentLocationId: string } {
  if (action === 'checkout') return { status: DbAssetStatus.IN_USE, currentLocationId: toLocationId ?? asset.currentLocationId };
  if (action === 'return') return { status: DbAssetStatus.AVAILABLE, currentLocationId: asset.homeLocationId };
  if (action === 'move') return { status: asset.status, currentLocationId: toLocationId ?? asset.currentLocationId };
  if (action === 'missing') return { status: DbAssetStatus.MISSING, currentLocationId: asset.currentLocationId };
  if (action === 'in-repair') return { status: DbAssetStatus.IN_REPAIR, currentLocationId: toLocationId ?? asset.currentLocationId };
  if (action === 'available') return { status: DbAssetStatus.AVAILABLE, currentLocationId: toLocationId ?? asset.currentLocationId };
  return { status: DbAssetStatus.RETIRED, currentLocationId: asset.currentLocationId };
}

export async function applyAssetAction(id: string, input: z.infer<typeof assetActionSchema>) {
  return prisma.$transaction(async (tx) => {
    const current = await getAssetRecordById(tx, id);
    if (!current) return null;

    if ((input.action === 'checkout' || input.action === 'move') && !input.toLocationId) {
      throw new Error('Destination location is required');
    }

    if (input.action === 'checkout') {
      if (current.status !== DbAssetStatus.AVAILABLE) {
        throw new Error('Only available assets can be checked out from the scan workflow');
      }

      const location = await tx.location.findUnique({
        where: { id: input.toLocationId },
        select: { id: true, name: true },
      });

      if (!location || !TEMP_USE_ROOM_NAMES.has(location.name)) {
        throw new Error('Check out requires one of Room 133, Room 134, Room 135, or Room 140');
      }
    }

    if (input.action === 'return' && current.status !== DbAssetStatus.IN_USE) {
      throw new Error('Only in-use assets can be returned from the scan workflow');
    }

    const nextState = nextStateForAction(input.action, current, input.toLocationId);
    const asset = await tx.asset.update({
      where: { id: current.id },
      data: nextState,
      include: assetInclude,
    });

    await tx.assetEvent.create({
      data: {
        assetId: asset.id,
        eventType: actionToEventType(input.action),
        fromLocationId: current.currentLocationId,
        toLocationId: asset.currentLocationId,
        previousStatus: current.status,
        newStatus: asset.status,
        handledBy: input.handledBy,
        remarks: input.remarks,
      },
    });

    return toAsset(asset);
  });
}

export async function applyBatchAction(input: {
  assetIds: string[];
  action: 'checkout' | 'return';
  toLocationId?: string;
  handledBy?: string;
  remarks?: string;
}) {
  const results = [];
  for (const assetId of input.assetIds) {
    const result = await applyAssetAction(assetId, {
      action: input.action,
      toLocationId: input.toLocationId,
      handledBy: input.handledBy,
      remarks: input.remarks,
    });
    if (result) results.push(result);
  }
  return results;
}

export async function retireAsset(id: string, handledBy?: string) {
  return applyAssetAction(id, { action: 'retire', handledBy, remarks: 'Asset retired' });
}

export function statusLabel(status: AssetStatus) {
  if (status === 'in-use') return 'In Use';
  if (status === 'in-repair') return 'In Repair';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

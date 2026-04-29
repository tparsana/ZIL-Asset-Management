import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { eventInclude, toEvent } from '@/lib/services/mappers';
import type { z } from 'zod';
import type { listEventsSchema } from '@/lib/validators/assets';

export async function listEvents(filters: z.infer<typeof listEventsSchema>) {
  const where: Prisma.AssetEventWhereInput = {};
  const andClauses: Prisma.AssetEventWhereInput[] = [];

  if (filters.assetId) {
    andClauses.push({
      OR: [
        {
          asset: {
            OR: [
              { id: filters.assetId },
              { assetId: { contains: filters.assetId, mode: 'insensitive' } },
              { name: { contains: filters.assetId, mode: 'insensitive' } },
            ],
          },
        },
        {
          metadata: {
            path: ['deletedAssetSnapshot', 'assetId'],
            string_contains: filters.assetId,
          },
        },
        {
          metadata: {
            path: ['deletedAssetSnapshot', 'name'],
            string_contains: filters.assetId,
          },
        },
      ],
    });
  }

  if (filters.eventType === 'asset-deleted') {
    andClauses.push({
      eventType: 'RETIRED',
      metadata: {
        path: ['assetDeleted'],
        equals: true,
      },
    });
  } else if (filters.eventType === 'retired') {
    andClauses.push({
      eventType: 'RETIRED',
      NOT: {
        metadata: {
          path: ['assetDeleted'],
          equals: true,
        },
      },
    });
  } else if (filters.eventType) {
    const dbEventByApi = (() => {
      switch (filters.eventType) {
        case 'asset-created':
          return 'ASSET_CREATED' as const;
        case 'asset-updated':
          return 'ASSET_UPDATED' as const;
        case 'moved':
          return 'MOVED' as const;
        case 'checked-out':
          return 'CHECKED_OUT' as const;
        case 'returned':
          return 'RETURNED' as const;
        case 'marked-missing':
          return 'MARKED_MISSING' as const;
        case 'marked-in-repair':
          return 'MARKED_IN_REPAIR' as const;
        case 'restored-to-available':
          return 'RESTORED_TO_AVAILABLE' as const;
        case 'audit-started':
          return 'AUDIT_STARTED' as const;
        case 'audit-scanned':
          return 'AUDIT_SCANNED' as const;
        case 'audit-completed':
          return 'AUDIT_COMPLETED' as const;
        default:
          return 'RETIRED' as const;
      }
    })();

    andClauses.push({ eventType: dbEventByApi });
  }

  if (filters.handledBy) where.handledBy = { contains: filters.handledBy, mode: 'insensitive' };
  if (filters.locationId) {
    andClauses.push({ OR: [{ fromLocationId: filters.locationId }, { toLocationId: filters.locationId }] });
  }
  if (filters.fromDate || filters.toDate) {
    where.createdAt = {
      gte: filters.fromDate ? new Date(filters.fromDate) : undefined,
      lte: filters.toDate ? new Date(filters.toDate) : undefined,
    };
  }
  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  const events = await prisma.assetEvent.findMany({
    where,
    include: eventInclude,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return events.map(toEvent);
}

export async function listEventsForAsset(assetId: string) {
  const events = await prisma.assetEvent.findMany({
    where: {
      OR: [
        {
          asset: {
            OR: [{ id: assetId }, { assetId: assetId.toUpperCase() }],
          },
        },
        {
          metadata: {
            path: ['deletedAssetId'],
            equals: assetId,
          },
        },
      ],
    },
    include: eventInclude,
    orderBy: { createdAt: 'desc' },
  });

  return events.map(toEvent);
}

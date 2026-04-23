import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { dbEventByApi, eventInclude, toEvent } from '@/lib/services/mappers';
import type { z } from 'zod';
import type { listEventsSchema } from '@/lib/validators/assets';

export async function listEvents(filters: z.infer<typeof listEventsSchema>) {
  const where: Prisma.AssetEventWhereInput = {};

  if (filters.assetId) {
    where.asset = {
      OR: [
        { id: filters.assetId },
        { assetId: { contains: filters.assetId, mode: 'insensitive' } },
        { name: { contains: filters.assetId, mode: 'insensitive' } },
      ],
    };
  }
  if (filters.eventType) where.eventType = dbEventByApi[filters.eventType];
  if (filters.handledBy) where.handledBy = { contains: filters.handledBy, mode: 'insensitive' };
  if (filters.locationId) {
    where.OR = [{ fromLocationId: filters.locationId }, { toLocationId: filters.locationId }];
  }
  if (filters.fromDate || filters.toDate) {
    where.createdAt = {
      gte: filters.fromDate ? new Date(filters.fromDate) : undefined,
      lte: filters.toDate ? new Date(filters.toDate) : undefined,
    };
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
      asset: {
        OR: [{ id: assetId }, { assetId: assetId.toUpperCase() }],
      },
    },
    include: eventInclude,
    orderBy: { createdAt: 'desc' },
  });

  return events.map(toEvent);
}

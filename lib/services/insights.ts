import {
  AssetEventType,
  AssetStatus as DbAssetStatus,
  AuditStatus as DbAuditStatus,
  type Prisma,
} from '@prisma/client';
import {
  differenceInHours,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { prisma } from '@/lib/db/prisma';
import {
  DEFAULT_INSIGHTS_GRANULARITY,
  DEFAULT_INSIGHTS_RANGE_DAYS,
  KEY_USAGE_CATEGORIES,
  LOW_STOCK_THRESHOLDS,
  OVERDUE_CHECKOUT_HOURS,
  RETURN_COMPLIANCE_TARGET_HOURS,
} from '@/lib/insights/config';
import type {
  InsightAverageDurationAsset,
  InsightCategoryTrendPoint,
  InsightCheckoutReturnTrendPoint,
  InsightEventTypeBreakdown,
  InsightLowStockItem,
  InsightMetric,
  InsightOverdueAsset,
  InsightRecommendation,
  InsightRoomCheckout,
  InsightRoomTypeDemandCell,
  InsightTypeStatusBreakdown,
  InsightUsageAsset,
  InsightUsageType,
  InsightsCirculationHealth,
  InsightsFilters,
  InsightsGranularity,
  InsightsInventoryPressure,
  InsightsOverview,
  InsightsResponse,
  InsightsRiskInsights,
  InsightsRoomDemand,
  InsightsUsagePatterns,
} from '@/lib/insights/types';
import type { Asset, AssetStatus, EventType } from '@/lib/types';
import { isDeletedAssetEvent } from '@/lib/event-display';
import { formatEventType } from '@/lib/format';
import { assetInclude, toAsset, toLocation } from '@/lib/services/mappers';
import { getAuditSummary } from '@/lib/services/audits';

const insightEventInclude = {
  asset: {
    select: {
      id: true,
      assetId: true,
      name: true,
      assetTypeId: true,
      status: true,
      currentLocationId: true,
      homeLocationId: true,
      assetType: {
        select: {
          id: true,
          name: true,
          prefix: true,
        },
      },
      currentLocation: true,
      homeLocation: true,
    },
  },
  fromLocation: true,
  toLocation: true,
} satisfies Prisma.AssetEventInclude;

type InsightEventRecord = Prisma.AssetEventGetPayload<{ include: typeof insightEventInclude }>;
type InsightAuditSessionRecord = Prisma.AuditSessionGetPayload<{ include: { location: true } }>;
type NormalizedInsightsFilters = InsightsFilters & {
  from: Date;
  to: Date;
};
type InsightsContext = {
  filters: NormalizedInsightsFilters;
  options: InsightsResponse['options'];
  activeAssets: Asset[];
  periodEvents: InsightEventRecord[];
  durationEvents: InsightEventRecord[];
  completedAuditSessions: InsightAuditSessionRecord[];
};
type CheckoutPair = {
  assetId: string;
  assetName: string;
  assetCode: string;
  assetTypeName: string;
  checkoutAt: Date;
  returnAt: Date;
  durationHours: number;
  checkoutLocationId?: string | null;
  checkoutLocationName?: string | null;
};
type OpenCheckout = {
  assetId: string;
  assetName: string;
  assetCode: string;
  assetTypeName: string;
  checkoutAt: Date;
  checkoutLocationId?: string | null;
  checkoutLocationName?: string | null;
  handledBy?: string | null;
};

function parseDateInput(value?: string) {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

function normalizeInsightsFilters(input: Partial<InsightsFilters>): NormalizedInsightsFilters {
  const today = new Date();
  const to = endOfDay(parseDateInput(input.toDate) ?? today);
  const from = startOfDay(parseDateInput(input.fromDate) ?? subDays(to, DEFAULT_INSIGHTS_RANGE_DAYS - 1));

  const granularity = input.granularity ?? DEFAULT_INSIGHTS_GRANULARITY;

  return {
    fromDate: format(from, 'yyyy-MM-dd'),
    toDate: format(to, 'yyyy-MM-dd'),
    granularity,
    locationId: input.locationId,
    assetTypeId: input.assetTypeId,
    from,
    to,
  };
}

function buildActiveAssetWhere(filters: NormalizedInsightsFilters): Prisma.AssetWhereInput {
  const where: Prisma.AssetWhereInput = {
    status: { not: DbAssetStatus.RETIRED },
  };

  if (filters.assetTypeId) where.assetTypeId = filters.assetTypeId;
  if (filters.locationId) {
    where.OR = [
      { currentLocationId: filters.locationId },
      { homeLocationId: filters.locationId },
    ];
  }

  return where;
}

function formatCountMetric(value: number, description: string, status: InsightMetric['status'] = 'default'): InsightMetric {
  return {
    value: value.toLocaleString(),
    rawValue: value,
    description,
    status,
  };
}

function formatDurationHours(hours: number | null | undefined) {
  if (hours == null || Number.isNaN(hours)) return 'Not enough data yet';
  if (hours >= 24) return `${(hours / 24).toFixed(1)}d`;
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  return `${Math.max(hours * 60, 1).toFixed(0)}m`;
}

function getLowStockThreshold(assetTypeName: string) {
  const exact = LOW_STOCK_THRESHOLDS[assetTypeName];
  if (exact !== undefined) return exact;

  const partial = Object.entries(LOW_STOCK_THRESHOLDS).find(([key]) =>
    key !== 'default' && assetTypeName.toLowerCase().includes(key.toLowerCase()),
  );

  return partial?.[1] ?? LOW_STOCK_THRESHOLDS.default;
}

function getBucketStart(date: Date, granularity: InsightsGranularity) {
  if (granularity === 'day') return startOfDay(date);
  if (granularity === 'week') return startOfWeek(date, { weekStartsOn: 1 });
  return startOfMonth(date);
}

function getBucketKey(date: Date, granularity: InsightsGranularity) {
  return format(getBucketStart(date, granularity), 'yyyy-MM-dd');
}

function getBucketLabel(date: Date, granularity: InsightsGranularity) {
  if (granularity === 'day') return format(date, 'MMM d');
  if (granularity === 'week') return `Week of ${format(date, 'MMM d')}`;
  return format(date, 'MMM yyyy');
}

function buildBucketTemplate(filters: NormalizedInsightsFilters) {
  const bucketStarts =
    filters.granularity === 'day'
      ? eachDayOfInterval({ start: filters.from, end: filters.to })
      : filters.granularity === 'week'
        ? eachWeekOfInterval({ start: filters.from, end: filters.to }, { weekStartsOn: 1 })
        : eachMonthOfInterval({ start: filters.from, end: filters.to });

  return bucketStarts.map((bucketDate) => ({
    bucketKey: format(bucketDate, 'yyyy-MM-dd'),
    label: getBucketLabel(bucketDate, filters.granularity),
  }));
}

function matchesCheckoutLocation(event: InsightEventRecord, locationId?: string) {
  if (!locationId) return true;
  return event.toLocationId === locationId;
}

function matchesReturnLocation(event: InsightEventRecord, locationId?: string) {
  if (!locationId) return true;
  return event.fromLocationId === locationId;
}

function eventTouchesLocation(event: InsightEventRecord, locationId?: string) {
  if (!locationId) return true;
  return event.fromLocationId === locationId || event.toLocationId === locationId;
}

function isRoomDestination(event: InsightEventRecord) {
  return event.toLocation?.kind === 'ROOM';
}

function incrementCount(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function mapDbEventTypeToEventType(eventType: AssetEventType, metadata?: Prisma.JsonValue | null) {
  if (eventType === AssetEventType.RETIRED && isDeletedAssetEvent(metadata)) {
    return 'asset-deleted' as const;
  }

  switch (eventType) {
    case AssetEventType.ASSET_CREATED:
      return 'asset-created' as const;
    case AssetEventType.ASSET_UPDATED:
      return 'asset-updated' as const;
    case AssetEventType.MOVED:
      return 'moved' as const;
    case AssetEventType.CHECKED_OUT:
      return 'checked-out' as const;
    case AssetEventType.RETURNED:
      return 'returned' as const;
    case AssetEventType.MARKED_MISSING:
      return 'marked-missing' as const;
    case AssetEventType.MARKED_IN_REPAIR:
      return 'marked-in-repair' as const;
    case AssetEventType.RESTORED_TO_AVAILABLE:
      return 'restored-to-available' as const;
    case AssetEventType.RETIRED:
      return 'retired' as const;
    case AssetEventType.AUDIT_STARTED:
      return 'audit-started' as const;
    case AssetEventType.AUDIT_SCANNED:
      return 'audit-scanned' as const;
    case AssetEventType.AUDIT_COMPLETED:
      return 'audit-completed' as const;
  }
}

function buildCheckoutPairs(events: InsightEventRecord[]) {
  const byAsset = new Map<string, InsightEventRecord[]>();

  for (const event of events) {
    if (!event.assetId || !event.asset) continue;
    const current = byAsset.get(event.assetId) ?? [];
    current.push(event);
    byAsset.set(event.assetId, current);
  }

  const completedPairs: CheckoutPair[] = [];
  const openCheckouts: OpenCheckout[] = [];

  for (const [assetId, assetEvents] of byAsset.entries()) {
    const orderedEvents = [...assetEvents].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    const queue: InsightEventRecord[] = [];

    for (const event of orderedEvents) {
      if (!event.asset) continue;

      if (event.eventType === AssetEventType.CHECKED_OUT) {
        queue.push(event);
      }

      if (event.eventType === AssetEventType.RETURNED && queue.length > 0) {
        const checkoutEvent = queue.shift();
        if (!checkoutEvent?.asset) continue;

        completedPairs.push({
          assetId,
          assetName: checkoutEvent.asset.name,
          assetCode: checkoutEvent.asset.assetId,
          assetTypeName: checkoutEvent.asset.assetType.name,
          checkoutAt: checkoutEvent.createdAt,
          returnAt: event.createdAt,
          durationHours: differenceInHours(event.createdAt, checkoutEvent.createdAt),
          checkoutLocationId: checkoutEvent.toLocationId,
          checkoutLocationName: checkoutEvent.toLocation?.name ?? null,
        });
      }
    }

    for (const checkoutEvent of queue) {
      if (!checkoutEvent.asset) continue;

      openCheckouts.push({
        assetId,
        assetName: checkoutEvent.asset.name,
        assetCode: checkoutEvent.asset.assetId,
        assetTypeName: checkoutEvent.asset.assetType.name,
        checkoutAt: checkoutEvent.createdAt,
        checkoutLocationId: checkoutEvent.toLocationId,
        checkoutLocationName: checkoutEvent.toLocation?.name ?? null,
        handledBy: checkoutEvent.handledBy,
      });
    }
  }

  return {
    completedPairs,
    openCheckouts,
  };
}

async function loadInsightsContext(filters: NormalizedInsightsFilters): Promise<InsightsContext> {
  const [assetTypes, locations, assets, periodEvents, durationEvents, completedAuditSessions] = await Promise.all([
    prisma.assetType.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, prefix: true },
    }),
    prisma.location.findMany({
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, kind: true, description: true },
    }),
    prisma.asset.findMany({
      where: buildActiveAssetWhere(filters),
      include: assetInclude,
      orderBy: { assetId: 'asc' },
    }),
    prisma.assetEvent.findMany({
      where: {
        createdAt: { gte: filters.from, lte: filters.to },
        asset: filters.assetTypeId ? { assetTypeId: filters.assetTypeId } : undefined,
      },
      include: insightEventInclude,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.assetEvent.findMany({
      where: {
        createdAt: { lte: filters.to },
        eventType: { in: [AssetEventType.CHECKED_OUT, AssetEventType.RETURNED] },
        asset: filters.assetTypeId ? { assetTypeId: filters.assetTypeId } : undefined,
      },
      include: insightEventInclude,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.auditSession.findMany({
      where: {
        status: DbAuditStatus.COMPLETED,
        completedAt: { gte: filters.from, lte: filters.to },
        ...(filters.locationId ? { locationId: filters.locationId } : {}),
      },
      include: { location: true },
      orderBy: { completedAt: 'desc' },
    }),
  ]);

  return {
    filters,
    options: {
      locations: locations.map((location) => {
        const mapped = toLocation(location);
        return { id: mapped.id, name: mapped.name, kind: mapped.kind };
      }),
      assetTypes,
    },
    activeAssets: assets.map(toAsset),
    periodEvents,
    durationEvents,
    completedAuditSessions,
  };
}

export function getInsightsOverview(context: InsightsContext): InsightsOverview {
  const { activeAssets, periodEvents, durationEvents, filters } = context;
  const checkoutEvents = periodEvents.filter(
    (event) => event.eventType === AssetEventType.CHECKED_OUT && matchesCheckoutLocation(event, filters.locationId),
  );
  const roomCounts = new Map<string, InsightRoomCheckout>();
  const assetCounts = new Map<string, InsightUsageAsset>();

  for (const event of checkoutEvents) {
    if (event.asset) {
      assetCounts.set(event.asset.id, {
        assetId: event.asset.assetId,
        name: event.asset.name,
        assetTypeName: event.asset.assetType.name,
        checkoutCount: (assetCounts.get(event.asset.id)?.checkoutCount ?? 0) + 1,
      });
    }

    if (event.toLocation && isRoomDestination(event)) {
      const current = roomCounts.get(event.toLocation.id);
      roomCounts.set(event.toLocation.id, {
        locationId: event.toLocation.id,
        roomName: event.toLocation.name,
        checkoutCount: (current?.checkoutCount ?? 0) + 1,
      });
    }
  }

  const mostUsedAsset = [...assetCounts.values()].sort((left, right) => right.checkoutCount - left.checkoutCount)[0] ?? null;
  const mostUsedRoom = [...roomCounts.values()].sort((left, right) => right.checkoutCount - left.checkoutCount)[0] ?? null;
  const { completedPairs } = buildCheckoutPairs(durationEvents);
  const filteredPairs = completedPairs.filter(
    (pair) =>
      pair.checkoutAt >= filters.from &&
      pair.checkoutAt <= filters.to &&
      (!filters.locationId || pair.checkoutLocationId === filters.locationId),
  );
  const averageDurationHours = filteredPairs.length > 0
    ? filteredPairs.reduce((sum, pair) => sum + pair.durationHours, 0) / filteredPairs.length
    : null;

  const lowStockWatchlist = getInventoryPressureInsights(context).lowStockWatchlist;

  return {
    totalAssets: formatCountMetric(activeAssets.length, 'Active tracked assets'),
    totalCheckouts: formatCountMetric(checkoutEvents.length, 'Checkout events in the selected period', 'info'),
    mostUsedAsset: mostUsedAsset
      ? {
          value: mostUsedAsset.name,
          rawValue: mostUsedAsset.checkoutCount,
          description: `${mostUsedAsset.assetId} · ${mostUsedAsset.checkoutCount} checkout${mostUsedAsset.checkoutCount === 1 ? '' : 's'}`,
          status: 'info',
          asset: {
            assetId: mostUsedAsset.assetId,
            name: mostUsedAsset.name,
            checkoutCount: mostUsedAsset.checkoutCount,
          },
        }
      : {
          value: 'Not enough data yet',
          description: 'Checkout activity will surface top assets here.',
          status: 'default',
          asset: null,
        },
    mostUsedRoom: mostUsedRoom
      ? {
          value: mostUsedRoom.roomName,
          rawValue: mostUsedRoom.checkoutCount,
          description: `${mostUsedRoom.checkoutCount} checkout${mostUsedRoom.checkoutCount === 1 ? '' : 's'} to this room`,
          status: 'warning',
          room: {
            locationId: mostUsedRoom.locationId,
            name: mostUsedRoom.roomName,
            checkoutCount: mostUsedRoom.checkoutCount,
          },
        }
      : {
          value: 'Not enough data yet',
          description: 'Room demand will appear once checkouts are recorded.',
          status: 'default',
          room: null,
        },
    averageCheckoutDuration: {
      value: formatDurationHours(averageDurationHours),
      rawValue: averageDurationHours,
      description: filteredPairs.length > 0 ? 'Average time between checkout and return' : 'Need matched checkout and return events',
      status: averageDurationHours && averageDurationHours > OVERDUE_CHECKOUT_HOURS ? 'warning' : 'default',
    },
    itemsCurrentlyInUse: formatCountMetric(
      activeAssets.filter((asset) => asset.status === 'in-use').length,
      'Items currently checked out',
      'info',
    ),
    missingUnresolvedItems: formatCountMetric(
      activeAssets.filter((asset) => asset.status === 'missing').length,
      'Assets currently marked missing',
      activeAssets.some((asset) => asset.status === 'missing') ? 'danger' : 'default',
    ),
    lowStockWatchlistCount: formatCountMetric(
      lowStockWatchlist.length,
      'Asset categories at or below threshold',
      lowStockWatchlist.length > 0 ? 'warning' : 'success',
    ),
  };
}

export function getUsageInsights(context: InsightsContext): InsightsUsagePatterns {
  const { activeAssets, periodEvents, filters } = context;
  const checkoutEvents = periodEvents.filter(
    (event) => event.eventType === AssetEventType.CHECKED_OUT && matchesCheckoutLocation(event, filters.locationId),
  );

  const assetCounts = new Map<string, InsightUsageAsset>();
  const typeCounts = new Map<string, InsightUsageType>();
  const checkoutCountByAssetId = new Map<string, number>();

  for (const event of checkoutEvents) {
    if (!event.asset) continue;

    incrementCount(checkoutCountByAssetId, event.asset.id);

    assetCounts.set(event.asset.id, {
      assetId: event.asset.assetId,
      name: event.asset.name,
      assetTypeName: event.asset.assetType.name,
      checkoutCount: checkoutCountByAssetId.get(event.asset.id) ?? 0,
    });

    const currentType = typeCounts.get(event.asset.assetType.id);
    typeCounts.set(event.asset.assetType.id, {
      assetTypeId: event.asset.assetType.id,
      assetTypeName: event.asset.assetType.name,
      checkoutCount: (currentType?.checkoutCount ?? 0) + 1,
    });
  }

  const mostUsedAssets = [...assetCounts.values()]
    .sort((left, right) => right.checkoutCount - left.checkoutCount || left.name.localeCompare(right.name))
    .slice(0, 10);

  const assetUsageByType = [...typeCounts.values()]
    .sort((left, right) => right.checkoutCount - left.checkoutCount || left.assetTypeName.localeCompare(right.assetTypeName));

  const leastUsedAssets = activeAssets
    .map((asset) => ({
      assetId: asset.assetId,
      name: asset.name,
      assetTypeName: asset.assetType.name,
      checkoutCount: checkoutCountByAssetId.get(asset.id) ?? 0,
    }))
    .sort((left, right) => left.checkoutCount - right.checkoutCount || left.name.localeCompare(right.name))
    .slice(0, 10);

  return {
    mostUsedAssets,
    assetUsageByType,
    leastUsedAssets,
  };
}

export function getRoomDemandInsights(context: InsightsContext): InsightsRoomDemand {
  const { filters, options, periodEvents } = context;
  const checkoutEvents = periodEvents.filter(
    (event) =>
      event.eventType === AssetEventType.CHECKED_OUT &&
      matchesCheckoutLocation(event, filters.locationId) &&
      isRoomDestination(event),
  );

  const byRoom = new Map<string, InsightRoomCheckout>();
  const roomTypeCounts = new Map<string, InsightRoomTypeDemandCell>();
  const typeTotals = new Map<string, number>();

  for (const event of checkoutEvents) {
    if (!event.toLocation || !event.asset) continue;

    const currentRoom = byRoom.get(event.toLocation.id);
    byRoom.set(event.toLocation.id, {
      locationId: event.toLocation.id,
      roomName: event.toLocation.name,
      checkoutCount: (currentRoom?.checkoutCount ?? 0) + 1,
    });

    const cellKey = `${event.toLocation.id}:${event.asset.assetType.id}`;
    const currentCell = roomTypeCounts.get(cellKey);
    roomTypeCounts.set(cellKey, {
      roomId: event.toLocation.id,
      roomName: event.toLocation.name,
      assetTypeId: event.asset.assetType.id,
      assetTypeName: event.asset.assetType.name,
      checkoutCount: (currentCell?.checkoutCount ?? 0) + 1,
    });
    incrementCount(typeTotals, event.asset.assetType.name);
  }

  const checkoutsByRoom = [...byRoom.values()].sort((left, right) => right.checkoutCount - left.checkoutCount);
  const selectedTypeNames =
    filters.assetTypeId
      ? options.assetTypes.filter((type) => type.id === filters.assetTypeId).map((type) => type.name)
      : [...typeTotals.entries()]
          .sort((left, right) => right[1] - left[1])
          .slice(0, 6)
          .map(([name]) => name);

  const roomNames = (filters.locationId
    ? options.locations.filter((location) => location.id === filters.locationId && location.kind === 'room')
    : options.locations.filter((location) => location.kind === 'room')
  ).map((location) => location.name);

  const filteredCells = [...roomTypeCounts.values()].filter((cell) => selectedTypeNames.includes(cell.assetTypeName));

  return {
    checkoutsByRoom,
    assetTypeDemandByRoom: {
      roomNames,
      assetTypeNames: selectedTypeNames,
      cells: filteredCells,
    },
  };
}

export function getInventoryPressureInsights(context: InsightsContext): InsightsInventoryPressure {
  const statusByTypeMap = new Map<string, InsightTypeStatusBreakdown>();

  for (const asset of context.activeAssets) {
    const current = statusByTypeMap.get(asset.assetType.id) ?? {
      assetTypeId: asset.assetType.id,
      assetTypeName: asset.assetType.name,
      available: 0,
      inUse: 0,
      missing: 0,
      inRepair: 0,
      total: 0,
    };

    current.total += 1;
    if (asset.status === 'available') current.available += 1;
    if (asset.status === 'in-use') current.inUse += 1;
    if (asset.status === 'missing') current.missing += 1;
    if (asset.status === 'in-repair') current.inRepair += 1;
    statusByTypeMap.set(asset.assetType.id, current);
  }

  const availableVsInUseByType = [...statusByTypeMap.values()].sort(
    (left, right) => right.total - left.total || left.assetTypeName.localeCompare(right.assetTypeName),
  );

  const lowStockWatchlist = availableVsInUseByType
    .map((type) => ({
      ...type,
      threshold: getLowStockThreshold(type.assetTypeName),
    }))
    .filter((type) => type.available <= type.threshold)
    .sort((left, right) => left.available - right.available || left.assetTypeName.localeCompare(right.assetTypeName));

  const checkoutEvents = context.periodEvents.filter(
    (event) => event.eventType === AssetEventType.CHECKED_OUT && matchesCheckoutLocation(event, context.filters.locationId) && event.asset,
  );

  const typeUsageTotals = new Map<string, number>();
  for (const event of checkoutEvents) {
    if (!event.asset) continue;
    incrementCount(typeUsageTotals, event.asset.assetType.name);
  }

  const categoryNames = context.filters.assetTypeId
    ? availableVsInUseByType.filter((item) => item.assetTypeId === context.filters.assetTypeId).map((item) => item.assetTypeName)
    : [...KEY_USAGE_CATEGORIES.filter((category) => typeUsageTotals.has(category))];

  const resolvedCategoryNames = categoryNames.length > 0
    ? categoryNames
    : [...typeUsageTotals.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 4)
        .map(([name]) => name);

  const bucketTemplate = buildBucketTemplate(context.filters);
  const pointsByKey = new Map(
    bucketTemplate.map((bucket) => [
      bucket.bucketKey,
      {
        bucketKey: bucket.bucketKey,
        label: bucket.label,
        values: Object.fromEntries(resolvedCategoryNames.map((name) => [name, 0])),
      } satisfies InsightCategoryTrendPoint,
    ]),
  );

  for (const event of checkoutEvents) {
    if (!event.asset || !resolvedCategoryNames.includes(event.asset.assetType.name)) continue;
    const bucketKey = getBucketKey(event.createdAt, context.filters.granularity);
    const point = pointsByKey.get(bucketKey);
    if (!point) continue;
    point.values[event.asset.assetType.name] = (point.values[event.asset.assetType.name] ?? 0) + 1;
  }

  return {
    availableVsInUseByType,
    lowStockWatchlist: lowStockWatchlist.map((item): InsightLowStockItem => ({
      assetTypeId: item.assetTypeId,
      assetTypeName: item.assetTypeName,
      total: item.total,
      available: item.available,
      inUse: item.inUse,
      missing: item.missing,
      inRepair: item.inRepair,
      threshold: item.threshold,
    })),
    categoryUsageTrend: {
      categoryNames: resolvedCategoryNames,
      points: [...pointsByKey.values()],
    },
  };
}

export function getCirculationHealthInsights(context: InsightsContext): InsightsCirculationHealth {
  const { filters, activeAssets, durationEvents } = context;
  const { completedPairs, openCheckouts } = buildCheckoutPairs(durationEvents);
  const filteredPairs = completedPairs.filter(
    (pair) =>
      pair.checkoutAt >= filters.from &&
      pair.checkoutAt <= filters.to &&
      (!filters.locationId || pair.checkoutLocationId === filters.locationId),
  );

  const durationsByAsset = new Map<string, { assetId: string; name: string; assetTypeName: string; checkoutCount: number; totalHours: number }>();
  for (const pair of filteredPairs) {
    const current = durationsByAsset.get(pair.assetId) ?? {
      assetId: pair.assetId,
      name: pair.assetName,
      assetTypeName: pair.assetTypeName,
      checkoutCount: 0,
      totalHours: 0,
    };
    current.checkoutCount += 1;
    current.totalHours += pair.durationHours;
    durationsByAsset.set(pair.assetId, current);
  }

  const averageCheckoutDurationByAsset: InsightAverageDurationAsset[] = [...durationsByAsset.values()]
    .map((item) => ({
      assetId: item.assetId,
      name: item.name,
      assetTypeName: item.assetTypeName,
      checkoutCount: item.checkoutCount,
      averageDurationHours: item.totalHours / item.checkoutCount,
    }))
    .sort((left, right) => right.averageDurationHours - left.averageDurationHours)
    .slice(0, 10);

  const latestOpenByAssetId = new Map<string, OpenCheckout>();
  for (const checkout of openCheckouts) {
    const existing = latestOpenByAssetId.get(checkout.assetId);
    if (!existing || existing.checkoutAt < checkout.checkoutAt) {
      latestOpenByAssetId.set(checkout.assetId, checkout);
    }
  }

  const overdueAssets: InsightOverdueAsset[] = activeAssets
    .filter((asset) => asset.status === 'in-use')
    .map((asset): InsightOverdueAsset | null => {
      const latestOpen = latestOpenByAssetId.get(asset.id);
      if (!latestOpen) return null;
      if (filters.locationId && latestOpen.checkoutLocationId !== filters.locationId) return null;

      const durationHours = differenceInHours(new Date(), latestOpen.checkoutAt);
      if (durationHours < OVERDUE_CHECKOUT_HOURS) return null;

      return {
        assetId: asset.id,
        assetName: asset.name,
        assetCode: asset.assetId,
        currentRoom: asset.currentLocation.name,
        checkedOutAt: latestOpen.checkoutAt.toISOString(),
        durationHours,
        lastHandledBy: latestOpen.handledBy,
      } satisfies InsightOverdueAsset;
    })
    .filter((asset): asset is InsightOverdueAsset => Boolean(asset))
    .sort((left, right) => right.durationHours - left.durationHours);

  const bucketTemplate = buildBucketTemplate(filters);
  const trendPoints = new Map(
    bucketTemplate.map((bucket) => [
      bucket.bucketKey,
      {
        bucketKey: bucket.bucketKey,
        label: bucket.label,
        checkouts: 0,
        returns: 0,
      } satisfies InsightCheckoutReturnTrendPoint,
    ]),
  );

  for (const event of context.periodEvents) {
    const bucketKey = getBucketKey(event.createdAt, filters.granularity);
    const point = trendPoints.get(bucketKey);
    if (!point) continue;

    if (event.eventType === AssetEventType.CHECKED_OUT && matchesCheckoutLocation(event, filters.locationId)) {
      point.checkouts += 1;
    }
    if (event.eventType === AssetEventType.RETURNED && matchesReturnLocation(event, filters.locationId)) {
      point.returns += 1;
    }
  }

  const returnComplianceRate = filteredPairs.length > 0
    ? filteredPairs.filter((pair) => pair.durationHours <= RETURN_COMPLIANCE_TARGET_HOURS).length / filteredPairs.length
    : null;

  return {
    averageCheckoutDurationByAsset,
    overdueAssets,
    checkoutVsReturnTrend: [...trendPoints.values()],
    returnComplianceRate: {
      value: returnComplianceRate == null ? 'Not enough data yet' : `${Math.round(returnComplianceRate * 100)}%`,
      rawValue: returnComplianceRate == null ? null : Number((returnComplianceRate * 100).toFixed(1)),
      description:
        returnComplianceRate == null
          ? 'Need matched checkout and return events'
          : `Returned within ${RETURN_COMPLIANCE_TARGET_HOURS} hours`,
      status:
        returnComplianceRate == null
          ? 'default'
          : returnComplianceRate >= 0.85
            ? 'success'
            : returnComplianceRate >= 0.65
              ? 'warning'
              : 'danger',
    },
  };
}

export async function getRiskInsights(context: InsightsContext): Promise<InsightsRiskInsights> {
  const eventCounts = new Map<string, number>();

  for (const event of context.periodEvents) {
    if (!eventTouchesLocation(event, context.filters.locationId)) continue;
    incrementCount(eventCounts, mapDbEventTypeToEventType(event.eventType, event.metadata));
  }

  const orderedEventTypes: EventType[] = [
    'checked-out',
    'returned',
    'moved',
    'asset-updated',
    'audit-scanned',
    'marked-missing',
    'marked-in-repair',
    'audit-completed',
    'asset-created',
    'audit-started',
    'restored-to-available',
    'asset-deleted',
    'retired',
  ];

  const eventTypeBreakdown: InsightEventTypeBreakdown[] = orderedEventTypes
    .map((eventType) => {
      return {
        eventType,
        label: formatEventType(eventType),
        count: eventCounts.get(eventType) ?? 0,
      };
    })
    .filter((event) => event.count > 0);

  const byLocation = new Map<string, { locationId: string; locationName: string; auditCount: number; mismatchCount: number; expectedCount: number }>();
  for (const session of context.completedAuditSessions) {
    const summary = await getAuditSummary(session.id);
    if (!summary) continue;

    const mismatchCount = summary.missing.length + summary.unexpectedFound.length;
    const expectedCount = summary.expectedAssets.length;
    const current = byLocation.get(session.locationId) ?? {
      locationId: session.locationId,
      locationName: session.location.name,
      auditCount: 0,
      mismatchCount: 0,
      expectedCount: 0,
    };

    current.auditCount += 1;
    current.mismatchCount += mismatchCount;
    current.expectedCount += expectedCount;
    byLocation.set(session.locationId, current);
  }

  const auditMismatchByLocation = [...byLocation.values()]
    .map((location) => ({
      ...location,
      mismatchRate: location.expectedCount > 0 ? location.mismatchCount / location.expectedCount : 0,
    }))
    .sort((left, right) => right.mismatchRate - left.mismatchRate);

  return {
    eventTypeBreakdown,
    auditMismatchByLocation,
  };
}

export function getRecommendations(input: {
  overview: InsightsOverview;
  usage: InsightsUsagePatterns;
  roomDemand: InsightsRoomDemand;
  inventoryPressure: InsightsInventoryPressure;
  circulationHealth: InsightsCirculationHealth;
  risks: InsightsRiskInsights;
}): InsightRecommendation[] {
  const recommendations: InsightRecommendation[] = [];

  if (input.inventoryPressure.lowStockWatchlist.length > 0) {
    const critical = input.inventoryPressure.lowStockWatchlist.slice(0, 3);
    recommendations.push({
      id: 'low-stock',
      title: 'Low-stock categories need replenishment planning',
      description: `${critical.map((item) => `${item.assetTypeName} (${item.available} available / threshold ${item.threshold})`).join(', ')} should be reviewed for purchase or redistribution.`,
      severity: 'warning',
    });
  }

  if (input.circulationHealth.overdueAssets.length > 0) {
    const topOverdue = input.circulationHealth.overdueAssets[0];
    recommendations.push({
      id: 'overdue-assets',
      title: 'Follow up on long-held assets',
      description: `${input.circulationHealth.overdueAssets.length} asset${input.circulationHealth.overdueAssets.length === 1 ? '' : 's'} are currently beyond the ${OVERDUE_CHECKOUT_HOURS}-hour threshold. Start with ${topOverdue.assetName} in ${topOverdue.currentRoom}.`,
      severity: 'danger',
    });
  }

  if (input.usage.mostUsedAssets.length > 1) {
    const [first, second] = input.usage.mostUsedAssets;
    if (first.checkoutCount >= Math.max(second.checkoutCount * 1.5, 4)) {
      recommendations.push({
        id: 'high-wear-asset',
        title: 'Plan backup coverage for the most-used asset',
        description: `${first.name} (${first.assetId}) is seeing outsized demand with ${first.checkoutCount} checkouts in the selected window. Consider a backup or preventive maintenance plan.`,
        severity: 'info',
      });
    }
  }

  if (input.roomDemand.checkoutsByRoom.length > 0) {
    const totalRoomCheckouts = input.roomDemand.checkoutsByRoom.reduce((sum, room) => sum + room.checkoutCount, 0);
    const topRoom = input.roomDemand.checkoutsByRoom[0];
    if (totalRoomCheckouts > 0 && topRoom.checkoutCount / totalRoomCheckouts >= 0.45) {
      recommendations.push({
        id: 'room-pressure',
        title: 'Consider dedicated inventory for the busiest room',
        description: `${topRoom.roomName} is driving ${Math.round((topRoom.checkoutCount / totalRoomCheckouts) * 100)}% of room-bound checkouts. Pre-positioning high-demand gear there could reduce circulation friction.`,
        severity: 'info',
      });
    }
  }

  const inactiveAssets = input.usage.leastUsedAssets.filter((asset) => asset.checkoutCount === 0);
  if (inactiveAssets.length >= 3) {
    recommendations.push({
      id: 'underused-assets',
      title: 'Review underused assets for reassignment',
      description: `${inactiveAssets.length} tracked assets had zero checkouts in the selected window. Review whether they should be reassigned, promoted, or retired from prime storage.`,
      severity: 'info',
    });
  }

  const topMismatch = input.risks.auditMismatchByLocation[0];
  if (topMismatch && topMismatch.mismatchRate >= 0.1) {
    recommendations.push({
      id: 'audit-mismatch',
      title: 'Increase audit follow-up where mismatch rates are high',
      description: `${topMismatch.locationName} shows a ${Math.round(topMismatch.mismatchRate * 100)}% mismatch rate across recent completed audits. Consider tighter check-in discipline or more frequent reconciliations.`,
      severity: 'warning',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'stable-operations',
      title: 'Operations look stable in the selected window',
      description: 'No major low-stock, overdue, or audit-risk signals were triggered by the current filters. Continue monitoring usage and return compliance for early changes.',
      severity: 'success',
    });
  }

  return recommendations.slice(0, 6);
}

export async function getInsightsDashboard(input: Partial<InsightsFilters>): Promise<InsightsResponse> {
  const filters = normalizeInsightsFilters(input);
  const context = await loadInsightsContext(filters);
  const overview = getInsightsOverview(context);
  const usagePatterns = getUsageInsights(context);
  const roomDemand = getRoomDemandInsights(context);
  const inventoryPressure = getInventoryPressureInsights(context);
  const circulationHealth = getCirculationHealthInsights(context);
  const risks = await getRiskInsights(context);
  const recommendations = getRecommendations({
    overview,
    usage: usagePatterns,
    roomDemand,
    inventoryPressure,
    circulationHealth,
    risks,
  });

  return {
    filters: {
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      locationId: filters.locationId,
      assetTypeId: filters.assetTypeId,
      granularity: filters.granularity,
    },
    options: context.options,
    overview,
    usagePatterns,
    roomDemand,
    inventoryPressure,
    circulationHealth,
    risks,
    recommendations,
    meta: {
      generatedAt: new Date().toISOString(),
      overdueThresholdHours: OVERDUE_CHECKOUT_HOURS,
      returnComplianceTargetHours: RETURN_COMPLIANCE_TARGET_HOURS,
      lowStockThresholds: LOW_STOCK_THRESHOLDS,
    },
  };
}

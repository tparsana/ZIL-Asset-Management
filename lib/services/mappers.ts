import {
  AssetEventType,
  AssetStatus as DbAssetStatus,
  AuditResultType as DbAuditResultType,
  AuditStatus as DbAuditStatus,
  LocationKind as DbLocationKind,
  type Prisma,
} from '@prisma/client';
import type {
  Asset,
  AssetEvent,
  AssetStatus,
  AuditScan,
  AuditStatus,
  EventType,
  Location,
} from '@/lib/types';
import { createQrPayload } from '@/lib/qr';

export const assetInclude = {
  assetType: true,
  homeLocation: true,
  currentLocation: true,
} satisfies Prisma.AssetInclude;

export const eventInclude = {
  asset: {
    select: {
      id: true,
      assetId: true,
      name: true,
    },
  },
  fromLocation: true,
  toLocation: true,
} satisfies Prisma.AssetEventInclude;

export const auditScanInclude = {
  asset: {
    select: {
      id: true,
      assetId: true,
      name: true,
      homeLocationId: true,
      currentLocationId: true,
    },
  },
} satisfies Prisma.AuditScanInclude;

export type AssetRecord = Prisma.AssetGetPayload<{ include: typeof assetInclude }>;
export type EventRecord = Prisma.AssetEventGetPayload<{ include: typeof eventInclude }>;
export type AuditScanRecord = Prisma.AuditScanGetPayload<{ include: typeof auditScanInclude }>;

export const dbStatusByApi: Record<AssetStatus, DbAssetStatus> = {
  available: DbAssetStatus.AVAILABLE,
  'in-use': DbAssetStatus.IN_USE,
  missing: DbAssetStatus.MISSING,
  'in-repair': DbAssetStatus.IN_REPAIR,
  retired: DbAssetStatus.RETIRED,
};

export const apiStatusByDb: Record<DbAssetStatus, AssetStatus> = {
  [DbAssetStatus.AVAILABLE]: 'available',
  [DbAssetStatus.IN_USE]: 'in-use',
  [DbAssetStatus.MISSING]: 'missing',
  [DbAssetStatus.IN_REPAIR]: 'in-repair',
  [DbAssetStatus.RETIRED]: 'retired',
};

export const apiEventByDb: Record<AssetEventType, EventType> = {
  [AssetEventType.ASSET_CREATED]: 'asset-created',
  [AssetEventType.ASSET_UPDATED]: 'asset-updated',
  [AssetEventType.MOVED]: 'moved',
  [AssetEventType.CHECKED_OUT]: 'checked-out',
  [AssetEventType.RETURNED]: 'returned',
  [AssetEventType.MARKED_MISSING]: 'marked-missing',
  [AssetEventType.MARKED_IN_REPAIR]: 'marked-in-repair',
  [AssetEventType.RESTORED_TO_AVAILABLE]: 'restored-to-available',
  [AssetEventType.RETIRED]: 'retired',
  [AssetEventType.AUDIT_STARTED]: 'audit-started',
  [AssetEventType.AUDIT_SCANNED]: 'audit-scanned',
  [AssetEventType.AUDIT_COMPLETED]: 'audit-completed',
};

export const dbEventByApi: Record<EventType, AssetEventType> = {
  'asset-created': AssetEventType.ASSET_CREATED,
  'asset-updated': AssetEventType.ASSET_UPDATED,
  moved: AssetEventType.MOVED,
  'checked-out': AssetEventType.CHECKED_OUT,
  returned: AssetEventType.RETURNED,
  'marked-missing': AssetEventType.MARKED_MISSING,
  'marked-in-repair': AssetEventType.MARKED_IN_REPAIR,
  'restored-to-available': AssetEventType.RESTORED_TO_AVAILABLE,
  retired: AssetEventType.RETIRED,
  'audit-started': AssetEventType.AUDIT_STARTED,
  'audit-scanned': AssetEventType.AUDIT_SCANNED,
  'audit-completed': AssetEventType.AUDIT_COMPLETED,
};

export const apiAuditStatusByDb: Record<DbAuditStatus, AuditStatus> = {
  [DbAuditStatus.IN_PROGRESS]: 'in-progress',
  [DbAuditStatus.COMPLETED]: 'completed',
  [DbAuditStatus.CANCELLED]: 'cancelled',
};

export function toLocation(location: {
  id: string;
  name: string;
  kind: DbLocationKind;
  description: string | null;
}): Location {
  return {
    id: location.id,
    name: location.name,
    kind: location.kind === DbLocationKind.ROOM ? 'room' : 'storage',
    description: location.description,
  };
}

export function toAsset(asset: AssetRecord): Asset {
  return {
    id: asset.id,
    assetId: asset.assetId,
    name: asset.name,
    assetTypeId: asset.assetTypeId,
    assetType: {
      id: asset.assetType.id,
      name: asset.assetType.name,
      prefix: asset.assetType.prefix,
      description: asset.assetType.description,
    },
    serialNumber: asset.serialNumber,
    purchaseDate: asset.purchaseDate?.toISOString() ?? null,
    cost: asset.cost == null ? null : Number(asset.cost),
    consumable: asset.consumable,
    homeLocationId: asset.homeLocationId,
    currentLocationId: asset.currentLocationId,
    homeLocation: toLocation(asset.homeLocation),
    currentLocation: toLocation(asset.currentLocation),
    status: apiStatusByDb[asset.status],
    notes: asset.notes,
    referenceImageUrl: asset.referenceImageUrl,
    qrCodeToken: asset.qrCodeToken,
    qrCodePayload: createQrPayload(asset.qrCodeToken),
    qrCodeGeneratedAt: asset.qrCodeGeneratedAt.toISOString(),
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

export function toEvent(event: EventRecord): AssetEvent {
  return {
    id: event.id,
    assetId: event.assetId,
    asset: event.asset,
    eventType: apiEventByDb[event.eventType],
    fromLocation: event.fromLocation ? toLocation(event.fromLocation) : null,
    toLocation: event.toLocation ? toLocation(event.toLocation) : null,
    previousStatus: event.previousStatus ? apiStatusByDb[event.previousStatus] : null,
    newStatus: event.newStatus ? apiStatusByDb[event.newStatus] : null,
    handledBy: event.handledBy,
    remarks: event.remarks,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
  };
}

export function apiAuditResultByDb(resultType: DbAuditResultType) {
  if (resultType === DbAuditResultType.EXPECTED_FOUND) return 'expected-found' as const;
  if (resultType === DbAuditResultType.UNEXPECTED_FOUND) return 'unexpected-found' as const;
  return 'duplicate-scan' as const;
}

export function toAuditScan(scan: AuditScanRecord): AuditScan {
  return {
    id: scan.id,
    auditSessionId: scan.auditSessionId,
    assetId: scan.assetId,
    asset: scan.asset,
    resultType: apiAuditResultByDb(scan.resultType),
    scannedAt: scan.scannedAt.toISOString(),
  };
}

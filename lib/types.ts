export type AssetStatus = 'available' | 'in-use' | 'missing' | 'in-repair' | 'retired';

export type EventType =
  | 'asset-created'
  | 'asset-updated'
  | 'moved'
  | 'checked-out'
  | 'returned'
  | 'marked-missing'
  | 'marked-in-repair'
  | 'restored-to-available'
  | 'retired'
  | 'audit-started'
  | 'audit-scanned'
  | 'audit-completed';

export type AuditStatus = 'in-progress' | 'completed' | 'cancelled';
export type AuditResultType = 'expected-found' | 'unexpected-found' | 'duplicate-scan';
export type LocationKind = 'room' | 'storage';

export interface AssetTypeInfo {
  id: string;
  name: string;
  prefix: string;
  description?: string | null;
}

export interface Location {
  id: string;
  name: string;
  kind: LocationKind;
  description?: string | null;
  assetCount?: number;
  availableCount?: number;
  inUseCount?: number;
  missingCount?: number;
  inRepairCount?: number;
  awayFromHomeCount?: number;
  currentAssets?: Pick<Asset, 'id' | 'assetId' | 'name' | 'status' | 'referenceImageUrl'>[];
}

export interface AppUser {
  id: string;
  name: string;
  email?: string | null;
  isActive: boolean;
}

export interface Asset {
  id: string;
  assetId: string;
  name: string;
  assetTypeId: string;
  assetType: AssetTypeInfo;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  cost?: number | null;
  consumable: boolean;
  homeLocationId: string;
  currentLocationId: string;
  homeLocation: Location;
  currentLocation: Location;
  status: AssetStatus;
  referenceImageUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  qrCodeToken: string;
  qrCodePayload: string;
  qrCodeGeneratedAt: string;
}

export interface AssetEvent {
  id: string;
  assetId?: string | null;
  asset?: Pick<Asset, 'id' | 'assetId' | 'name'> | null;
  eventType: EventType;
  fromLocation?: Location | null;
  toLocation?: Location | null;
  previousStatus?: AssetStatus | null;
  newStatus?: AssetStatus | null;
  handledBy?: string | null;
  remarks?: string | null;
  metadata?: unknown;
  createdAt: string;
}

export interface AuditSession {
  id: string;
  locationId: string;
  location?: Location;
  startedAt: string;
  completedAt?: string | null;
  startedBy?: string | null;
  status: AuditStatus;
  notes?: string | null;
}

export interface AuditScan {
  id: string;
  auditSessionId: string;
  assetId: string;
  asset?: Pick<Asset, 'id' | 'assetId' | 'name' | 'currentLocationId' | 'homeLocationId'>;
  resultType: AuditResultType;
  scannedAt: string;
}

export interface AuditSummary {
  expectedAssets: Asset[];
  scans: AuditScan[];
  expectedFound: Asset[];
  unexpectedFound: Asset[];
  missing: Asset[];
  duplicateScans: AuditScan[];
}

export interface DashboardSummary {
  totals: {
    totalAssets: number;
    available: number;
    inUse: number;
    missing: number;
    inRepair: number;
  };
  recentActivity: AssetEvent[];
  locationSummary: Location[];
}

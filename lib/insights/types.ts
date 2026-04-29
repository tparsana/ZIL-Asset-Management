import type { Asset, AuditScan, AuditSession, EventType, Location } from '@/lib/types';

export type InsightsGranularity = 'day' | 'week' | 'month';

export interface InsightsFilters {
  fromDate: string;
  toDate: string;
  granularity: InsightsGranularity;
  locationId?: string;
  assetTypeId?: string;
}

export interface InsightMetric {
  value: string;
  description: string;
  status?: 'default' | 'info' | 'success' | 'warning' | 'danger';
  rawValue?: number | null;
}

export interface InsightMostUsedAsset {
  assetId: string;
  name: string;
  checkoutCount: number;
}

export interface InsightMostUsedRoom {
  locationId: string;
  name: string;
  checkoutCount: number;
}

export interface InsightsOverview {
  totalAssets: InsightMetric;
  totalCheckouts: InsightMetric;
  mostUsedAsset: InsightMetric & { asset?: InsightMostUsedAsset | null };
  mostUsedRoom: InsightMetric & { room?: InsightMostUsedRoom | null };
  averageCheckoutDuration: InsightMetric;
  totalInventoryValue: InsightMetric;
  missingUnresolvedItems: InsightMetric;
  lowStockWatchlistCount: InsightMetric;
}

export interface InsightUsageAsset {
  assetId: string;
  name: string;
  assetTypeName: string;
  checkoutCount: number;
}

export interface InsightUsageType {
  assetTypeId: string;
  assetTypeName: string;
  checkoutCount: number;
}

export interface InsightsUsagePatterns {
  mostUsedAssets: InsightUsageAsset[];
  assetUsageByType: InsightUsageType[];
  leastUsedAssets: InsightUsageAsset[];
}

export interface InsightRoomCheckout {
  locationId: string;
  roomName: string;
  checkoutCount: number;
}

export interface InsightRoomTypeDemandCell {
  roomId: string;
  roomName: string;
  assetTypeId: string;
  assetTypeName: string;
  checkoutCount: number;
}

export interface InsightsRoomDemand {
  checkoutsByRoom: InsightRoomCheckout[];
  assetTypeDemandByRoom: {
    roomNames: string[];
    assetTypeNames: string[];
    cells: InsightRoomTypeDemandCell[];
  };
}

export interface InsightTypeStatusBreakdown {
  assetTypeId: string;
  assetTypeName: string;
  available: number;
  inUse: number;
  missing: number;
  inRepair: number;
  total: number;
}

export interface InsightLowStockItem {
  assetTypeId: string;
  assetTypeName: string;
  total: number;
  available: number;
  inUse: number;
  missing: number;
  inRepair: number;
  threshold: number;
}

export interface InsightCategoryTrendPoint {
  bucketKey: string;
  label: string;
  values: Record<string, number>;
}

export interface InsightsInventoryPressure {
  availableVsInUseByType: InsightTypeStatusBreakdown[];
  lowStockWatchlist: InsightLowStockItem[];
  categoryUsageTrend: {
    categoryNames: string[];
    points: InsightCategoryTrendPoint[];
  };
}

export interface InsightAverageDurationAsset {
  assetId: string;
  name: string;
  assetTypeName: string;
  checkoutCount: number;
  averageDurationHours: number;
}

export interface InsightOverdueAsset {
  assetId: string;
  assetName: string;
  assetCode: string;
  currentRoom: string;
  checkedOutAt: string;
  durationHours: number;
  lastHandledBy?: string | null;
}

export interface InsightCheckoutReturnTrendPoint {
  bucketKey: string;
  label: string;
  checkouts: number;
  returns: number;
}

export interface InsightsCirculationHealth {
  averageCheckoutDurationByAsset: InsightAverageDurationAsset[];
  overdueAssets: InsightOverdueAsset[];
  checkoutVsReturnTrend: InsightCheckoutReturnTrendPoint[];
  returnComplianceRate: InsightMetric;
}

export interface InsightEventTypeBreakdown {
  eventType: EventType;
  label: string;
  count: number;
}

export interface InsightAuditMismatchLocation {
  locationId: string;
  locationName: string;
  auditCount: number;
  mismatchCount: number;
  expectedCount: number;
  mismatchRate: number;
}

export interface InsightsRiskInsights {
  eventTypeBreakdown: InsightEventTypeBreakdown[];
  auditMismatchByLocation: InsightAuditMismatchLocation[];
}

export interface InsightRecommendation {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'danger' | 'success';
}

export interface InsightsResponse {
  filters: InsightsFilters;
  options: {
    locations: Pick<Location, 'id' | 'name' | 'kind'>[];
    assetTypes: Array<{ id: string; name: string; prefix: string }>;
  };
  overview: InsightsOverview;
  usagePatterns: InsightsUsagePatterns;
  roomDemand: InsightsRoomDemand;
  inventoryPressure: InsightsInventoryPressure;
  circulationHealth: InsightsCirculationHealth;
  risks: InsightsRiskInsights;
  recommendations: InsightRecommendation[];
  meta: {
    generatedAt: string;
    overdueThresholdHours: number;
    returnComplianceTargetHours: number;
    lowStockThresholds: Record<string, number>;
  };
}

export interface InsightsContext {
  filters: InsightsFilters;
  activeAssets: Asset[];
  options: InsightsResponse['options'];
  relevantAuditSessions: AuditSession[];
  relevantAuditScans: AuditScan[];
}

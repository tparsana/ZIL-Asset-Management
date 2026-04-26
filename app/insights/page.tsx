'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  Building2,
  CalendarRange,
  Clock3,
  Package,
  PackageCheck,
  ShieldAlert,
  type LucideIcon,
  Warehouse,
} from 'lucide-react';
import { InsightKpiCard } from '@/components/insights/insight-kpi-card';
import { RecommendationCard } from '@/components/insights/recommendation-card';
import { RoomDemandHeatmap } from '@/components/insights/room-demand-heatmap';
import { EmptyState } from '@/components/shared/empty-state';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import type { InsightMetric, InsightsGranularity, InsightsResponse } from '@/lib/insights/types';
import { cn } from '@/lib/utils';

const ALL_LOCATIONS = 'all-locations';
const ALL_ASSET_TYPES = 'all-asset-types';
const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

type FilterState = {
  fromDate: string;
  toDate: string;
  locationId: string;
  assetTypeId: string;
  granularity: InsightsGranularity;
};

function getDefaultFilters(): FilterState {
  const today = new Date();
  return {
    fromDate: format(subDays(today, 29), 'yyyy-MM-dd'),
    toDate: format(today, 'yyyy-MM-dd'),
    locationId: ALL_LOCATIONS,
    assetTypeId: ALL_ASSET_TYPES,
    granularity: 'week',
  };
}

function buildInsightsQuery(filters: FilterState) {
  const params = new URLSearchParams({
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    granularity: filters.granularity,
  });

  if (filters.locationId !== ALL_LOCATIONS) params.set('locationId', filters.locationId);
  if (filters.assetTypeId !== ALL_ASSET_TYPES) params.set('assetTypeId', filters.assetTypeId);
  return params.toString();
}

function formatHoursShort(hours: number) {
  if (hours >= 24) return `${(hours / 24).toFixed(1)}d`;
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  return `${Math.max(hours * 60, 1).toFixed(0)}m`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function truncateLabel(value: string, maxLength = 14) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function statusTone(status?: InsightMetric['status']) {
  switch (status) {
    case 'info':
      return 'text-status-in-use';
    case 'success':
      return 'text-status-available';
    case 'warning':
      return 'text-status-warning';
    case 'danger':
      return 'text-status-missing';
    default:
      return 'text-foreground';
  }
}

const kpiIcons = {
  totalAssets: Package,
  totalCheckouts: ArrowRightLeft,
  mostUsedAsset: Boxes,
  mostUsedRoom: Building2,
  averageCheckoutDuration: Clock3,
  itemsCurrentlyInUse: PackageCheck,
  missingUnresolvedItems: ShieldAlert,
  lowStockWatchlistCount: AlertTriangle,
} satisfies Record<keyof InsightsResponse['overview'], LucideIcon>;

export default function InsightsPage() {
  const [filters, setFilters] = useState<FilterState>(getDefaultFilters);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInsights() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/insights?${buildInsightsQuery(filters)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            payload && typeof payload.error === 'string'
              ? payload.error
              : 'Unable to load insights data',
          );
        }

        if (!controller.signal.aborted) {
          setInsights(payload as InsightsResponse);
        }
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load insights data');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadInsights();
    return () => controller.abort();
  }, [filters]);

  const categoryTrendConfig = useMemo(() => {
    if (!insights) return {};
    return insights.inventoryPressure.categoryUsageTrend.categoryNames.reduce<Record<string, { label: string; color: string }>>(
      (config, categoryName, index) => {
        config[categoryName] = {
          label: categoryName,
          color: CHART_COLORS[index % CHART_COLORS.length],
        };
        return config;
      },
      {},
    );
  }, [insights]);

  const kpiCards = useMemo(() => {
    if (!insights) return [];
    return [
      { key: 'totalAssets', title: 'Total Assets', metric: insights.overview.totalAssets },
      { key: 'totalCheckouts', title: 'Total Checkouts', metric: insights.overview.totalCheckouts },
      { key: 'mostUsedAsset', title: 'Most Used Asset', metric: insights.overview.mostUsedAsset },
      { key: 'mostUsedRoom', title: 'Most Used Room', metric: insights.overview.mostUsedRoom },
      { key: 'averageCheckoutDuration', title: 'Average Checkout Duration', metric: insights.overview.averageCheckoutDuration },
      { key: 'itemsCurrentlyInUse', title: 'Items Currently In Use', metric: insights.overview.itemsCurrentlyInUse },
      { key: 'missingUnresolvedItems', title: 'Missing / Unresolved Items', metric: insights.overview.missingUnresolvedItems },
      { key: 'lowStockWatchlistCount', title: 'Low Stock Watchlist Count', metric: insights.overview.lowStockWatchlistCount },
    ] as Array<{
      key: keyof InsightsResponse['overview'];
      title: string;
      metric: InsightMetric;
    }>;
  }, [insights]);

  const eventBreakdownChartData = useMemo(
    () =>
      insights?.risks.eventTypeBreakdown.map((event) => ({
        ...event,
        shortLabel: truncateLabel(event.label, 16),
      })) ?? [],
    [insights],
  );

  return (
    <div className="space-y-6 p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance sm:text-3xl">Insights</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Analytics and operational trends from asset activity, audits, and inventory state.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {loading && insights
            ? 'Refreshing insights...'
            : insights
              ? `Updated ${formatDateTime(insights.meta.generatedAt)}`
              : 'Last 30 days by default'}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Apply one set of filters across the entire analytics view.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">From</label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
                max={filters.toDate}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">To</label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
                min={filters.fromDate}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Location</label>
              <Select
                value={filters.locationId}
                onValueChange={(value) => setFilters((current) => ({ ...current, locationId: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_LOCATIONS}>All Locations</SelectItem>
                  {(insights?.options.locations ?? []).map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Asset Type</label>
              <Select
                value={filters.assetTypeId}
                onValueChange={(value) => setFilters((current) => ({ ...current, assetTypeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ASSET_TYPES}>All Asset Types</SelectItem>
                  {(insights?.options.assetTypes ?? []).map((assetType) => (
                    <SelectItem key={assetType.id} value={assetType.id}>
                      {assetType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Granularity</label>
              <Select
                value={filters.granularity}
                onValueChange={(value) =>
                  setFilters((current) => ({ ...current, granularity: value as InsightsGranularity }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {!insights && loading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="space-y-3 p-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-8 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="h-72 animate-pulse rounded-xl bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : insights ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((item) => (
              <InsightKpiCard
                key={item.key}
                title={item.title}
                value={item.metric.value}
                description={item.metric.description}
                status={item.metric.status}
                icon={kpiIcons[item.key]}
              />
            ))}
          </div>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Usage Patterns</h2>
              <p className="text-sm text-muted-foreground">Checkout activity by asset, asset type, and underused inventory.</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Most Used Assets</CardTitle>
                  <CardDescription>Top 10 assets by checkout activity in the selected window.</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.usagePatterns.mostUsedAssets.length > 0 ? (
                    <ChartContainer
                      className="h-[320px] w-full aspect-auto"
                      config={{ checkoutCount: { label: 'Checkouts', color: 'var(--color-chart-1)' } }}
                    >
                      <BarChart
                        data={insights.usagePatterns.mostUsedAssets}
                        layout="vertical"
                        margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
                      >
                        <CartesianGrid horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="assetId"
                          width={84}
                          tickLine={false}
                          axisLine={false}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              labelFormatter={(_, payload) => {
                                const row = payload?.[0]?.payload;
                                return row ? `${row.name} (${row.assetId})` : '';
                              }}
                            />
                          }
                        />
                        <Bar dataKey="checkoutCount" radius={[0, 8, 8, 0]} fill="var(--color-checkoutCount)" />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <EmptyState
                      title="No checkout activity yet"
                      description="Most-used assets will appear once the selected window has checkout events."
                      className="py-10"
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Asset Usage by Type</CardTitle>
                  <CardDescription>Demand concentration across equipment categories.</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.usagePatterns.assetUsageByType.length > 0 ? (
                    <ChartContainer
                      className="h-[320px] w-full aspect-auto"
                      config={{ checkoutCount: { label: 'Checkouts', color: 'var(--color-chart-2)' } }}
                    >
                      <BarChart data={insights.usagePatterns.assetUsageByType} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="assetTypeName"
                          tickFormatter={(value) => truncateLabel(String(value))}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis allowDecimals={false} />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              labelFormatter={(_, payload) => payload?.[0]?.payload?.assetTypeName ?? ''}
                            />
                          }
                        />
                        <Bar dataKey="checkoutCount" radius={[8, 8, 0, 0]} fill="var(--color-checkoutCount)" />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <EmptyState
                      title="No type demand data yet"
                      description="Type-level demand is based on checkout events."
                      className="py-10"
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Least Used Assets</CardTitle>
                <CardDescription>Assets with zero or very low checkout activity in the selected period.</CardDescription>
              </CardHeader>
              <CardContent>
                {insights.usagePatterns.leastUsedAssets.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Checkouts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {insights.usagePatterns.leastUsedAssets.map((asset) => (
                        <TableRow key={asset.assetId}>
                          <TableCell className="whitespace-normal">
                            <div>
                              <p className="font-medium">{asset.name}</p>
                              <p className="text-xs text-muted-foreground">{asset.assetId}</p>
                            </div>
                          </TableCell>
                          <TableCell>{asset.assetTypeName}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{asset.checkoutCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState
                    title="No assets available for ranking"
                    description="Add inventory and checkout activity to surface underused equipment."
                    className="py-10"
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Room Demand</h2>
              <p className="text-sm text-muted-foreground">Where temporary usage pressure is concentrating across rooms.</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Checkouts by Room</CardTitle>
                  <CardDescription>Uses checkout destination room counts from the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.roomDemand.checkoutsByRoom.length > 0 ? (
                    <ChartContainer
                      className="h-[320px] w-full aspect-auto"
                      config={{ checkoutCount: { label: 'Checkouts', color: 'var(--color-chart-3)' } }}
                    >
                      <BarChart data={insights.roomDemand.checkoutsByRoom} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="roomName" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} />
                        <ChartTooltip />
                        <Bar dataKey="checkoutCount" radius={[8, 8, 0, 0]} fill="var(--color-checkoutCount)" />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <EmptyState
                      title="No room checkout demand yet"
                      description="Room activity will appear after assets are checked out into rooms."
                      className="py-10"
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Asset Type Demand by Room</CardTitle>
                  <CardDescription>Room/type demand matrix for spotting category-specific pressure.</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.roomDemand.assetTypeDemandByRoom.cells.length > 0 ? (
                    <RoomDemandHeatmap
                      roomNames={insights.roomDemand.assetTypeDemandByRoom.roomNames}
                      assetTypeNames={insights.roomDemand.assetTypeDemandByRoom.assetTypeNames}
                      cells={insights.roomDemand.assetTypeDemandByRoom.cells}
                    />
                  ) : (
                    <EmptyState
                      title="No room/type combinations yet"
                      description="This view fills in once room checkouts start creating demand patterns."
                      className="py-10"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Inventory Pressure</h2>
              <p className="text-sm text-muted-foreground">Current availability vs demand signals, plus categories nearing coverage limits.</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Available vs In Use by Asset Type</CardTitle>
                  <CardDescription>Live inventory state from the current Asset table.</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.inventoryPressure.availableVsInUseByType.length > 0 ? (
                    <ChartContainer
                      className="h-[340px] w-full aspect-auto"
                      config={{
                        available: { label: 'Available', color: 'var(--color-status-available)' },
                        inUse: { label: 'In Use', color: 'var(--color-status-in-use)' },
                        missing: { label: 'Missing', color: 'var(--color-status-missing)' },
                        inRepair: { label: 'In Repair', color: 'var(--color-status-warning)' },
                      }}
                    >
                      <BarChart data={insights.inventoryPressure.availableVsInUseByType} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="assetTypeName"
                          tickFormatter={(value) => truncateLabel(String(value))}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="available" stackId="status" radius={[0, 0, 0, 0]} fill="var(--color-available)" />
                        <Bar dataKey="inUse" stackId="status" radius={[0, 0, 0, 0]} fill="var(--color-inUse)" />
                        <Bar dataKey="missing" stackId="status" radius={[0, 0, 0, 0]} fill="var(--color-missing)" />
                        <Bar dataKey="inRepair" stackId="status" radius={[8, 8, 0, 0]} fill="var(--color-inRepair)" />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <EmptyState
                      title="No inventory state data yet"
                      description="Tracked assets will populate pressure monitoring as inventory is created."
                      className="py-10"
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Low Stock Watchlist</CardTitle>
                  <CardDescription>Available count at or below current thresholds.</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.inventoryPressure.lowStockWatchlist.length > 0 ? (
                    <div className="space-y-3">
                      {insights.inventoryPressure.lowStockWatchlist.map((item) => (
                        <div key={item.assetTypeId} className="rounded-xl border border-status-warning/20 bg-status-warning/5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{item.assetTypeName}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.available} available · {item.inUse} in use · threshold {item.threshold}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-status-warning">{item.available}</p>
                              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Available</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No low-stock alerts"
                      description="All currently tracked categories are above their configured watch thresholds."
                      className="py-10"
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usage Trend for Consumables / Key Categories</CardTitle>
                <CardDescription>Weekly or monthly checkout trend for high-circulation categories.</CardDescription>
              </CardHeader>
              <CardContent>
                {insights.inventoryPressure.categoryUsageTrend.points.length > 0 &&
                insights.inventoryPressure.categoryUsageTrend.categoryNames.length > 0 ? (
                  <ChartContainer className="h-[320px] w-full aspect-auto" config={categoryTrendConfig}>
                    <LineChart data={insights.inventoryPressure.categoryUsageTrend.points} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      {insights.inventoryPressure.categoryUsageTrend.categoryNames.map((categoryName, index) => (
                        <Line
                          key={categoryName}
                          dataKey={`values.${categoryName}`}
                          name={categoryName}
                          stroke={CHART_COLORS[index % CHART_COLORS.length]}
                          strokeWidth={2.5}
                          dot={false}
                          type="monotone"
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <EmptyState
                    title="Not enough trend data yet"
                    description="Trend lines appear once the selected period contains checkout activity for key categories."
                    className="py-10"
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Circulation Health</h2>
              <p className="text-sm text-muted-foreground">Return balance, long-held assets, and how long equipment tends to stay out.</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <Card>
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="text-base">Checkout vs Return Trend</CardTitle>
                    <CardDescription>Comparing circulation outflow and home returns over time.</CardDescription>
                  </div>
                  <div className="rounded-xl border bg-muted/30 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Return Compliance</p>
                    <p className={cn('mt-1 text-lg font-semibold', statusTone(insights.circulationHealth.returnComplianceRate.status))}>
                      {insights.circulationHealth.returnComplianceRate.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {insights.circulationHealth.returnComplianceRate.description}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  {insights.circulationHealth.checkoutVsReturnTrend.length > 0 ? (
                    <ChartContainer
                      className="h-[320px] w-full aspect-auto"
                      config={{
                        checkouts: { label: 'Checkouts', color: 'var(--color-chart-1)' },
                        returns: { label: 'Returns', color: 'var(--color-chart-2)' },
                      }}
                    >
                      <LineChart data={insights.circulationHealth.checkoutVsReturnTrend} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line dataKey="checkouts" stroke="var(--color-checkouts)" strokeWidth={2.5} dot={false} type="monotone" />
                        <Line dataKey="returns" stroke="var(--color-returns)" strokeWidth={2.5} dot={false} type="monotone" />
                      </LineChart>
                    </ChartContainer>
                  ) : (
                    <EmptyState
                      title="No circulation trend yet"
                      description="Matched circulation over time will appear once assets start moving in the selected window."
                      className="py-10"
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Average Checkout Duration by Asset</CardTitle>
                  <CardDescription>Assets that stay checked out longest based on matched checkout/return pairs.</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.circulationHealth.averageCheckoutDurationByAsset.length > 0 ? (
                    <ChartContainer
                      className="h-[320px] w-full aspect-auto"
                      config={{ averageDurationHours: { label: 'Average Duration', color: 'var(--color-chart-4)' } }}
                    >
                      <BarChart
                        data={insights.circulationHealth.averageCheckoutDurationByAsset}
                        layout="vertical"
                        margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
                      >
                        <CartesianGrid horizontal={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(value) => formatHoursShort(Number(value))}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => truncateLabel(String(value), 18)}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => <span>{formatHoursShort(Number(value))}</span>}
                              labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ''}
                            />
                          }
                        />
                        <Bar
                          dataKey="averageDurationHours"
                          radius={[0, 8, 8, 0]}
                          fill="var(--color-averageDurationHours)"
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <EmptyState
                      title="Not enough duration history yet"
                      description="This view needs matched checkout and return events for the selected filter window."
                      className="py-10"
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Overdue / Long-Held Assets</CardTitle>
                <CardDescription>
                  Assets still in use beyond the current {insights.meta.overdueThresholdHours}-hour threshold.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insights.circulationHealth.overdueAssets.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Current Room</TableHead>
                        <TableHead>Checked Out At</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Last Handled By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {insights.circulationHealth.overdueAssets.map((asset) => (
                        <TableRow key={asset.assetId}>
                          <TableCell className="whitespace-normal">
                            <div>
                              <p className="font-medium">{asset.assetName}</p>
                              <p className="text-xs text-muted-foreground">{asset.assetCode}</p>
                            </div>
                          </TableCell>
                          <TableCell>{asset.currentRoom}</TableCell>
                          <TableCell>{formatDateTime(asset.checkedOutAt)}</TableCell>
                          <TableCell className="font-medium text-status-warning">
                            {formatHoursShort(asset.durationHours)}
                          </TableCell>
                          <TableCell>{asset.lastHandledBy || 'Not recorded'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState
                    title="No overdue assets"
                    description="Nothing currently in use is beyond the configured long-hold threshold."
                    className="py-10"
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Risks & Exceptions</h2>
              <p className="text-sm text-muted-foreground">Signals from event mix and audit mismatch rates across locations.</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Event Type Breakdown</CardTitle>
                  <CardDescription>Distribution of operational event types in the selected time range.</CardDescription>
                </CardHeader>
                <CardContent>
                  {eventBreakdownChartData.length > 0 ? (
                    <ChartContainer
                      className="h-[320px] w-full aspect-auto"
                      config={{ count: { label: 'Events', color: 'var(--color-chart-5)' } }}
                    >
                      <BarChart
                        data={eventBreakdownChartData}
                        layout="vertical"
                        margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
                      >
                        <CartesianGrid horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="shortLabel"
                          width={128}
                          tickLine={false}
                          axisLine={false}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
                            />
                          }
                        />
                        <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="var(--color-count)" />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <EmptyState
                      title="No event data in this window"
                      description="Event distribution appears once the selected period has recorded activity."
                      className="py-10"
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Audit Mismatch Rate by Location</CardTitle>
                  <CardDescription>Mismatch rate from completed audits over the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.risks.auditMismatchByLocation.length > 0 ? (
                    <ChartContainer
                      className="h-[320px] w-full aspect-auto"
                      config={{ mismatchRate: { label: 'Mismatch Rate', color: 'var(--color-chart-1)' } }}
                    >
                      <BarChart data={insights.risks.auditMismatchByLocation} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="locationName" tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, _, item) => {
                                const row = item.payload;
                                return (
                                  <div className="space-y-1">
                                    <p className="font-medium">{formatPercent(Number(value))}</p>
                                    <p className="text-muted-foreground">
                                      {row.mismatchCount} mismatches across {row.auditCount} audit{row.auditCount === 1 ? '' : 's'}
                                    </p>
                                  </div>
                                );
                              }}
                              labelFormatter={(_, payload) => payload?.[0]?.payload?.locationName ?? ''}
                            />
                          }
                        />
                        <Bar dataKey="mismatchRate" radius={[8, 8, 0, 0]} fill="var(--color-mismatchRate)" />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <EmptyState
                      title="No completed audits in this window"
                      description="Audit mismatch analytics appear after completed audits fall inside the selected date range."
                      className="py-10"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Recommendations</h2>
              <p className="text-sm text-muted-foreground">Deterministic operational recommendations derived from live inventory and event signals.</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              {insights.recommendations.map((recommendation) => (
                <RecommendationCard key={recommendation.id} recommendation={recommendation} />
              ))}
            </div>
          </section>
        </>
      ) : (
        <Card>
          <CardContent>
            <EmptyState
              icon={Warehouse}
              title="Insights will populate once data is available"
              description="Connect the database, track some asset activity, and completed audits will start surfacing operational analytics here."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

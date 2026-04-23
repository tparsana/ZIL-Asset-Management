'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Scan, CheckSquare, Package, Settings } from 'lucide-react';
import { ActivityRow } from '@/components/shared/activity-row';
import { AssetThumbnail } from '@/components/shared/asset-thumbnail';
import { EmptyState } from '@/components/shared/empty-state';
import { QuickActionCard } from '@/components/shared/quick-action-card';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { DashboardSummary } from '@/lib/types';
import { ChevronDown } from 'lucide-react';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const response = await fetch('/api/dashboard', { cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to load dashboard data');
        const data = await response.json();
        if (!cancelled) setDashboard(data);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-5 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold text-balance sm:text-3xl">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Zoom Innovation Lab Asset Management</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <Link href="/scan" className="block h-full">
            <QuickActionCard title="Scan Asset" description="Find and update one asset" icon={Scan} />
          </Link>
          <Link href="/batch-scan" className="block h-full">
            <QuickActionCard title="Batch Scan" description="Apply actions to multiple assets" icon={CheckSquare} />
          </Link>
          <Link href="/inventory" className="block h-full">
            <QuickActionCard title="View Inventory" description="Browse all tracked equipment" icon={Package} />
          </Link>
          <Link href="/settings" className="block h-full">
            <QuickActionCard title="Settings" description="Add assets and manage setup" icon={Settings} />
          </Link>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{error}. Check `DATABASE_URL` and run migrations/seed.</CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Operational Summary</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard className="min-h-28" title="Total Assets" value={loading ? '...' : String(dashboard?.totals.totalAssets ?? 0)} description="Active tracked assets" />
          <StatCard className="min-h-28" title="Available" value={loading ? '...' : String(dashboard?.totals.available ?? 0)} description="Ready to use" variant="success" />
          <StatCard className="min-h-28" title="In Use" value={loading ? '...' : String(dashboard?.totals.inUse ?? 0)} description="Currently checked out" variant="info" />
          <StatCard className="min-h-28" title="Missing" value={loading ? '...' : String(dashboard?.totals.missing ?? 0)} description="Unlocated items" variant="danger" />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Location Status</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assets by Location</CardTitle>
            <CardDescription>Expand a location to quickly see what is currently there</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard && dashboard.locationSummary.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {dashboard.locationSummary.map((location) => (
                  <Collapsible key={location.id} className="rounded-lg border bg-card">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/locations?id=${location.id}`} className="min-w-0 hover:underline">
                          <p className="font-medium truncate">{location.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{location.kind}</p>
                        </Link>
                        <div className="flex items-start gap-3">
                          <div className="text-right">
                            <p className="text-2xl font-semibold">{location.assetCount ?? 0}</p>
                            <p className="text-xs text-muted-foreground">{location.awayFromHomeCount ?? 0} in use</p>
                          </div>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <ChevronDown className="h-4 w-4" />
                              <span className="sr-only">Toggle {location.name} assets</span>
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <div className="max-h-72 overflow-y-auto border-t px-4 py-3">
                        {location.currentAssets && location.currentAssets.length > 0 ? (
                          <div className="space-y-2">
                            {location.currentAssets.map((asset) => (
                              <Link key={asset.id} href={`/assets/${asset.id}`} className="flex items-center justify-between gap-3 rounded-md p-2 hover:bg-accent/50">
                                <div className="flex min-w-0 items-center gap-3">
                                  <AssetThumbnail src={asset.referenceImageUrl} alt={asset.name} className="h-10 w-10" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{asset.name}</p>
                                    <p className="text-xs text-muted-foreground">{asset.assetId}</p>
                                  </div>
                                </div>
                                <StatusBadge status={asset.status} size="sm" />
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No assets currently in this location.</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No location data available"
                description="Run the seed script to create the required ZIL locations."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Transaction Log</CardTitle>
            <CardDescription>Last movements and status changes</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard && dashboard.recentActivity.length > 0 ? (
              <div className="space-y-3">
                <div className="max-h-80 space-y-1 overflow-y-auto pr-2">
                  {dashboard.recentActivity.map((event) => (
                    <ActivityRow key={event.id} activity={event} />
                  ))}
                </div>
                <Button variant="ghost" className="w-full" asChild>
                  <Link href="/history">Open full history</Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                title="No recent activity yet"
                description="Transactions will appear here once assets begin moving through the system."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

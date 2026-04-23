'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BackButton } from '@/components/shared/back-button';
import { AssetThumbnail } from '@/components/shared/asset-thumbnail';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { ActivityRow } from '@/components/shared/activity-row';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Asset, AssetEvent, Location } from '@/lib/types';
import { MapPin, Package } from 'lucide-react';

interface LocationDetails {
  location: Location;
  currentAssets: Asset[];
  awayFromHomeAssets: Asset[];
  recentActivity: AssetEvent[];
}

function LocationsContent() {
  const searchParams = useSearchParams();
  const selectedLocationId = searchParams.get('id');
  const [locations, setLocations] = useState<Location[]>([]);
  const [details, setDetails] = useState<LocationDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLocations() {
      setLoading(true);
      const url = selectedLocationId ? `/api/locations?id=${encodeURIComponent(selectedLocationId)}` : '/api/locations';
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        if (!cancelled) {
          setLocations([]);
          setDetails(null);
          setLoading(false);
        }
        return;
      }
      const data = await response.json();
      if (!cancelled) {
        if (selectedLocationId) {
          setDetails(data);
          setLocations([]);
        } else {
          setLocations(data.locations);
          setDetails(null);
        }
        setLoading(false);
      }
    }

    loadLocations();
    return () => {
      cancelled = true;
    };
  }, [selectedLocationId]);

  if (selectedLocationId) {
    return (
      <div className="space-y-6 p-4 sm:p-5 lg:p-6">
        <div className="space-y-3">
          <BackButton fallbackHref="/locations" />
          <div>
            <h1 className="text-2xl font-bold text-balance sm:text-3xl">{details?.location.name ?? 'Location Details'}</h1>
            <p className="text-muted-foreground mt-2">Current assets, items in use, and recent location activity</p>
          </div>
        </div>

        {details ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] xl:gap-6">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Current Assets ({details.currentAssets.length})</CardTitle>
                <CardDescription>Assets physically assigned to this current location</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[34rem] overflow-y-auto pr-3">
                {details.currentAssets.length > 0 ? (
                  <div className="space-y-2">
                    {details.currentAssets.map((asset) => (
                      <Link key={asset.id} href={`/assets/${asset.id}`} className="flex flex-col gap-3 rounded-lg border p-3 hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <AssetThumbnail src={asset.referenceImageUrl} alt={asset.name} className="h-12 w-12" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{asset.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{asset.assetId} · Home Location: {asset.homeLocation.name}</p>
                          </div>
                        </div>
                        <StatusBadge status={asset.status} size="sm" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No assets in this location" description="Moved or created assets will appear here." />
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>In Use</CardTitle>
                  <CardDescription>Items currently being used outside their home location</CardDescription>
                </CardHeader>
                <CardContent className="max-h-80 overflow-y-auto pr-3">
                  {details.awayFromHomeAssets.length > 0 ? (
                    <div className="space-y-2">
                      {details.awayFromHomeAssets.map((asset) => (
                        <Link key={asset.id} href={`/assets/${asset.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50">
                          <AssetThumbnail src={asset.referenceImageUrl} alt={asset.name} className="h-12 w-12" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{asset.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{asset.assetId} · Home: {asset.homeLocation.name}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No in-use assets here.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="max-h-80 overflow-y-auto pr-3">
                  {details.recentActivity.length > 0 ? (
                    <div className="space-y-1">
                      {details.recentActivity.map((event) => <ActivityRow key={event.id} activity={event} />)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No activity for this location yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent>
              <EmptyState title={loading ? 'Loading location...' : 'Location not found'} />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-5 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold text-balance sm:text-3xl">Locations</h1>
        <p className="text-muted-foreground mt-2">Rooms and storage areas at the Zoom Innovation Lab</p>
      </div>

      {locations.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {locations.map((location) => (
            <Card key={location.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{location.name}</CardTitle>
                      <CardDescription className="text-xs capitalize">{location.kind}</CardDescription>
                    </div>
                  </div>
                </div>
                {location.description && <p className="text-sm text-muted-foreground mt-3">{location.description}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">Assets</div>
                    <div className="text-xl font-semibold mt-1">{location.assetCount ?? 0}</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground">In Use</div>
                    <div className="text-xl font-semibold mt-1">{location.awayFromHomeCount ?? 0}</div>
                  </div>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/locations?id=${location.id}`}>
                    <Package className="h-4 w-4 mr-2" />
                    View Assets
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <EmptyState
              title={loading ? 'Loading locations...' : 'No locations found'}
              description="Run the database seed to create Room 140, Room 135, Room 134, Room 133, ZIL Store, and Upstairs Storage."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function LocationsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground sm:p-5 lg:p-6">Loading locations...</div>}>
      <LocationsContent />
    </Suspense>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/shared/empty-state';
import { AssetThumbnail } from '@/components/shared/asset-thumbnail';
import { StatusBadge } from '@/components/shared/status-badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Asset, AssetStatus, AssetTypeInfo, Location } from '@/lib/types';
import { Search, Filter, Package, LayoutGrid, List } from 'lucide-react';

type TabFilter = 'all' | AssetStatus | 'consumables';
type ViewMode = 'grid' | 'list';

export default function InventoryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetTypeInfo[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      try {
        const [assetsResponse, typesResponse, locationsResponse] = await Promise.all([
          fetch('/api/assets', { cache: 'no-store' }),
          fetch('/api/asset-types', { cache: 'no-store' }),
          fetch('/api/locations', { cache: 'no-store' }),
        ]);
        if (!assetsResponse.ok || !typesResponse.ok || !locationsResponse.ok) {
          throw new Error('Unable to load inventory');
        }
        const [assetsData, typesData, locationsData] = await Promise.all([
          assetsResponse.json(),
          typesResponse.json(),
          locationsResponse.json(),
        ]);

        if (!cancelled) {
          setAssets(assetsData.assets);
          setAssetTypes(typesData.assetTypes);
          setLocations(locationsData.locations);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load inventory');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInventory();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          asset.name.toLowerCase().includes(query) ||
          asset.assetId.toLowerCase().includes(query) ||
          asset.serialNumber?.toLowerCase().includes(query) ||
          asset.assetType.name.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (activeTab === 'consumables') {
        if (!asset.consumable) return false;
      } else if (activeTab !== 'all' && asset.status !== activeTab) {
        return false;
      }

      if (typeFilter !== 'all' && asset.assetTypeId !== typeFilter) return false;
      if (locationFilter !== 'all' && asset.currentLocationId !== locationFilter) return false;

      return true;
    });
  }, [assets, searchQuery, activeTab, typeFilter, locationFilter]);

  const tabCounts = useMemo(() => ({
    all: assets.length,
    available: assets.filter((asset) => asset.status === 'available').length,
    'in-use': assets.filter((asset) => asset.status === 'in-use').length,
    missing: assets.filter((asset) => asset.status === 'missing').length,
    'in-repair': assets.filter((asset) => asset.status === 'in-repair').length,
    consumables: assets.filter((asset) => asset.consumable).length,
  }), [assets]);

  return (
    <div className="space-y-6 p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance sm:text-3xl">Inventory</h1>
          <p className="text-muted-foreground mt-2">Browse and search all assets</p>
        </div>
        <div className="flex w-full gap-2 lg:w-auto">
          <div className="relative min-w-0 flex-1 lg:w-80 lg:flex-none xl:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-3 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Asset Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {assetTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Location</label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabFilter)}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6 h-auto">
          <TabsTrigger value="all" className="text-xs">All <span className="ml-1 text-[10px] text-muted-foreground">({tabCounts.all})</span></TabsTrigger>
          <TabsTrigger value="available" className="text-xs">Available <span className="ml-1 text-[10px] text-muted-foreground">({tabCounts.available})</span></TabsTrigger>
          <TabsTrigger value="in-use" className="text-xs">In Use <span className="ml-1 text-[10px] text-muted-foreground">({tabCounts['in-use']})</span></TabsTrigger>
          <TabsTrigger value="missing" className="text-xs">Missing <span className="ml-1 text-[10px] text-muted-foreground">({tabCounts.missing})</span></TabsTrigger>
          <TabsTrigger value="in-repair" className="text-xs hidden lg:flex">In Repair <span className="ml-1 text-[10px] text-muted-foreground">({tabCounts['in-repair']})</span></TabsTrigger>
          <TabsTrigger value="consumables" className="text-xs hidden lg:flex">Consumables <span className="ml-1 text-[10px] text-muted-foreground">({tabCounts.consumables})</span></TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {filteredAssets.length > 0 ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'space-y-2'}>
              {filteredAssets.map((asset) => (
                <Link key={asset.id} href={`/assets/${asset.id}`}>
                  {viewMode === 'grid' ? (
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2 gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <AssetThumbnail src={asset.referenceImageUrl} alt={asset.name} />
                            <div className="min-w-0">
                              <h3 className="font-medium text-sm truncate">{asset.name}</h3>
                              <p className="text-xs text-muted-foreground">{asset.assetId}</p>
                            </div>
                          </div>
                          <StatusBadge status={asset.status} size="sm" />
                        </div>
                        <div className="space-y-1 text-xs">
                          <p><span className="text-muted-foreground">Type:</span> {asset.assetType.name}</p>
                          <p><span className="text-muted-foreground">Current Location:</span> {asset.currentLocation.name}</p>
                          <p><span className="text-muted-foreground">Home Location:</span> {asset.homeLocation.name}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-3 flex items-center justify-between gap-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <AssetThumbnail src={asset.referenceImageUrl} alt={asset.name} className="h-12 w-12" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{asset.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{asset.assetId} · {asset.assetType.name} · {asset.currentLocation.name}</p>
                          </div>
                        </div>
                        <StatusBadge status={asset.status} size="sm" />
                      </CardContent>
                    </Card>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Package}
                  title={loading ? 'Loading inventory...' : 'No assets found'}
                  description={assets.length === 0
                    ? 'Assets will appear here once they are added in Settings.'
                    : 'No assets match your current filters. Try adjusting your search.'}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </Tabs>
    </div>
  );
}

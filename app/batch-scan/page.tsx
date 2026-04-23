'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BackButton } from '@/components/shared/back-button';
import { AssetThumbnail } from '@/components/shared/asset-thumbnail';
import { ScannerPanel } from '@/components/shared/scanner-panel';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import type { Asset, Location, AppUser } from '@/lib/types';
import { Layers, X, ArrowRightLeft, LogIn, LogOut } from 'lucide-react';

type BatchAction = 'move' | 'checkout' | 'return';

const actionLabels: Record<BatchAction, string> = {
  move: 'Move to Location',
  checkout: 'Mark In Use',
  return: 'Return to Home Location',
};

export default function BatchScanPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [assetCode, setAssetCode] = useState('');
  const [scannedAssets, setScannedAssets] = useState<Asset[]>([]);
  const [selectedAction, setSelectedAction] = useState<BatchAction | ''>('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [handledBy, setHandledBy] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadReferenceData() {
      const [locationsResponse, usersResponse] = await Promise.all([
        fetch('/api/locations', { cache: 'no-store' }),
        fetch('/api/users', { cache: 'no-store' }),
      ]);
      if (locationsResponse.ok) setLocations((await locationsResponse.json()).locations);
      if (usersResponse.ok) setUsers((await usersResponse.json()).users);
    }
    loadReferenceData();
  }, []);

  async function addAsset(code: string) {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/assets/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: code.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Asset not found');
      setScannedAssets((current) => {
        if (current.some((asset) => asset.id === data.asset.id)) {
          toast.info('Asset is already in this batch');
          return current;
        }
        return [...current, data.asset];
      });
      setAssetCode('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Asset lookup failed');
    } finally {
      setLoading(false);
    }
  }

  async function processBatch() {
    if (!selectedAction) return;
    if ((selectedAction === 'move' || selectedAction === 'checkout') && !selectedLocation) {
      toast.error('Destination location is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetIds: scannedAssets.map((asset) => asset.id),
          action: selectedAction,
          toLocationId: selectedLocation,
          handledBy,
          remarks,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Batch action failed');
      toast.success(`Processed ${data.assets.length} assets`);
      setScannedAssets([]);
      setSelectedAction('');
      setSelectedLocation('');
      setHandledBy('');
      setRemarks('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Batch action failed');
    } finally {
      setLoading(false);
    }
  }

  const canPerformAction =
    scannedAssets.length > 0 &&
    selectedAction &&
    (selectedAction === 'return' || selectedLocation);

  return (
    <div className="space-y-6 p-4 sm:p-5 lg:p-6">
      <div className="space-y-3">
        <BackButton fallbackHref="/" />
        <div>
          <h1 className="text-2xl font-bold text-balance sm:text-3xl">Batch Scan</h1>
          <p className="text-muted-foreground mt-2">Select multiple assets and apply one backend-logged action to all of them</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.6fr)] lg:gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.7fr)]">
        <div className="space-y-4">
          <ScannerPanel
            onScanResult={addAsset}
            manualValue={assetCode}
            onManualValueChange={setAssetCode}
            onManualSubmit={addAsset}
            manualButtonLabel="Add"
            manualDisabled={loading}
            helpText="Scan each asset QR code, or enter asset IDs manually to build the batch."
          />
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Selected Assets ({scannedAssets.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {scannedAssets.length > 0 ? (
                <div className="space-y-2">
                  <div className="max-h-96 space-y-2 overflow-y-auto pr-2">
                    {scannedAssets.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex min-w-0 items-center gap-3">
                          <AssetThumbnail src={asset.referenceImageUrl} alt={asset.name} className="h-12 w-12" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{asset.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{asset.assetId} · {asset.currentLocation.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={asset.status} size="sm" />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScannedAssets((current) => current.filter((item) => item.id !== asset.id))}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-2" onClick={() => setScannedAssets([])}>Clear All</Button>
                </div>
              ) : (
                <EmptyState title="No assets selected yet" description="Enter or scan asset IDs to add them to this batch." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Batch Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Button variant={selectedAction === 'move' ? 'default' : 'outline'} className="h-auto py-3 flex flex-col gap-1" onClick={() => setSelectedAction('move')}>
                  <ArrowRightLeft className="h-5 w-5" />
                  <span className="text-xs">{actionLabels.move}</span>
                </Button>
                <Button variant={selectedAction === 'checkout' ? 'default' : 'outline'} className="h-auto py-3 flex flex-col gap-1" onClick={() => setSelectedAction('checkout')}>
                  <LogOut className="h-5 w-5" />
                  <span className="text-xs">{actionLabels.checkout}</span>
                </Button>
                <Button variant={selectedAction === 'return' ? 'default' : 'outline'} className="h-auto py-3 flex flex-col gap-1" onClick={() => setSelectedAction('return')}>
                  <LogIn className="h-5 w-5" />
                  <span className="text-xs">{actionLabels.return}</span>
                </Button>
              </div>

              {selectedAction && selectedAction !== 'return' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Destination Location</label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Handled By</label>
                <Input value={handledBy} onChange={(event) => setHandledBy(event.target.value)} list="batch-users" placeholder="Optional staff name" />
                <datalist id="batch-users">
                  {users.map((user) => <option key={user.id} value={user.name} />)}
                </datalist>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={3} />
              </div>

              <Button className="w-full" disabled={!canPerformAction || loading} onClick={processBatch}>
                <Layers className="h-4 w-4 mr-2" />
                Process Batch ({scannedAssets.length} items)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AssetThumbnail } from '@/components/shared/asset-thumbnail';
import { ScannerPanel } from '@/components/shared/scanner-panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AppUser, Asset, Location } from '@/lib/types';
import { Layers, LogIn, LogOut, X } from 'lucide-react';

type ActionModalType = 'checkout' | 'return' | null;
const TEMP_USE_ROOMS = ['Room 133', 'Room 134', 'Room 135', 'Room 140'] as const;

const actionCopy: Record<Exclude<ActionModalType, null>, { title: string; confirm: string; needsLocation?: boolean }> = {
  checkout: { title: 'Check Out for Temporary Use', confirm: 'Check Out Asset', needsLocation: true },
  return: { title: 'Return to Home Location', confirm: 'Confirm Return' },
};

export default function ScanPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [assetCode, setAssetCode] = useState('');
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [batchAssets, setBatchAssets] = useState<Asset[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [actionModal, setActionModal] = useState<ActionModalType>(null);
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

  const checkoutRooms = locations.filter((location) =>
    TEMP_USE_ROOMS.includes(location.name as (typeof TEMP_USE_ROOMS)[number])
  );
  const canCheckout = scannedAsset?.status === 'available';
  const canReturn = scannedAsset?.status === 'in-use';
  const batchAllAvailable = batchAssets.length > 0 && batchAssets.every((asset) => asset.status === 'available');
  const batchAllInUse = batchAssets.length > 0 && batchAssets.every((asset) => asset.status === 'in-use');

  async function fetchAssetByCode(code: string) {
    const response = await fetch('/api/assets/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: code.trim() }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Asset not found');
    return data.asset as Asset;
  }

  async function lookupAsset(code: string) {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const asset = await fetchAssetByCode(code);

      if (batchMode) {
        setBatchAssets((current) => {
          if (current.some((item) => item.id === asset.id)) {
            toast.info('Asset is already in this batch');
            return current;
          }
          return [...current, asset];
        });
        setAssetCode('');
      } else {
        setScannedAsset(asset);
        setAssetCode(asset.assetId);
      }
    } catch (error) {
      if (!batchMode) setScannedAsset(null);
      toast.error(error instanceof Error ? error.message : 'Asset lookup failed');
    } finally {
      setLoading(false);
    }
  }

  function openAction(action: ActionModalType) {
    setActionModal(action);
    setSelectedLocation('');
    setHandledBy('');
    setRemarks('');
  }

  async function confirmAction() {
    if (!actionModal) return;

    if (actionCopy[actionModal].needsLocation && !selectedLocation) {
      toast.error(batchMode ? 'Select the room where these assets will be used' : 'Select the room where this asset will be used');
      return;
    }

    setLoading(true);
    try {
      if (batchMode) {
        const response = await fetch('/api/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assetIds: batchAssets.map((asset) => asset.id),
            action: actionModal,
            toLocationId: selectedLocation,
            handledBy,
            remarks,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update assets');
        setBatchAssets([]);
      } else {
        if (!scannedAsset) return;

        const response = await fetch(`/api/assets/${encodeURIComponent(scannedAsset.id)}/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: actionModal,
            toLocationId: selectedLocation,
            handledBy,
            remarks,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update asset');
        setScannedAsset(data.asset);
      }

      setActionModal(null);
      toast.success(batchMode ? 'Assets updated' : 'Asset updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : batchMode ? 'Failed to update assets' : 'Failed to update asset');
    } finally {
      setLoading(false);
    }
  }

  function toggleBatchMode() {
    setBatchMode((current) => !current);
    setActionModal(null);
    setSelectedLocation('');
    setHandledBy('');
    setRemarks('');
    setAssetCode('');
    setScannedAsset(null);
    setBatchAssets([]);
  }

  return (
    <div className="space-y-6 p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance sm:text-3xl">Scan Asset</h1>
          <p className="text-muted-foreground mt-2">
            {batchMode
              ? 'Scan multiple asset IDs to build a batch for temporary checkout or return.'
              : 'Scan or enter an asset ID to check out for use or return to the home location.'}
          </p>
        </div>
        <Button variant={batchMode ? 'default' : 'outline'} onClick={toggleBatchMode} className="w-full sm:w-auto">
          <Layers className="mr-2 h-4 w-4" />
          {batchMode ? 'Exit Batch Add' : 'Batch Add'}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)] lg:gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <ScannerPanel
            onScanResult={lookupAsset}
            manualValue={assetCode}
            onManualValueChange={setAssetCode}
            onManualSubmit={lookupAsset}
            manualButtonLabel={batchMode ? 'Add' : 'Lookup'}
            manualDisabled={loading}
            helpText={
              batchMode
                ? 'Use the camera when possible, or enter asset IDs manually to add multiple items to the same temporary-use action.'
                : 'Use the camera when possible, or enter an asset ID to check equipment out for use or return it home.'
            }
          />
        </div>

        <div className="space-y-4">
          {batchMode ? (
            <>
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Selected Assets ({batchAssets.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {batchAssets.length > 0 ? (
                    <div className="space-y-3">
                      <div className="max-h-80 space-y-2 overflow-y-auto pr-2">
                        {batchAssets.map((asset) => (
                          <div key={asset.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/35 p-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <AssetThumbnail src={asset.referenceImageUrl} alt={asset.name} className="h-12 w-12 rounded-lg" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{asset.name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {asset.assetId} · {asset.currentLocation.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={asset.status} size="sm" />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setBatchAssets((current) => current.filter((item) => item.id !== asset.id))}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => setBatchAssets([])}>
                        Clear Selected Assets
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AssetThumbnail alt="No assets selected" className="mb-4 h-16 w-16 rounded-full" />
                      <h3 className="text-lg font-semibold">No Assets Selected</h3>
                      <p className="mt-2 text-muted-foreground">
                        Scan or enter asset IDs to build a batch for checkout or return.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-1"
                  onClick={() => openAction('checkout')}
                  disabled={!batchAllAvailable}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm">Check Out</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-1"
                  onClick={() => openAction('return')}
                  disabled={!batchAllInUse}
                >
                  <LogIn className="h-5 w-5" />
                  <span className="text-sm">Return</span>
                </Button>
              </div>
            </>
          ) : scannedAsset ? (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <AssetThumbnail src={scannedAsset.referenceImageUrl} alt={scannedAsset.name} className="h-20 w-20 rounded-xl" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-xl font-bold">{scannedAsset.name}</h2>
                          <p className="text-muted-foreground text-sm">{scannedAsset.assetId}</p>
                        </div>
                        <StatusBadge status={scannedAsset.status} size="lg" />
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                        <div><span className="text-muted-foreground">Type:</span> {scannedAsset.assetType.name}</div>
                        <div><span className="text-muted-foreground">Current:</span> {scannedAsset.currentLocation.name}</div>
                        <div><span className="text-muted-foreground">Home:</span> {scannedAsset.homeLocation.name}</div>
                        {scannedAsset.serialNumber && <div><span className="text-muted-foreground">Serial:</span> {scannedAsset.serialNumber}</div>}
                      </div>
                      {scannedAsset.notes && (
                        <p className="mt-3 rounded-lg bg-muted/50 p-2 text-sm text-muted-foreground">{scannedAsset.notes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-1"
                  onClick={() => openAction('checkout')}
                  disabled={!canCheckout}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm">Check Out</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-1"
                  onClick={() => openAction('return')}
                  disabled={!canReturn}
                >
                  <LogIn className="h-5 w-5" />
                  <span className="text-sm">Return</span>
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <AssetThumbnail alt="No asset loaded" className="mb-4 h-16 w-16 rounded-full" />
                <h3 className="text-lg font-semibold">No Asset Loaded</h3>
                <p className="mt-2 text-muted-foreground">Enter an asset ID or scan a QR code to check it out for use or return it home.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={actionModal !== null} onOpenChange={(open) => !open && setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionModal ? actionCopy[actionModal].title : batchMode ? 'Update Assets' : 'Update Asset'}</DialogTitle>
            <DialogDescription>
              {batchMode
                ? `${batchAssets.length} selected asset${batchAssets.length === 1 ? '' : 's'}`
                : scannedAsset
                  ? `${scannedAsset.name} (${scannedAsset.assetId})`
                  : 'Select an asset first'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {actionModal && actionCopy[actionModal].needsLocation && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Room In Use</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent>
                    {checkoutRooms.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Handled By</label>
              <Input value={handledBy} onChange={(event) => setHandledBy(event.target.value)} list="scan-users" placeholder="Optional staff name" />
              <datalist id="scan-users">
                {users.map((user) => <option key={user.id} value={user.name} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea placeholder="Add details about this action..." value={remarks} onChange={(event) => setRemarks(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button onClick={confirmAction} disabled={loading}>
              {actionModal ? actionCopy[actionModal].confirm : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BackButton } from '@/components/shared/back-button';
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
import type { Asset, Location, AppUser } from '@/lib/types';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle,
  LogIn,
  LogOut,
  Wrench,
} from 'lucide-react';

type ActionModalType = 'checkout' | 'return' | 'move' | 'missing' | 'in-repair' | 'available' | null;

const actionCopy: Record<Exclude<ActionModalType, null>, { title: string; confirm: string; needsLocation?: boolean; variant?: 'default' | 'destructive' }> = {
  checkout: { title: 'Mark In Use', confirm: 'Confirm In Use', needsLocation: true },
  return: { title: 'Return to Home Location', confirm: 'Confirm Return' },
  move: { title: 'Move Asset', confirm: 'Confirm Move', needsLocation: true },
  missing: { title: 'Mark Missing', confirm: 'Mark Missing', variant: 'destructive' },
  'in-repair': { title: 'Mark In Repair', confirm: 'Mark In Repair' },
  available: { title: 'Restore to Available', confirm: 'Restore Available' },
};

export default function ScanPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [assetCode, setAssetCode] = useState('');
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
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

  async function lookupAsset(code: string) {
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
      setScannedAsset(data.asset);
      setAssetCode(data.asset.assetId);
    } catch (error) {
      setScannedAsset(null);
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
    if (!scannedAsset || !actionModal) return;
    const config = actionCopy[actionModal];
    if (config.needsLocation && !selectedLocation) {
      toast.error('Destination location is required');
      return;
    }

    setLoading(true);
    try {
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
      setActionModal(null);
      toast.success('Asset updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update asset');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-5 lg:p-6">
      <div className="space-y-3">
        <BackButton fallbackHref="/" />
        <div>
          <h1 className="text-2xl font-bold text-balance sm:text-3xl">Scan Asset</h1>
          <p className="text-muted-foreground mt-2">Scan or manually enter an asset ID to view and manage equipment</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)] lg:gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <ScannerPanel
            onScanResult={lookupAsset}
            manualValue={assetCode}
            onManualValueChange={setAssetCode}
            onManualSubmit={lookupAsset}
            manualDisabled={loading}
            helpText="Use the camera when possible, or enter an asset ID if a tag is unreadable."
          />
        </div>

        <div className="space-y-4">
          {scannedAsset ? (
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
                        <p className="mt-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">{scannedAsset.notes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Available Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => openAction('checkout')}>
                      <LogOut className="h-5 w-5" />
                      <span className="text-xs">Mark In Use</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => openAction('move')}>
                      <ArrowRightLeft className="h-5 w-5" />
                      <span className="text-xs">Move</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => openAction('return')}>
                      <LogIn className="h-5 w-5" />
                      <span className="text-xs">Return</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => openAction('missing')}>
                      <AlertTriangle className="h-5 w-5" />
                      <span className="text-xs">Mark Missing</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => openAction('in-repair')}>
                      <Wrench className="h-5 w-5" />
                      <span className="text-xs">In Repair</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-3 flex flex-col gap-1" onClick={() => openAction('available')}>
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-xs">Available</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <AssetThumbnail alt="No asset loaded" className="h-16 w-16 rounded-full mb-4" />
                <h3 className="font-semibold text-lg">No Asset Loaded</h3>
                <p className="text-muted-foreground mt-2">Enter an asset ID or scan a QR code to take action</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={actionModal !== null} onOpenChange={(open) => !open && setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionModal ? actionCopy[actionModal].title : 'Update Asset'}</DialogTitle>
            <DialogDescription>{scannedAsset ? `${scannedAsset.name} (${scannedAsset.assetId})` : 'Select an asset first'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {actionModal && actionCopy[actionModal].needsLocation && (
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
            <Button
              onClick={confirmAction}
              disabled={loading}
              variant={actionModal && actionCopy[actionModal].variant === 'destructive' ? 'destructive' : 'default'}
            >
              {actionModal ? actionCopy[actionModal].confirm : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

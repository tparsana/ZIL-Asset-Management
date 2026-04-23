'use client';

import { FormEvent, use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BackButton } from '@/components/shared/back-button';
import { AssetThumbnail } from '@/components/shared/asset-thumbnail';
import { QrCodeCard } from '@/components/shared/qr-code-card';
import { ReferenceImageField, shortenImageUrl } from '@/components/shared/reference-image-field';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Asset, AssetEvent, AssetStatus, AssetTypeInfo, Location } from '@/lib/types';
import { formatDateTime, formatEventType } from '@/lib/format';
import { Package, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

const statuses: Array<{ value: AssetStatus; label: string }> = [
  { value: 'available', label: 'Available' },
  { value: 'in-use', label: 'In Use' },
  { value: 'missing', label: 'Missing' },
  { value: 'in-repair', label: 'In Repair' },
  { value: 'retired', label: 'Retired' },
];

function dateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [events, setEvents] = useState<AssetEvent[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetTypeInfo[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regeneratingQr, setRegeneratingQr] = useState(false);
  const [consumable, setConsumable] = useState(false);

  async function loadAsset() {
    const [assetResponse, typesResponse, locationsResponse] = await Promise.all([
      fetch(`/api/assets/${encodeURIComponent(id)}`, { cache: 'no-store' }),
      fetch('/api/asset-types', { cache: 'no-store' }),
      fetch('/api/locations', { cache: 'no-store' }),
    ]);

    const assetData = assetResponse.ok ? await assetResponse.json() : null;
    const typesData = typesResponse.ok ? await typesResponse.json() : { assetTypes: [] };
    const locationsData = locationsResponse.ok ? await locationsResponse.json() : { locations: [] };

    setAsset(assetData?.asset ?? null);
    setEvents(assetData?.events ?? []);
    setAssetTypes(typesData.assetTypes);
    setLocations(locationsData.locations);
    setConsumable(Boolean(assetData?.asset?.consumable));
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await loadAsset();
      } catch {
        if (!cancelled) {
          toast.error('Unable to load asset details');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleUpdateAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!asset) return;

    const form = new FormData(event.currentTarget);
    const payload = {
      assetId: String(form.get('assetId') || ''),
      name: String(form.get('name') || ''),
      assetTypeId: String(form.get('assetTypeId') || ''),
      serialNumber: String(form.get('serialNumber') || ''),
      purchaseDate: String(form.get('purchaseDate') || ''),
      cost: String(form.get('cost') || ''),
      consumable,
      homeLocationId: String(form.get('homeLocationId') || ''),
      currentLocationId: String(form.get('currentLocationId') || ''),
      status: String(form.get('status') || 'available'),
      notes: String(form.get('notes') || ''),
      referenceImageUrl: String(form.get('referenceImageUrl') || ''),
      handledBy: String(form.get('handledBy') || ''),
    };

    setSaving(true);
    try {
      const response = await fetch(`/api/assets/${encodeURIComponent(asset.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update asset');

      setAsset(data.asset);
      setConsumable(data.asset.consumable);
      setEditing(false);
      toast.success('Asset updated');
      await loadAsset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update asset');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAsset() {
    if (!asset) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/assets/${encodeURIComponent(asset.id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete asset');

      toast.success('Asset deleted from active inventory');
      router.push('/inventory');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete asset');
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerateQrCode() {
    if (!asset) return null;

    setRegeneratingQr(true);
    try {
      const handledBy = window.prompt('Handled by (optional)') || undefined;
      const response = await fetch(`/api/assets/${encodeURIComponent(asset.id)}/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handledBy }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to regenerate QR code');

      setAsset(data.asset);
      toast.success('QR code regenerated');
      await loadAsset();
      return data.asset as Asset;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate QR code');
      return null;
    } finally {
      setRegeneratingQr(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-5 lg:p-6">
      <div className="space-y-3">
        <BackButton fallbackHref="/inventory" />
        <div>
          <h1 className="text-2xl font-bold text-balance sm:text-3xl">Asset Details</h1>
          {asset && <p className="text-muted-foreground mt-2">{asset.name} · {asset.assetId}</p>}
        </div>
      </div>

      {asset ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] xl:gap-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <AssetThumbnail src={asset.referenceImageUrl} alt={asset.name} className="h-20 w-20 rounded-xl" />
                  <div className="min-w-0">
                    <CardTitle className="truncate">{asset.name}</CardTitle>
                    <CardDescription>{asset.assetId}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={asset.status} />
                  {!editing && (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {editing ? (
                <form onSubmit={handleUpdateAsset} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Asset Name</Label>
                    <Input id="name" name="name" defaultValue={asset.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assetId">Asset ID</Label>
                    <Input id="assetId" name="assetId" defaultValue={asset.assetId} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Asset Type</Label>
                    <Select name="assetTypeId" defaultValue={asset.assetTypeId} required>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {assetTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.name} ({type.prefix})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select name="status" defaultValue={asset.status}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statuses.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Home Location</Label>
                    <Select name="homeLocationId" defaultValue={asset.homeLocationId} required>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Current Location</Label>
                    <Select name="currentLocationId" defaultValue={asset.currentLocationId} required>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input id="serialNumber" name="serialNumber" defaultValue={asset.serialNumber ?? ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={dateInputValue(asset.purchaseDate)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost</Label>
                    <Input id="cost" name="cost" type="number" step="0.01" min="0" defaultValue={asset.cost ?? ''} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="consumable">Consumable</Label>
                      <p className="text-sm text-muted-foreground">Mark supplies or short-lifecycle items.</p>
                    </div>
                    <Switch id="consumable" checked={consumable} onCheckedChange={setConsumable} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <ReferenceImageField key={`${asset.id}-${asset.referenceImageUrl ?? ''}`} name="referenceImageUrl" defaultValue={asset.referenceImageUrl} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" defaultValue={asset.notes ?? ''} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="handledBy">Handled By</Label>
                    <Input id="handledBy" name="handledBy" placeholder="Optional staff name for the event log" />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2 sm:flex-row sm:justify-between">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" disabled={saving}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Asset
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This retires the asset from active inventory and keeps its immutable event history for audit purposes.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteAsset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Asset
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" variant="outline" onClick={() => {
                        setEditing(false);
                        setConsumable(asset.consumable);
                      }}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                    </div>
                  </div>
                </form>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground">Asset Type</p>
                      <p className="font-medium">{asset.assetType.name}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground">Serial Number</p>
                      <p className="font-medium">{asset.serialNumber || 'Not recorded'}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground">Home Location</p>
                      <p className="font-medium">{asset.homeLocation.name}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground">Current Location</p>
                      <p className="font-medium">{asset.currentLocation.name}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground">Purchase Date</p>
                      <p className="font-medium">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'Not recorded'}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-medium">{asset.cost == null ? 'Not recorded' : `$${asset.cost.toFixed(2)}`}</p>
                    </div>
                  </div>

                  {asset.referenceImageUrl && (
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-sm mb-3">Reference Image</p>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <AssetThumbnail src={asset.referenceImageUrl} alt={asset.name} className="h-28 w-28 rounded-xl" />
                        <Link href={asset.referenceImageUrl} className="min-w-0 truncate text-sm text-primary hover:underline">
                          {shortenImageUrl(asset.referenceImageUrl)}
                        </Link>
                      </div>
                    </div>
                  )}

                  {asset.notes && (
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-sm">Notes</p>
                      <p className="mt-1">{asset.notes}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <QrCodeCard asset={asset} onRegenerate={handleRegenerateQrCode} regenerating={regeneratingQr} />

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Event History</CardTitle>
                <CardDescription>Immutable asset event log</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[32rem] overflow-y-auto pr-3">
                {events.length > 0 ? (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <div key={event.id} className="rounded-lg border p-3">
                        <p className="font-medium">{formatEventType(event.eventType)}</p>
                        <p className="text-sm text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                        {(event.fromLocation || event.toLocation) && (
                          <p className="text-sm text-muted-foreground">
                            {event.fromLocation?.name ?? 'None'} → {event.toLocation?.name ?? 'None'}
                          </p>
                        )}
                        {event.remarks && <p className="text-sm mt-2">{event.remarks}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No events recorded for this asset yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent>
            <EmptyState
              icon={Package}
              title={loading ? 'Loading asset...' : 'Asset not found'}
              description="Check the asset ID or return to inventory."
              action={<Button asChild variant="outline"><Link href="/inventory">Back to Inventory</Link></Button>}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

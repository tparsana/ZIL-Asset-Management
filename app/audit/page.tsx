'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AssetThumbnail } from '@/components/shared/asset-thumbnail';
import { EmptyState } from '@/components/shared/empty-state';
import { ScannerPanel } from '@/components/shared/scanner-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AuditSession, AuditSummary, Location } from '@/lib/types';
import { ClipboardCheck, Play, CheckCircle, AlertTriangle, Copy } from 'lucide-react';

export default function AuditPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [startedBy, setStartedBy] = useState('');
  const [session, setSession] = useState<AuditSession | null>(null);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [assetCode, setAssetCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadLocations() {
      const response = await fetch('/api/locations', { cache: 'no-store' });
      if (response.ok) setLocations((await response.json()).locations);
    }
    loadLocations();
  }, []);

  async function startAudit() {
    if (!selectedLocation) return;
    setLoading(true);
    try {
      const response = await fetch('/api/audits/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: selectedLocation, startedBy }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start audit');
      setSession(data.session);
      setSummary(data.summary);
      toast.success('Audit started');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start audit');
    } finally {
      setLoading(false);
    }
  }

  async function scanAssetCode(code: string) {
    if (!session || !code.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/audits/${session.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to scan asset');
      setSummary(data.summary);
      setAssetCode('');
      toast.success('Audit scan recorded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to scan asset');
    } finally {
      setLoading(false);
    }
  }

  async function completeAudit() {
    if (!session) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/audits/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handledBy: startedBy }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to complete audit');
      setSession(data.session);
      setSummary(data.summary);
      toast.success('Audit completed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete audit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-5 lg:p-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-balance sm:text-3xl">Audit Mode</h1>
        <p className="text-muted-foreground mt-2">Reconcile expected vs. actual assets in a location</p>
      </div>

      {!session ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Start Audit
            </CardTitle>
            <CardDescription>Begin a location inventory check</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger><SelectValue placeholder="Choose a location..." /></SelectTrigger>
                <SelectContent>
                  {locations.map((location) => <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Started By</label>
              <Input value={startedBy} onChange={(event) => setStartedBy(event.target.value)} placeholder="Optional staff name" />
            </div>
            <Button onClick={startAudit} disabled={!selectedLocation || loading} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Start Audit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] xl:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit in Progress</CardTitle>
              <CardDescription>Location: {session.location?.name ?? locations.find((location) => location.id === session.locationId)?.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {session.status === 'in-progress' && (
                <div className="max-w-xl">
                  <ScannerPanel
                    onScanResult={scanAssetCode}
                    manualValue={assetCode}
                    onManualValueChange={setAssetCode}
                    onManualSubmit={scanAssetCode}
                    manualButtonLabel="Scan"
                    manualDisabled={loading}
                    helpText="Scan each audit QR code, or enter an asset ID manually."
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-status-available">
                      <CheckCircle className="h-4 w-4" />
                      <p className="text-sm font-medium">Expected Found</p>
                    </div>
                    <p className="text-2xl font-bold mt-2 sm:text-3xl">{summary?.expectedFound.length ?? 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-status-missing">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="text-sm font-medium">Missing</p>
                    </div>
                    <p className="text-2xl font-bold mt-2 sm:text-3xl">{summary?.missing.length ?? 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Copy className="h-4 w-4" />
                      <p className="text-sm font-medium">Unexpected/Duplicate</p>
                    </div>
                    <p className="text-2xl font-bold mt-2 sm:text-3xl">{(summary?.unexpectedFound.length ?? 0) + (summary?.duplicateScans.length ?? 0)}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <h2 className="font-semibold">Scans</h2>
                {summary && summary.scans.length > 0 ? (
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-2">
                    {summary.scans.map((scan) => (
                      <div key={scan.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium">{scan.asset?.name}</p>
                          <p className="text-sm text-muted-foreground">{scan.asset?.assetId}</p>
                        </div>
                        <span className="text-xs rounded-md bg-muted px-2 py-1 capitalize">{scan.resultType.replace('-', ' ')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No scans yet" description="Scan or enter asset IDs to reconcile this location." />
                )}
              </div>

              {session.status === 'in-progress' && (
                <Button onClick={completeAudit} disabled={loading} className="w-full">Complete Audit</Button>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Missing Items</CardTitle>
              <CardDescription>Expected home-location assets not scanned yet</CardDescription>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto pr-3">
              {summary && summary.missing.length > 0 ? (
                <div className="space-y-2">
                  {summary.missing.map((asset) => (
                    <div key={asset.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <AssetThumbnail src={asset.referenceImageUrl} alt={asset.name} className="h-12 w-12" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{asset.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{asset.assetId} · Current: {asset.currentLocation.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No missing expected assets.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

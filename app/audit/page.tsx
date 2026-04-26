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
import type { AuditReport, AuditSession, AuditSummary, Location } from '@/lib/types';
import { formatDateTime, formatEventType } from '@/lib/format';
import { ClipboardCheck, Play, CheckCircle, AlertTriangle, Copy, Download } from 'lucide-react';

export default function AuditPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [startedBy, setStartedBy] = useState('');
  const [session, setSession] = useState<AuditSession | null>(null);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
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
    if (!startedBy.trim()) {
      toast.error('Enter the staff member starting this audit');
      return;
    }

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
      setReport(null);
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
      setReport(data.report ?? null);
      toast.success(
        data.report?.totals.missing
          ? `Audit completed. ${data.report.totals.missing} item${data.report.totals.missing === 1 ? '' : 's'} marked missing.`
          : 'Audit completed'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete audit');
    } finally {
      setLoading(false);
    }
  }

  function exportAuditReport() {
    if (!report) return;

    const locationName = report.location.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const datePart = report.generatedAt.slice(0, 10);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `audit-report-${locationName || 'location'}-${datePart}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
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
              <Input
                value={startedBy}
                onChange={(event) => setStartedBy(event.target.value)}
                placeholder="Required staff name"
              />
            </div>
            <Button onClick={startAudit} disabled={!selectedLocation || !startedBy.trim() || loading} className="w-full">
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
              <CardDescription>
                {session.status === 'completed'
                  ? 'Assets left unresolved by the audit and now marked missing'
                  : 'Expected home-location assets not scanned yet'}
              </CardDescription>
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

      {session?.status === 'completed' && report && (
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Audit Report</CardTitle>
              <CardDescription>
                Completed {formatDateTime(session.completedAt ?? report.generatedAt)} for {report.location.name}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={exportAuditReport} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Started By</p>
                <p className="mt-1 text-sm font-medium">{report.session.startedBy}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Expected</p>
                <p className="mt-1 text-sm font-medium">{report.totals.expectedAssets}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Scans</p>
                <p className="mt-1 text-sm font-medium">{report.totals.scans}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Found</p>
                <p className="mt-1 text-sm font-medium">{report.totals.expectedFound}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Missing</p>
                <p className="mt-1 text-sm font-medium text-status-missing">{report.totals.missing}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Unexpected/Duplicate</p>
                <p className="mt-1 text-sm font-medium">{report.totals.unexpectedFound + report.totals.duplicateScans}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h2 className="font-semibold">Missing Item Trace</h2>
                <p className="text-sm text-muted-foreground">
                  Each unresolved asset includes its event history for backtracking location, handler, and timeline.
                </p>
              </div>

              {report.missingItems.length > 0 ? (
                <div className="space-y-4">
                  {report.missingItems.map((item) => (
                    <div key={item.asset.id} className="rounded-xl border p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <AssetThumbnail src={item.asset.referenceImageUrl} alt={item.asset.name} className="h-14 w-14 rounded-xl" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.asset.name}</p>
                            <p className="truncate text-sm text-muted-foreground">{item.asset.assetId}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-3 lg:min-w-[420px]">
                          <div className="rounded-lg bg-muted/40 px-3 py-2">
                            <p className="text-xs uppercase tracking-wide">Home</p>
                            <p className="mt-1 text-foreground">{item.asset.homeLocation.name}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 px-3 py-2">
                            <p className="text-xs uppercase tracking-wide">Last Known</p>
                            <p className="mt-1 text-foreground">{item.asset.currentLocation.name}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 px-3 py-2">
                            <p className="text-xs uppercase tracking-wide">Status</p>
                            <p className="mt-1 font-medium text-status-missing">Missing</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-2">
                        {item.eventHistory.length > 0 ? (
                          item.eventHistory.map((event) => (
                            <div key={event.id} className="rounded-lg border bg-muted/15 p-3">
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-2">
                                  <p className="font-medium">{formatEventType(event.eventType)}</p>
                                  {(event.fromLocation || event.toLocation) && (
                                    <p className="text-sm text-muted-foreground">
                                      {event.fromLocation?.name ?? 'None'} → {event.toLocation?.name ?? 'None'}
                                    </p>
                                  )}
                                  {event.remarks && <p className="text-sm">{event.remarks}</p>}
                                </div>
                                <div className="space-y-1 text-sm text-muted-foreground md:text-right">
                                  <p>{formatDateTime(event.createdAt)}</p>
                                  {event.handledBy && <p>by {event.handledBy}</p>}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No event history recorded for this asset yet.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-status-available/20 bg-status-available/5 p-4 text-sm text-muted-foreground">
                  No missing items remained at audit completion. All expected assets were found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

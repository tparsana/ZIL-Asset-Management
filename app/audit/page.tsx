'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { exportAuditReportPdf } from '@/lib/export/audit-report-pdf';
import { AssetThumbnail } from '@/components/shared/asset-thumbnail';
import { EmptyState } from '@/components/shared/empty-state';
import { ScannerPanel } from '@/components/shared/scanner-panel';
import { StaffNameField } from '@/components/shared/staff-name-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AppUser, AuditReport, AuditSession, AuditSummary, Location } from '@/lib/types';
import { formatDateTime, formatEventType } from '@/lib/format';
import { ClipboardCheck, Play, CheckCircle, AlertTriangle, Copy, Download, FolderOpen } from 'lucide-react';

export default function AuditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [auditSessions, setAuditSessions] = useState<AuditSession[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [startedBy, setStartedBy] = useState('');
  const [session, setSession] = useState<AuditSession | null>(null);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [assetCode, setAssetCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  const [exportingAuditId, setExportingAuditId] = useState<string | null>(null);
  const activeSessionId = searchParams.get('session');

  useEffect(() => {
    async function loadReferenceData() {
      const [locationsResponse, auditsResponse, usersResponse] = await Promise.all([
        fetch('/api/locations', { cache: 'no-store' }),
        fetch('/api/audits', { cache: 'no-store' }),
        fetch('/api/users', { cache: 'no-store' }),
      ]);
      if (locationsResponse.ok) setLocations((await locationsResponse.json()).locations);
      if (auditsResponse.ok) setAuditSessions((await auditsResponse.json()).sessions);
      if (usersResponse.ok) setUsers((await usersResponse.json()).users);
    }
    loadReferenceData();
  }, []);

  async function loadAuditSessions() {
    const response = await fetch('/api/audits', { cache: 'no-store' });
    if (response.ok) setAuditSessions((await response.json()).sessions);
  }

  useEffect(() => {
    if (!activeSessionId || activeSessionId === session?.id) return;
    void openAuditSession(activeSessionId, { silent: true });
  }, [activeSessionId, session?.id]);

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
      router.push(`/audit?session=${encodeURIComponent(data.session.id)}`);
      await loadAuditSessions();
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
      await loadAuditSessions();
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

  async function exportAuditReport() {
    if (!report) return;

    setExportingReport(true);
    try {
      await exportAuditReportPdf(report);
      toast.success('Audit report PDF downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export audit report PDF');
    } finally {
      setExportingReport(false);
    }
  }

  async function exportPastAuditReport(auditSessionId: string) {
    setExportingAuditId(auditSessionId);
    try {
      const response = await fetch(`/api/audits/${encodeURIComponent(auditSessionId)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load audit report');
      if (!data.report) throw new Error('Audit report is not available for this session');

      await exportAuditReportPdf(data.report);
      toast.success('Audit report PDF downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export audit report PDF');
    } finally {
      setExportingAuditId(null);
    }
  }

  async function openAuditSession(auditSessionId: string, options?: { silent?: boolean }) {
    setLoading(true);
    try {
      const response = await fetch(`/api/audits/${encodeURIComponent(auditSessionId)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load audit');

      setSession(data.session);
      setSummary(data.summary);
      setReport(data.report ?? null);
      setStartedBy(data.session?.startedBy ?? '');
      setSelectedLocation(data.session?.locationId ?? '');
      if (activeSessionId !== auditSessionId) {
        router.push(`/audit?session=${encodeURIComponent(auditSessionId)}`);
      }
      if (!options?.silent) toast.success('Audit loaded');
    } catch (error) {
      if (!options?.silent) {
        toast.error(error instanceof Error ? error.message : 'Failed to load audit');
      }
    } finally {
      setLoading(false);
    }
  }

  function closeAuditView() {
    setSession(null);
    setSummary(null);
    setReport(null);
    setAssetCode('');
    setStartedBy('');
    setSelectedLocation('');
    router.push('/audit');
  }

  return (
    <div className="space-y-6 p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-balance sm:text-3xl">Audit Mode</h1>
          <p className="text-muted-foreground mt-2">Reconcile expected vs. actual assets in a location</p>
        </div>
        {session && (
          <Button variant="outline" onClick={closeAuditView} className="w-full sm:w-auto">
            Back to Audits
          </Button>
        )}
      </div>

      {!session ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:gap-6">
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
                <StaffNameField
                  value={startedBy}
                  onChange={setStartedBy}
                  users={users}
                  placeholder="Required staff name"
                />
              </div>
              <Button onClick={startAudit} disabled={!selectedLocation || !startedBy.trim() || loading} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Start Audit
              </Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Past Audits
              </CardTitle>
              <CardDescription>Open a previous audit to review its report or resume its session state.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[32rem] overflow-y-auto pr-3">
              {auditSessions.length > 0 ? (
                <div className="space-y-3">
                  {auditSessions.map((auditSession) => (
                    <div key={auditSession.id} className="rounded-xl border p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{auditSession.location?.name ?? 'Unknown location'}</p>
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                                auditSession.status === 'completed'
                                  ? 'bg-status-available/10 text-status-available'
                                  : auditSession.status === 'in-progress'
                                    ? 'bg-status-in-use/10 text-status-in-use'
                                    : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {auditSession.status.replace('-', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Started {formatDateTime(auditSession.startedAt)}
                            {auditSession.startedBy ? ` by ${auditSession.startedBy}` : ''}
                          </p>
                          {auditSession.completedAt && (
                            <p className="text-sm text-muted-foreground">Completed {formatDateTime(auditSession.completedAt)}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          {auditSession.status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => exportPastAuditReport(auditSession.id)}
                              disabled={loading || exportingAuditId === auditSession.id}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              {exportingAuditId === auditSession.id ? 'Exporting...' : 'Export PDF'}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAuditSession(auditSession.id)}
                            disabled={loading || exportingAuditId === auditSession.id}
                          >
                            Open Audit
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No past audits yet"
                  description="Completed or active audit sessions will appear here so they can be reopened later."
                />
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] xl:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{session.status === 'in-progress' ? 'Audit in Progress' : 'Audit Review'}</CardTitle>
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
            <Button
              variant="outline"
              onClick={exportAuditReport}
              disabled={exportingReport}
              className="w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              {exportingReport ? 'Exporting PDF...' : 'Export Report PDF'}
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

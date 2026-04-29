'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  ClipboardCheck,
  History,
  Home,
  ListChecks,
  MapPin,
  Package,
  QrCode,
  Scan,
  Settings,
} from 'lucide-react';
import { AssetCard } from '@/components/shared/asset-card';
import { AssetThumbnail } from '@/components/shared/asset-thumbnail';
import { QrCodeCard } from '@/components/shared/qr-code-card';
import { RoomCard } from '@/components/shared/room-card';
import { ScannerPanel } from '@/components/shared/scanner-panel';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { Asset, AssetStatus, Location } from '@/lib/types';

const demoAssetType = {
  id: 'demo-type-camera',
  name: 'Camera',
  prefix: 'CAM',
  description: 'Camera equipment',
};

const demoLocations: Location[] = [
  {
    id: 'demo-location-store',
    name: 'ZIL Store',
    kind: 'storage',
    description: 'Primary storage for checked-in equipment',
    assetCount: 24,
    inUseCount: 0,
    missingCount: 0,
  },
  {
    id: 'demo-location-room-133',
    name: 'Room 133',
    kind: 'room',
    description: 'Production room for temporary equipment use',
    assetCount: 7,
    inUseCount: 3,
    missingCount: 0,
  },
  {
    id: 'demo-location-room-140',
    name: 'Room 140',
    kind: 'room',
    description: 'Studio room for cameras, mics, and lights',
    assetCount: 9,
    inUseCount: 4,
    missingCount: 1,
  },
];

const homeLocation = demoLocations[0];
const checkoutLocation = demoLocations[1];
const demoTimestamp = '2026-04-29T12:00:00.000Z';

function buildDemoAsset(status: AssetStatus, currentLocation: Location): Asset {
  return {
    id: 'demo-asset-camera',
    assetId: 'CAM-001',
    name: 'Sony A7 IV Demo',
    assetTypeId: demoAssetType.id,
    assetType: demoAssetType,
    serialNumber: 'DEMO-SN-1040',
    purchaseDate: '2026-04-01',
    cost: 2499,
    consumable: false,
    homeLocationId: homeLocation.id,
    currentLocationId: currentLocation.id,
    homeLocation,
    currentLocation,
    status,
    referenceImageUrl: null,
    notes: 'Demo asset for onboarding only.',
    createdAt: new Date('2026-04-01T10:00:00').toISOString(),
    updatedAt: demoTimestamp,
    qrCodeToken: 'demo-how-to-use-camera',
    qrCodePayload: 'ZIL-ASSET:demo-how-to-use-camera',
    qrCodeGeneratedAt: demoTimestamp,
  };
}

const featureOverview = [
  {
    title: 'Dashboard',
    description: 'Quick actions, operational counts, location status, and recent activity.',
    icon: Home,
  },
  {
    title: 'Scan Asset',
    description: 'Check equipment out to a room and return it to its home location.',
    icon: Scan,
  },
  {
    title: 'Inventory',
    description: 'Search, filter, inspect, edit, and manage every asset record.',
    icon: Package,
  },
  {
    title: 'History',
    description: 'Backtrack every asset event through the immutable event log.',
    icon: History,
  },
  {
    title: 'Insights',
    description: 'Manager analytics for usage, low stock, room demand, audits, and risk.',
    icon: BarChart3,
  },
  {
    title: 'Locations',
    description: 'See what is currently in each room or storage area.',
    icon: MapPin,
  },
  {
    title: 'Audit Mode',
    description: 'Verify what is physically present in a selected location.',
    icon: ClipboardCheck,
  },
  {
    title: 'Settings',
    description: 'Add assets and manage asset types, locations, users, labels, and QR setup.',
    icon: Settings,
  },
];

const dailySteps = [
  'Find the equipment',
  'Scan the QR code',
  'Check Out to the room where it will be used',
  'Use the equipment',
  'Scan again and Return it',
  'Physically place it back in its Home Location',
];

export default function HowToUsePage() {
  const [demoStatus, setDemoStatus] = useState<AssetStatus>('available');
  const [scanValue, setScanValue] = useState('CAM-001');
  const [selectedRoomId, setSelectedRoomId] = useState(checkoutLocation.id);
  const [auditScans, setAuditScans] = useState(['CAM-001']);
  const [auditComplete, setAuditComplete] = useState(false);

  const selectedRoom = demoLocations.find((location) => location.id === selectedRoomId) ?? checkoutLocation;
  const demoAsset = useMemo(
    () => buildDemoAsset(demoStatus, demoStatus === 'in-use' ? selectedRoom : homeLocation),
    [demoStatus, selectedRoom],
  );
  const draftAsset = useMemo(() => buildDemoAsset('available', homeLocation), []);
  const expectedAuditAssets = ['CAM-001', 'MIC-002', 'SDC-004'];
  const missingAuditAssets = expectedAuditAssets.filter((assetId) => !auditScans.includes(assetId));

  function runDemoScan(value: string) {
    setScanValue(value.trim() || 'CAM-001');
  }

  function demoCheckout() {
    setDemoStatus('in-use');
  }

  function demoReturn() {
    setDemoStatus('available');
  }

  function addAuditScan(assetId: string) {
    setAuditComplete(false);
    setAuditScans((current) => current.includes(assetId) ? current : [...current, assetId]);
  }

  return (
    <div className="space-y-6 p-4 sm:p-5 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold text-balance sm:text-3xl">How to Use</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          A short onboarding guide for student employees using the Zoom Innovation Lab Asset Manager.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Feature Overview</h2>
          <p className="text-sm text-muted-foreground">Where to go for the most common asset tasks.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {featureOverview.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card key={feature.title}>
                <CardContent className="flex h-full gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Daily Flow</h2>
          <p className="text-sm text-muted-foreground">The standard checkout and return loop for temporary equipment use.</p>
        </div>
        <Card>
          <CardContent className="space-y-5 p-4">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {dailySteps.map((step, index) => (
                <div key={step} className="rounded-lg border bg-card p-3">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-muted-foreground">
                    {index + 1}
                  </div>
                  <p className="text-sm font-medium">{step}</p>
                </div>
              ))}
            </div>
            <Alert className="border-primary/25 bg-primary/5">
              <ListChecks className="h-4 w-4 text-primary" />
              <AlertTitle>Location rules</AlertTitle>
              <AlertDescription>
                <p>Home Location is where the asset belongs by default.</p>
                <p>Current Location is where the asset physically is now.</p>
                <p>Check Out temporarily changes Current Location and status.</p>
                <p>Return sends the asset back to Home Location and marks it Available.</p>
                <p>Permanent Home Location changes happen only through Edit Asset / Settings.</p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Demo Tutorials</h2>
          <p className="text-sm text-muted-foreground">These examples are local to this page and do not update the live database.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scan className="h-5 w-5" />
              Tutorial A: Check Out and Return
            </CardTitle>
            <CardDescription>Practice the normal QR workflow with a demo asset.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
            <ScannerPanel
              manualValue={scanValue}
              onManualValueChange={setScanValue}
              onManualSubmit={runDemoScan}
              onScanResult={runDemoScan}
              manualButtonLabel="Load Demo"
              helpText="Demo only. This scanner panel mirrors the real scan screen but does not write to the database."
            />
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <AssetThumbnail alt={demoAsset.name} className="h-20 w-20 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-xl font-bold">{demoAsset.name}</h3>
                          <p className="text-sm text-muted-foreground">{demoAsset.assetId}</p>
                        </div>
                        <StatusBadge status={demoAsset.status} size="lg" />
                      </div>
                      <div className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                        <div><span className="text-muted-foreground">Type:</span> {demoAsset.assetType.name}</div>
                        <div><span className="text-muted-foreground">Current:</span> {demoAsset.currentLocation.name}</div>
                        <div><span className="text-muted-foreground">Home:</span> {demoAsset.homeLocation.name}</div>
                        <div><span className="text-muted-foreground">Serial:</span> {demoAsset.serialNumber}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <Label>Room In Use</Label>
                    <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {demoLocations.filter((location) => location.kind === 'room').map((location) => (
                          <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button className="w-full" onClick={demoCheckout} disabled={demoAsset.status !== 'available'}>
                      Check Out Demo Asset
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <p className="text-sm text-muted-foreground">
                      Return marks the asset Available and sends Current Location back to Home Location.
                    </p>
                    <Button className="w-full" variant="outline" onClick={demoReturn} disabled={demoAsset.status !== 'in-use'}>
                      Return Demo Asset
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5" />
              Tutorial B: Add a New Asset
            </CardTitle>
            <CardDescription>Review the required asset fields and the QR label workflow.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Asset Name</Label>
                  <Input value="Sony A7 IV Demo" readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Asset Type</Label>
                  <Select value="Camera">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Camera">Camera</SelectItem>
                      <SelectItem value="SD Card">SD Card</SelectItem>
                      <SelectItem value="Battery">Battery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input value="Optional, but recommended" readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input type="date" value="2026-04-01" readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Cost</Label>
                  <Input value="$2499" readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value="available">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in-use">In Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Home Location</Label>
                  <Select value={homeLocation.id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={homeLocation.id}>{homeLocation.name}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Current Location</Label>
                  <Select value={homeLocation.id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={homeLocation.id}>{homeLocation.name}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                <Checkbox checked={false} disabled />
                <Label className="text-sm">Consumable item</Label>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value="Add handling notes, kit contents, or where the tag was placed." readOnly />
              </div>
              <Alert>
                <QrCode className="h-4 w-4" />
                <AlertTitle>QR label printing</AlertTitle>
                <AlertDescription>
                  <p>After saving a real asset, open its asset detail page and download either a single QR or the label strip.</p>
                  <p>Place the PNG into the Brother label printer software/app, print the strip, cut the labels, and stick one on the asset, case, pouch, or cable wrap.</p>
                </AlertDescription>
              </Alert>
            </div>
            <div className="space-y-3">
              <AssetCard asset={draftAsset} compact />
              <QrCodeCard asset={draftAsset} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-5 w-5" />
              Tutorial C: Run an Audit
            </CardTitle>
            <CardDescription>Use Audit Mode to verify what is physically present in a location.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-status-warning/30 bg-status-warning/10">
              <Activity className="h-4 w-4 text-status-warning" />
              <AlertTitle>Audit Mode is for verification</AlertTitle>
              <AlertDescription>
                <p>Use Scan Asset for normal checkout and return. Use Audit Mode when checking whether a room or storage location physically matches the database.</p>
              </AlertDescription>
            </Alert>
            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-3">
                <RoomCard room={homeLocation} selected />
                <Button className="w-full" onClick={() => {
                  setAuditScans(['CAM-001']);
                  setAuditComplete(false);
                }}>
                  Start Demo Audit
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => addAuditScan('MIC-002')}>Scan MIC-002</Button>
                  <Button variant="outline" onClick={() => addAuditScan('LGT-009')}>Scan Unexpected</Button>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setAuditComplete(true)}>
                  Complete Demo Audit
                </Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Audit Review</CardTitle>
                  <CardDescription>
                    Found {auditScans.filter((id) => expectedAuditAssets.includes(id)).length} expected, {missingAuditAssets.length} missing, {auditScans.filter((id) => !expectedAuditAssets.includes(id)).length} unexpected
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expectedAuditAssets.map((assetId) => {
                        const found = auditScans.includes(assetId);

                        return (
                          <TableRow key={assetId}>
                            <TableCell className="font-medium">{assetId}</TableCell>
                            <TableCell>{found ? 'Expected found' : 'Missing from scan'}</TableCell>
                            <TableCell>
                              <StatusBadge status={found ? 'available' : 'missing'} size="sm" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {auditScans.filter((assetId) => !expectedAuditAssets.includes(assetId)).map((assetId) => (
                        <TableRow key={assetId}>
                          <TableCell className="font-medium">{assetId}</TableCell>
                          <TableCell>Unexpected found</TableCell>
                          <TableCell>
                            <StatusBadge status="in-use" size="sm" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Separator className="my-4" />
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    {auditComplete
                      ? 'Completing a real audit creates an audit report and marks unresolved missing expected assets as Missing.'
                      : 'Review found, missing, and unexpected items before completing the audit.'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        This page is an onboarding walkthrough. Demo buttons and demo scans are local-only and do not create assets, events, audits, or database changes.
      </div>
    </div>
  );
}

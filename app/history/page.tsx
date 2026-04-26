'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AssetEvent, EventType } from '@/lib/types';
import { formatDateTime, formatEventType } from '@/lib/format';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Archive,
  ArrowRightLeft,
  CheckCircle2,
  ClipboardCheck,
  Edit,
  History,
  LogIn,
  LogOut,
  Plus,
  Search,
  Wrench,
} from 'lucide-react';

const eventTypes: Array<{ value: EventType; label: string }> = [
  { value: 'asset-created', label: 'Asset Created' },
  { value: 'asset-updated', label: 'Asset Updated' },
  { value: 'moved', label: 'Moved' },
  { value: 'checked-out', label: 'Checked Out' },
  { value: 'returned', label: 'Returned' },
  { value: 'marked-missing', label: 'Marked Missing' },
  { value: 'marked-in-repair', label: 'Marked In Repair' },
  { value: 'restored-to-available', label: 'Restored to Available' },
  { value: 'retired', label: 'Retired' },
  { value: 'audit-started', label: 'Audit Started' },
  { value: 'audit-scanned', label: 'Audit Scanned' },
  { value: 'audit-completed', label: 'Audit Completed' },
];

const eventVisuals: Record<
  EventType,
  {
    icon: LucideIcon;
    iconClassName: string;
    labelClassName: string;
    rowClassName: string;
  }
> = {
  'checked-out': {
    icon: LogOut,
    iconClassName: 'bg-status-in-use/15 text-status-in-use',
    labelClassName: 'text-status-in-use',
    rowClassName: 'border-status-in-use/20 bg-status-in-use/5',
  },
  returned: {
    icon: LogIn,
    iconClassName: 'bg-status-available/15 text-status-available',
    labelClassName: 'text-status-available',
    rowClassName: 'border-status-available/20 bg-status-available/5',
  },
  moved: {
    icon: ArrowRightLeft,
    iconClassName: 'bg-amber-500/12 text-amber-700',
    labelClassName: 'text-amber-700',
    rowClassName: 'border-amber-500/20 bg-amber-500/5',
  },
  'marked-missing': {
    icon: AlertTriangle,
    iconClassName: 'bg-status-missing/15 text-status-missing',
    labelClassName: 'text-status-missing',
    rowClassName: 'border-status-missing/20 bg-status-missing/5',
  },
  'asset-created': {
    icon: Plus,
    iconClassName: 'bg-status-available/15 text-status-available',
    labelClassName: 'text-status-available',
    rowClassName: 'border-status-available/20 bg-status-available/5',
  },
  'asset-updated': {
    icon: Edit,
    iconClassName: 'bg-muted text-muted-foreground',
    labelClassName: 'text-foreground',
    rowClassName: 'border-border bg-muted/25',
  },
  'marked-in-repair': {
    icon: Wrench,
    iconClassName: 'bg-status-repair/15 text-status-repair',
    labelClassName: 'text-status-repair',
    rowClassName: 'border-status-repair/20 bg-status-repair/5',
  },
  'restored-to-available': {
    icon: CheckCircle2,
    iconClassName: 'bg-status-available/15 text-status-available',
    labelClassName: 'text-status-available',
    rowClassName: 'border-status-available/20 bg-status-available/5',
  },
  retired: {
    icon: Archive,
    iconClassName: 'bg-muted text-muted-foreground',
    labelClassName: 'text-foreground',
    rowClassName: 'border-border bg-muted/25',
  },
  'audit-started': {
    icon: ClipboardCheck,
    iconClassName: 'bg-amber-500/12 text-amber-700',
    labelClassName: 'text-amber-700',
    rowClassName: 'border-amber-500/20 bg-amber-500/5',
  },
  'audit-scanned': {
    icon: Search,
    iconClassName: 'bg-amber-500/12 text-amber-700',
    labelClassName: 'text-amber-700',
    rowClassName: 'border-amber-500/20 bg-amber-500/5',
  },
  'audit-completed': {
    icon: CheckCircle2,
    iconClassName: 'bg-status-available/15 text-status-available',
    labelClassName: 'text-status-available',
    rowClassName: 'border-status-available/20 bg-status-available/5',
  },
};

function getLocationSummary(event: AssetEvent) {
  if (event.fromLocation && event.toLocation) {
    if (event.fromLocation.id === event.toLocation.id) {
      return event.toLocation.name;
    }
    return `${event.fromLocation.name} → ${event.toLocation.name}`;
  }

  if (event.toLocation) return event.toLocation.name;
  if (event.fromLocation) return event.fromLocation.name;
  return null;
}

export default function HistoryPage() {
  const [events, setEvents] = useState<AssetEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<EventType | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      const params = new URLSearchParams();
      if (eventFilter !== 'all') params.set('eventType', eventFilter);
      if (searchQuery) params.set('assetId', searchQuery);
      const response = await fetch(`/api/events?${params.toString()}`, { cache: 'no-store' });
      const data = response.ok ? await response.json() : { events: [] };
      if (!cancelled) {
        setEvents(data.events);
        setLoading(false);
      }
    }

    const timeout = setTimeout(loadEvents, 200);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery, eventFilter]);

  const description = useMemo(() => {
    if (loading) return 'Loading event log';
    if (events.length === 0) return 'Empty until assets are tracked';
    return `${events.length} recent event${events.length === 1 ? '' : 's'}`;
  }, [loading, events.length]);

  return (
    <div className="space-y-6 p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance sm:text-3xl">Transaction History</h1>
          <p className="text-muted-foreground mt-2">All asset movements and status changes from the immutable event log</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <div className="relative min-w-0 flex-1 lg:w-72 lg:flex-none xl:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search asset..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <Select value={eventFilter} onValueChange={(value) => setEventFilter(value as EventType | 'all')}>
            <SelectTrigger className="h-9 sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {eventTypes.map((eventType) => <SelectItem key={eventType.value} value={eventType.value}>{eventType.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-5 w-5" />
            Event Log
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[calc(100vh-18rem)] overflow-y-auto pr-3">
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={cn('rounded-xl border p-4 transition-colors', eventVisuals[event.eventType].rowClassName)}
                >
                  <div className="flex gap-4">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        eventVisuals[event.eventType].iconClassName
                      )}
                    >
                      {(() => {
                        const Icon = eventVisuals[event.eventType].icon;
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
                        <div className="min-w-0 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn('text-sm font-semibold', eventVisuals[event.eventType].labelClassName)}>
                              {formatEventType(event.eventType)}
                            </span>
                            <p className="min-w-0 text-sm font-medium text-foreground">
                              {event.asset ? `${event.asset.name} (${event.asset.assetId})` : 'System event'}
                            </p>
                          </div>

                          {getLocationSummary(event) && (
                            <p className="text-sm text-muted-foreground">{getLocationSummary(event)}</p>
                          )}

                          {event.remarks && (
                            <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground/90">
                              {event.remarks}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 space-y-2 text-sm text-muted-foreground md:text-right">
                          <p>{formatDateTime(event.createdAt)}</p>
                          {event.handledBy && <p>by {event.handledBy}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={loading ? 'Loading history...' : 'No transaction history yet'}
              description="Asset movements, status changes, and audit actions will appear here."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Search, History } from 'lucide-react';

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
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id} className="rounded-lg border p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div>
                      <p className="font-medium">{formatEventType(event.eventType)}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.asset ? `${event.asset.name} (${event.asset.assetId})` : 'System event'}
                        {event.fromLocation && event.toLocation && event.fromLocation.id !== event.toLocation.id
                          ? ` · ${event.fromLocation.name} to ${event.toLocation.name}`
                          : event.toLocation ? ` · ${event.toLocation.name}` : ''}
                      </p>
                      {event.remarks && <p className="text-sm mt-2">{event.remarks}</p>}
                    </div>
                    <div className="text-sm text-muted-foreground md:text-right">
                      <p>{formatDateTime(event.createdAt)}</p>
                      {event.handledBy && <p>by {event.handledBy}</p>}
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

import type { AssetStatus, EventType } from '@/lib/types';

export function formatStatus(status: AssetStatus) {
  const labels: Record<AssetStatus, string> = {
    available: 'Available',
    'in-use': 'In Use',
    missing: 'Missing',
    'in-repair': 'In Repair',
    retired: 'Retired',
  };
  return labels[status];
}

export function formatEventType(eventType: EventType) {
  const labels: Record<EventType, string> = {
    'asset-created': 'Asset Created',
    'asset-updated': 'Asset Updated',
    moved: 'Moved',
    'checked-out': 'Checked Out',
    returned: 'Returned',
    'marked-missing': 'Marked Missing',
    'marked-in-repair': 'Marked In Repair',
    'restored-to-available': 'Restored to Available',
    retired: 'Retired',
    'audit-started': 'Audit Started',
    'audit-scanned': 'Audit Scanned',
    'audit-completed': 'Audit Completed',
  };
  return labels[eventType];
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

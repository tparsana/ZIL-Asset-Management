'use client';

import { getEventAssetName } from '@/lib/event-display';
import { cn } from '@/lib/utils';
import type { AssetEvent, EventType } from '@/lib/types';
import { 
  ArrowRightLeft, 
  LogOut, 
  LogIn, 
  AlertTriangle, 
  Wrench, 
  Plus, 
  Edit, 
  HelpCircle,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityRowProps {
  activity: AssetEvent;
  onClick?: () => void;
  className?: string;
}

const actionConfig: Record<EventType, { label: string; icon: React.ElementType; className: string }> = {
  'checked-out': { label: 'Checked Out', icon: LogOut, className: 'text-status-in-use' },
  returned: { label: 'Returned', icon: LogIn, className: 'text-status-available' },
  moved: { label: 'Moved', icon: ArrowRightLeft, className: 'text-muted-foreground' },
  'marked-missing': { label: 'Marked Missing', icon: AlertTriangle, className: 'text-status-missing' },
  'asset-created': { label: 'Asset Created', icon: Plus, className: 'text-status-available' },
  'asset-updated': { label: 'Asset Updated', icon: Edit, className: 'text-muted-foreground' },
  'asset-deleted': { label: 'Deleted', icon: Trash2, className: 'text-status-missing' },
  'marked-in-repair': { label: 'Marked In Repair', icon: Wrench, className: 'text-status-repair' },
  'restored-to-available': { label: 'Restored to Available', icon: LogIn, className: 'text-status-available' },
  retired: { label: 'Retired', icon: Wrench, className: 'text-muted-foreground' },
  'audit-started': { label: 'Audit Started', icon: Edit, className: 'text-muted-foreground' },
  'audit-scanned': { label: 'Audit Scanned', icon: Edit, className: 'text-muted-foreground' },
  'audit-completed': { label: 'Audit Completed', icon: Edit, className: 'text-muted-foreground' },
};

export function ActivityRow({ activity, onClick, className }: ActivityRowProps) {
  const config = actionConfig[activity.eventType] || { label: activity.eventType, icon: HelpCircle, className: 'text-muted-foreground' };
  const Icon = config.icon;
  const assetName = getEventAssetName(activity);
  
  return (
    <div 
      className={cn(
        'flex items-start gap-3 py-3 px-4 hover:bg-accent/50 cursor-pointer transition-colors rounded-lg',
        className
      )}
      onClick={onClick}
    >
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-full bg-secondary shrink-0', config.className)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{assetName}</p>
            <p className="text-xs text-muted-foreground">
              {config.label}
              {activity.fromLocation && activity.toLocation && activity.fromLocation.id !== activity.toLocation.id && (
                <span> from {activity.fromLocation.name} to {activity.toLocation.name}</span>
              )}
              {activity.toLocation && (!activity.fromLocation || activity.fromLocation.id === activity.toLocation.id) && (
                <span> in {activity.toLocation.name}</span>
              )}
            </p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
          </span>
        </div>
        {activity.handledBy && <p className="text-xs text-muted-foreground mt-1">by {activity.handledBy}</p>}
      </div>
    </div>
  );
}

'use client';

import { cn } from '@/lib/utils';
import type { AssetEvent, EventType } from '@/lib/types';
import { format } from 'date-fns';
import { 
  ArrowRightLeft, 
  LogOut, 
  LogIn, 
  AlertTriangle, 
  Wrench, 
  Plus, 
  Edit, 
  HelpCircle
} from 'lucide-react';

interface TimelineEventProps {
  activity: AssetEvent;
  isLast?: boolean;
  className?: string;
}

const actionConfig: Record<EventType, { label: string; icon: React.ElementType; className: string }> = {
  'checked-out': { label: 'Checked Out', icon: LogOut, className: 'bg-status-in-use/20 text-status-in-use' },
  returned: { label: 'Returned', icon: LogIn, className: 'bg-status-available/20 text-status-available' },
  moved: { label: 'Moved', icon: ArrowRightLeft, className: 'bg-muted text-muted-foreground' },
  'marked-missing': { label: 'Marked Missing', icon: AlertTriangle, className: 'bg-status-missing/20 text-status-missing' },
  'asset-created': { label: 'Asset Created', icon: Plus, className: 'bg-status-available/20 text-status-available' },
  'asset-updated': { label: 'Asset Updated', icon: Edit, className: 'bg-muted text-muted-foreground' },
  'marked-in-repair': { label: 'Marked In Repair', icon: Wrench, className: 'bg-status-repair/20 text-status-repair' },
  'restored-to-available': { label: 'Restored to Available', icon: LogIn, className: 'bg-status-available/20 text-status-available' },
  retired: { label: 'Retired', icon: Wrench, className: 'bg-muted text-muted-foreground' },
  'audit-started': { label: 'Audit Started', icon: Edit, className: 'bg-muted text-muted-foreground' },
  'audit-scanned': { label: 'Audit Scanned', icon: Edit, className: 'bg-muted text-muted-foreground' },
  'audit-completed': { label: 'Audit Completed', icon: Edit, className: 'bg-muted text-muted-foreground' },
};

export function TimelineEvent({ activity, isLast, className }: TimelineEventProps) {
  const config = actionConfig[activity.eventType] || { label: activity.eventType, icon: HelpCircle, className: 'bg-muted text-muted-foreground' };
  const Icon = config.icon;
  
  return (
    <div className={cn('relative flex gap-4', className)}>
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
      )}
      
      {/* Icon */}
      <div className={cn(
        'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        config.className
      )}>
        <Icon className="h-5 w-5" />
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{config.label}</p>
            <p className="text-sm text-muted-foreground">
              {activity.fromLocation && activity.toLocation && activity.fromLocation.id !== activity.toLocation.id ? (
                <>From {activity.fromLocation.name} to {activity.toLocation.name}</>
              ) : activity.toLocation ? (
                <>In {activity.toLocation.name}</>
              ) : activity.fromLocation ? (
                <>From {activity.fromLocation.name}</>
              ) : null}
            </p>
          </div>
          <time className="text-sm text-muted-foreground shrink-0">
            {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
          </time>
        </div>
        
        {activity.remarks && (
          <p className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            {activity.remarks}
          </p>
        )}
        
        <p className="mt-2 text-xs text-muted-foreground">
          Handled by {activity.handledBy ?? 'System'}
        </p>
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
import type { AssetStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: AssetStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<AssetStatus, { label: string; className: string }> = {
  'available': { label: 'Available', className: 'bg-status-available/15 text-status-available border-status-available/30' },
  'in-use': { label: 'In Use', className: 'bg-status-in-use/15 text-status-in-use border-status-in-use/30' },
  'missing': { label: 'Missing', className: 'bg-status-missing/15 text-status-missing border-status-missing/30' },
  'in-repair': { label: 'In Repair', className: 'bg-status-repair/15 text-status-repair border-status-repair/30' },
  'retired': { label: 'Retired', className: 'bg-muted text-muted-foreground border-border' },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-sm',
};

export function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md border',
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {config.label}
    </span>
  );
}

import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface InsightKpiCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  status?: 'default' | 'info' | 'success' | 'warning' | 'danger';
}

const cardTone = {
  default: 'bg-card',
  info: 'border-status-in-use/20 bg-status-in-use/5',
  success: 'border-status-available/20 bg-status-available/5',
  warning: 'border-status-warning/20 bg-status-warning/5',
  danger: 'border-status-missing/20 bg-status-missing/5',
};

const valueTone = {
  default: 'text-foreground',
  info: 'text-status-in-use',
  success: 'text-status-available',
  warning: 'text-status-warning',
  danger: 'text-status-missing',
};

export function InsightKpiCard({
  title,
  value,
  description,
  icon: Icon,
  status = 'default',
}: InsightKpiCardProps) {
  return (
    <Card className={cn(cardTone[status], 'overflow-hidden')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn('mt-2 text-xl font-semibold leading-tight text-balance sm:text-2xl', valueTone[status])}>
              {value}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

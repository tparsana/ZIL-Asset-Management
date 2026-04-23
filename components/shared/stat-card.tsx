import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  variant?: 'default' | 'warning' | 'success' | 'danger' | 'info';
  className?: string;
}

const variantClasses = {
  default: 'text-foreground',
  warning: 'text-status-warning',
  success: 'text-status-available',
  danger: 'text-status-missing',
  info: 'text-status-in-use',
};

const cardVariantClasses = {
  default: 'bg-card',
  warning: 'border-status-warning/25 bg-status-warning/5',
  success: 'border-status-available/25 bg-status-available/5',
  danger: 'border-status-missing/25 bg-status-missing/5',
  info: 'border-status-in-use/25 bg-status-in-use/5',
};

const dotVariantClasses = {
  default: '',
  warning: 'bg-status-warning',
  success: 'bg-status-available',
  danger: 'bg-status-missing',
  info: 'bg-status-in-use',
};

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  variant = 'default',
  className 
}: StatCardProps) {
  return (
    <Card className={cn(cardVariantClasses[variant], className)}>
      <CardContent className="flex h-full items-center p-4">
        <div className="flex w-full items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn('text-2xl font-bold mt-1', variantClasses[variant])}>
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {Icon ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          ) : (
            variant !== 'default' && <div className={cn('h-2.5 w-2.5 rounded-full mt-1', dotVariantClasses[variant])} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

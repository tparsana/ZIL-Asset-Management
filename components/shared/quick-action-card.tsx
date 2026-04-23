'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  onClick?: () => void;
  variant?: 'default' | 'primary';
  className?: string;
}

export function QuickActionCard({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  variant = 'default',
  className 
}: QuickActionCardProps) {
  return (
    <Card 
      className={cn(
        'h-full cursor-pointer transition-all hover:shadow-md active:scale-[0.98]',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="flex min-h-28 flex-col items-center justify-center p-4 text-center sm:min-h-32 sm:p-5">
        <div className={cn(
          'mb-3 flex h-11 w-11 items-center justify-center rounded-xl sm:h-12 sm:w-12',
          variant === 'default' ? 'bg-secondary' : 'bg-primary-foreground/20'
        )}>
          <Icon className={cn(
            'h-6 w-6',
            variant === 'default' ? 'text-foreground' : 'text-primary-foreground'
          )} />
        </div>
        <h3 className="font-semibold">{title}</h3>
        {description && (
          <p className={cn(
            'text-sm mt-1',
            variant === 'default' ? 'text-muted-foreground' : 'text-primary-foreground/80'
          )}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

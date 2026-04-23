'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Location } from '@/lib/types';
import { MapPin, AlertTriangle } from 'lucide-react';

interface RoomCardProps {
  room: Location;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function RoomCard({ room, onClick, selected, className }: RoomCardProps) {
  return (
    <Card 
      className={cn(
        'cursor-pointer transition-colors hover:bg-accent/50',
        selected && 'ring-2 ring-primary bg-accent/30',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0">
            <MapPin className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{room.name}</h3>
              {(room.missingCount ?? 0) > 0 && (
                <div className="flex items-center gap-1 text-status-missing">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-medium">{room.missingCount}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{room.description}</p>
            <div className="mt-2 flex gap-4 text-sm">
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{room.assetCount ?? 0}</span> items
              </span>
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{room.inUseCount ?? 0}</span> in use
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
